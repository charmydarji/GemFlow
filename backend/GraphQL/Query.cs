using GemFlow.Api.Data;
using GemFlow.Api.Models;
using GemFlow.Api.Security;
using Microsoft.EntityFrameworkCore;

namespace GemFlow.Api.GraphQL;

public class Query
{
    public async Task<List<Product>> GetProducts(
        [Service] ShopDbContext db, string? search = null, string? category = null, bool? inStockOnly = null)
    {
        var products = db.Products.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim();
            products = products.Where(p => p.Name.Contains(q) || p.Sku.Contains(q));
        }
        if (!string.IsNullOrWhiteSpace(category) && category != "All")
            products = products.Where(p => p.Category == category);
        if (inStockOnly == true)
            products = products.Where(p => p.Stock > 0);
        return await products.OrderBy(p => p.Id).ToListAsync();
    }

    public Task<Product?> GetProduct([Service] ShopDbContext db, int id) =>
        db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);

    public Task<List<string>> GetCategories([Service] ShopDbContext db) =>
        db.Products.Select(p => p.Category).Distinct().OrderBy(c => c).ToListAsync();

    public Task<StoreContent?> GetHero([Service] ShopDbContext db) =>
        db.Content.AsNoTracking().FirstOrDefaultAsync(c => c.Key == "home.hero");

    // Local development dashboard only. Add admin authorization before public deployment.
    // Limit results so this demo endpoint does not return an unbounded order history.
    public Task<List<CustomerOrder>> GetOrders(
        [Service] ShopDbContext db, [Service] IHttpContextAccessor adminContext)
    {
        AdminSecurity.RequireAdmin(adminContext.HttpContext);
        return db.Orders.AsNoTracking()
            .Include(o => o.Lines)
            .OrderByDescending(o => o.CreatedAtUtc)
            .ThenByDescending(o => o.Id)
            .Take(100)
            .ToListAsync();
    }

    public Task<CustomerOrder?> GetOrder(
        [Service] ShopDbContext db, [Service] IHttpContextAccessor adminContext, int id)
    {
        AdminSecurity.RequireAdmin(adminContext.HttpContext);
        return db.Orders.AsNoTracking()
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == id);
    }
}
