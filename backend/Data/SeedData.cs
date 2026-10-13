using GemFlow.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GemFlow.Api.Data;

public static class SeedData
{
    public static async Task InitializeAsync(ShopDbContext db)
    {
        await db.Database.EnsureCreatedAsync(); // Demo only: use migrations for production.
        // Demo-only additive schema upgrade. Keep existing products/orders and Docker volume.
        // New installations already have these columns through EnsureCreatedAsync().
        await db.Database.ExecuteSqlRawAsync(@"
            IF COL_LENGTH('dbo.Orders', 'Status') IS NULL
            BEGIN
                ALTER TABLE [dbo].[Orders]
                    ADD [Status] nvarchar(24) NOT NULL
                        CONSTRAINT [DF_Orders_Status] DEFAULT (N'Placed');
            END;
            IF COL_LENGTH('dbo.Orders', 'StatusUpdatedAtUtc') IS NULL
            BEGIN
                ALTER TABLE [dbo].[Orders]
                    ADD [StatusUpdatedAtUtc] datetime2 NULL;
            END;
        ");
        if (await db.Products.AnyAsync()) return;

        db.Products.AddRange(
            new Product { Sku="RG-1001", Name="Solstice Gold Ring", Category="Rings", Description="A refined everyday stacking band in a warm gold finish.", Price=189.00m, Stock=16, Symbol="💍", Featured=true },
            new Product { Sku="NK-2042", Name="Luna Pendant Necklace", Category="Necklaces", Description="A delicate pendant with a luminous polished surface.", Price=265.00m, Stock=9, Symbol="✨", Featured=true },
            new Product { Sku="ER-3320", Name="Celeste Drop Earrings", Category="Earrings", Description="Modern drop earrings with a balanced, sculptural silhouette.", Price=148.00m, Stock=12, Symbol="🌟", Featured=true },
            new Product { Sku="BR-4081", Name="Harbor Chain Bracelet", Category="Bracelets", Description="An adjustable chain bracelet with a timeless profile.", Price=122.00m, Stock=24, Symbol="🔗", Featured=false },
            new Product { Sku="GM-5903", Name="Sapphire Accent Stone", Category="Gemstones", Description="A brilliant sapphire-colored accent for custom jewelry design.", Price=320.00m, Stock=3, Symbol="💎", Featured=true },
            new Product { Sku="RG-1002", Name="Aurora Signet Ring", Category="Rings", Description="A modern statement ring with a softly polished face.", Price=215.00m, Stock=0, Symbol="💍", Featured=false },
            new Product { Sku="NK-2056", Name="Golden Hour Chain", Category="Necklaces", Description="A versatile layering chain with a subtle golden glow.", Price=176.00m, Stock=17, Symbol="📿", Featured=false },
            new Product { Sku="ER-3381", Name="Pearl Light Studs", Category="Earrings", Description="Minimal studs inspired by classic pearl jewelry.", Price=99.00m, Stock=21, Symbol="🤍", Featured=false }
        );
        db.Content.Add(new StoreContent { Key="home.hero", Heading="Details that make a statement.", Body="Explore thoughtfully selected pieces for every customer and every occasion." });
        await db.SaveChangesAsync();
    }
}
