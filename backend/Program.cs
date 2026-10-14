using GemFlow.Api.Data;
using GemFlow.Api.GraphQL;
using GemFlow.Api.Security;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var connection = builder.Configuration.GetConnectionString("Shop");
if (string.IsNullOrWhiteSpace(connection))
    throw new InvalidOperationException("Missing ConnectionStrings__Shop. Set it through environment variables or Docker Compose.");

builder.Services.AddDbContext<ShopDbContext>(options =>
    options.UseSqlServer(connection));
// Single-admin authentication for this local portfolio demo. Credentials live only in .env.
var adminUsername = builder.Configuration["Admin:Username"];
var adminPassword = builder.Configuration["Admin:Password"];
if (string.IsNullOrWhiteSpace(adminUsername) || string.IsNullOrWhiteSpace(adminPassword) || adminPassword.Length < 16)
    throw new InvalidOperationException("Set ADMIN_USERNAME and a 16+ character ADMIN_PASSWORD in .env.");

builder.Services.AddHttpContextAccessor();
// Stateless admin sessions for this prototype: valid for 8 hours and stable across Cloud Run instances.
builder.Services.AddAuthentication(AdminTokenHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, AdminTokenHandler>(AdminTokenHandler.SchemeName, _ => { });
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "GemFlow.Admin";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;
        options.Events.OnRedirectToLogin = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization(options =>
    options.AddPolicy("AdminOnly", policy => policy.RequireAuthenticatedUser().RequireRole("Admin")));
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("admin-login", limiter =>
    {
        limiter.PermitLimit = 10;
        limiter.Window = TimeSpan.FromMinutes(5);
        limiter.QueueLimit = 0;
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

builder.Services.AddGraphQLServer().AddQueryType<Query>().AddMutationType<Mutation>();
builder.Services.AddCors(options => options.AddPolicy("frontend", policy => policy
    .WithOrigins(builder.Configuration["FrontendOrigin"] ?? "http://localhost:5173")
    .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();
app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "GemFlow API" }));

// A small REST catalog feed for partner websites, alongside our GraphQL storefront API.
// Demo only: add authentication, authorization, rate limiting, caching and pagination before real use.
app.MapGet("/api/partner/catalog", async (ShopDbContext db) =>
    await db.Products.AsNoTracking().OrderBy(p => p.Sku)
        .Select(p => new { p.Sku, p.Name, p.Category, p.Price, Available = p.Stock > 0, p.Stock })
        .ToListAsync());


// Login is restricted to configured administrator credentials (never exposed to React).
app.MapPost("/api/admin/login", async (HttpContext ctx, AdminLoginRequest input) =>
{
    if (!AdminSecurity.CheckPassword(input, adminUsername!, adminPassword!))
        return Results.Unauthorized();
    return Results.Ok(new { username = adminUsername, token = AdminSecurity.CreateToken(adminUsername!, adminPassword!) });
}).RequireRateLimiting("admin-login");

app.MapGet("/api/admin/me", (ClaimsPrincipal user) =>
    Results.Ok(new { username = user.Identity?.Name })).RequireAuthorization("AdminOnly");

app.MapPost("/api/admin/logout", () => Results.NoContent()).RequireAuthorization("AdminOnly");

app.MapGraphQL("/graphql");
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ShopDbContext>();
    // The SQL Server container may need a moment to start its engine.
    for (var attempt = 1; attempt <= 12; attempt++)
    {
        try { await SeedData.InitializeAsync(db); break; }
        catch (Exception ex) when (attempt < 12)
        {
            app.Logger.LogWarning(ex, "Database not ready (attempt {Attempt}/12)", attempt);
            await Task.Delay(TimeSpan.FromSeconds(5));
        }
    }
}
app.Run();
