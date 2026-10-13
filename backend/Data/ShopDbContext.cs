using GemFlow.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GemFlow.Api.Data;

public class ShopDbContext(DbContextOptions<ShopDbContext> options) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
    public DbSet<CustomerOrder> Orders => Set<CustomerOrder>();
    public DbSet<OrderLine> OrderLines => Set<OrderLine>();
    public DbSet<StoreContent> Content => Set<StoreContent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>().HasIndex(p => p.Sku).IsUnique();
        modelBuilder.Entity<Product>().Property(p => p.Price).HasPrecision(12, 2);
        modelBuilder.Entity<CustomerOrder>().Property(p => p.Total).HasPrecision(12, 2);
        modelBuilder.Entity<CustomerOrder>().Property(p => p.Status)
            .HasMaxLength(24).HasDefaultValue("Placed");
        modelBuilder.Entity<OrderLine>().Property(p => p.UnitPrice).HasPrecision(12, 2);
        modelBuilder.Entity<StoreContent>().HasIndex(c => c.Key).IsUnique();
        modelBuilder.Entity<CustomerOrder>().HasMany(o => o.Lines).WithOne().HasForeignKey(l => l.CustomerOrderId);
    }
}
