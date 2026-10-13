using System.Data;
using System.Net.Mail;
using GemFlow.Api.Data;
using GemFlow.Api.Models;
using GemFlow.Api.Security;
using GraphQLException = HotChocolate.GraphQLException;
using Microsoft.EntityFrameworkCore;

namespace GemFlow.Api.GraphQL;

public record OrderItemInput(int ProductId, int Quantity);

public class Mutation
{
    public async Task<CustomerOrder> PlaceOrder(
        [Service] ShopDbContext db, string email, List<OrderItemInput> items)
    {
        if (string.IsNullOrWhiteSpace(email) || !MailAddress.TryCreate(email, out _))
            throw new GraphQLException("Enter a valid email address.");
        if (items == null || items.Count == 0 || items.Count > 30 || items.Any(i => i.Quantity < 1 || i.Quantity > 25))
            throw new GraphQLException("Add 1–30 products with quantities between 1 and 25.");

        var grouped = items.GroupBy(i => i.ProductId)
            .Select(g => new OrderItemInput(g.Key, g.Sum(i => i.Quantity))).ToList();
        if (grouped.Any(i => i.Quantity > 25))
            throw new GraphQLException("Maximum quantity per product is 25.");

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var ids = grouped.Select(i => i.ProductId).ToList();
        var products = await db.Products.Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id);
        if (products.Count != ids.Count)
            throw new GraphQLException("One or more products were not found.");

        var order = new CustomerOrder { Email = email.Trim() };
        foreach (var item in grouped)
        {
            var product = products[item.ProductId];
            if (product.Stock < item.Quantity)
                throw new GraphQLException($"Insufficient stock for {product.Name}.");
            product.Stock -= item.Quantity;
            order.Lines.Add(new OrderLine {
                ProductId=product.Id, Sku=product.Sku, ProductName=product.Name,
                Quantity=item.Quantity, UnitPrice=product.Price
            });
        }
        order.Total = order.Lines.Sum(line => line.UnitPrice * line.Quantity);
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return order;
    }

public async Task<Product> CreateProduct(
        [Service] IHttpContextAccessor adminContext,
    [Service] ShopDbContext db,
    string sku,
    string name,
    string category,
    string description,
    decimal price,
    int stock)
{
        AdminSecurity.RequireAdminMutation(adminContext.HttpContext);
    // 1. Normalize input values
    sku = sku.Trim().ToUpperInvariant();
    name = name.Trim();
    category = category.Trim();
    description = description.Trim();

    // 2. Validate product information
    if (sku.Length == 0 || sku.Length > 40 ||
        name.Length == 0 || name.Length > 120 ||
        category.Length == 0 || category.Length > 60 ||
        description.Length > 1000)
    {
        throw new GraphQLException(
            "Please enter valid product details.");
    }

    if (price <= 0 || price > 999999 || stock < 0)
    {
        throw new GraphQLException(
            "Price must be positive and stock cannot be negative.");
    }

    // 3. Check for duplicate SKUs
    bool exists = await db.Products
        .AnyAsync(p => p.Sku == sku);

    if (exists)
    {
        throw new GraphQLException(
            "A product with this SKU already exists.");
    }

    // 4. Create the product
    var product = new Product
    {
        Sku = sku,
        Name = name,
        Category = category,
        Description = description,
        Price = price,
        Stock = stock,
        Symbol = "💎",
        Featured = false
    };

    // 5. Save to SQL Server
    db.Products.Add(product);
    await db.SaveChangesAsync();

    return product;
}

    // Local demo mutation. Add administrator authorization before any public deployment.
    public async Task<Product> UpdateProduct(
        [Service] IHttpContextAccessor adminContext,
        [Service] ShopDbContext db,
        int id,
        string name,
        string category,
        string description,
        decimal price,
        int stock)
    {
        AdminSecurity.RequireAdminMutation(adminContext.HttpContext);
        name = name.Trim();
        category = category.Trim();
        description = description.Trim();

        if (id <= 0)
            throw new GraphQLException("Invalid product ID.");
        if (name.Length == 0 || name.Length > 120 ||
            category.Length == 0 || category.Length > 60 ||
            description.Length > 1000)
            throw new GraphQLException("Please enter valid product details.");
        if (price <= 0 || price > 999999 || decimal.Round(price, 2) != price || stock < 0)
            throw new GraphQLException("Price must be positive with at most 2 decimal places, and stock cannot be negative.");

        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id);
        if (product is null)
            throw new GraphQLException("Product not found.");

        // Preserve SKU and existing order history.
        product.Name = name;
        product.Category = category;
        product.Description = description;
        product.Price = price;
        product.Stock = stock;

        await db.SaveChangesAsync();
        return product;
    }

    // Local demo only: lock this mutation down to authorized staff before deployment.
    public async Task<CustomerOrder> UpdateOrderStatus(
        [Service] IHttpContextAccessor adminContext,
        [Service] ShopDbContext db, int orderId, string status)
    {
        AdminSecurity.RequireAdminMutation(adminContext.HttpContext);
        if (orderId <= 0 || string.IsNullOrWhiteSpace(status))
            throw new GraphQLException("Provide a valid order ID and status.");

        // Explicit workflow guards against accidental fulfilment changes.
        // Cancel is allowed only before shipment. Cancellation returns reserved stock once.
        var transitions = new Dictionary<string, string[]>(StringComparer.Ordinal)
        {
            ["Placed"] = ["Processing", "Cancelled"],
            ["Processing"] = ["Shipped", "Cancelled"],
            ["Shipped"] = ["Delivered"],
            ["Delivered"] = [],
            ["Cancelled"] = []
        };

        status = status.Trim();
        if (!transitions.ContainsKey(status))
            throw new GraphQLException("Unsupported status. Use Processing, Shipped, Delivered, or Cancelled.");

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var order = await db.Orders.Include(o => o.Lines)
            .SingleOrDefaultAsync(o => o.Id == orderId);
        if (order is null)
            throw new GraphQLException("Order not found.");

        if (!transitions.TryGetValue(order.Status, out var allowed) || !allowed.Contains(status))
            throw new GraphQLException($"Cannot change an order from {order.Status} to {status}.");

        if (status == "Cancelled")
        {
            var itemIds = order.Lines.Select(line => line.ProductId).Distinct().ToList();
            var products = await db.Products.Where(p => itemIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id);

            foreach (var line in order.Lines)
            {
                if (!products.TryGetValue(line.ProductId, out var product))
                    throw new GraphQLException($"Cannot restore inventory for deleted product {line.Sku}.");
                product.Stock = checked(product.Stock + line.Quantity);
            }
        }

        order.Status = status;
        order.StatusUpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return order;
    }
}
