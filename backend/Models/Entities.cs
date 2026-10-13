namespace GemFlow.Api.Models;

public class Product
{
    public int Id { get; set; }
    public string Sku { get; set; } = "";
    public string Name { get; set; } = "";
    public string Category { get; set; } = "";
    public string Description { get; set; } = "";
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public string Symbol { get; set; } = "💎";
    public bool Featured { get; set; }
}

public class StoreContent
{
    public int Id { get; set; }
    public string Key { get; set; } = "";
    public string Heading { get; set; } = "";
    public string Body { get; set; } = "";
}

public class CustomerOrder
{
    public int Id { get; set; }
    public string Email { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public decimal Total { get; set; }
    public string Status { get; set; } = "Placed";
    public DateTime? StatusUpdatedAtUtc { get; set; }
    public List<OrderLine> Lines { get; set; } = new();
}

public class OrderLine
{
    public int Id { get; set; }
    public int CustomerOrderId { get; set; }
    public int ProductId { get; set; }
    public string Sku { get; set; } = "";
    public string ProductName { get; set; } = "";
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
