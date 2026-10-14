using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace GemFlow.Api.Security;

// One-admin, short-lived stateless session: no browser cookies and no persisted server keys.
public sealed class AdminTokenHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "GemFlowToken";

    public AdminTokenHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger, UrlEncoder encoder) : base(options, logger, encoder) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var header = Request.Headers.Authorization.ToString();
        if (!header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return Task.FromResult(AuthenticateResult.NoResult());

        var username = Context.RequestServices.GetRequiredService<IConfiguration>()["Admin:Username"];
        var secret = Context.RequestServices.GetRequiredService<IConfiguration>()["Admin:Password"];
        var token = header["Bearer ".Length..].Trim();
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(secret) ||
            !AdminSecurity.ValidateToken(token, username, secret))
            return Task.FromResult(AuthenticateResult.Fail("Invalid or expired administrator session."));

        var identity = new ClaimsIdentity(new[] {
            new Claim(ClaimTypes.Name, username), new Claim(ClaimTypes.Role, "Admin")
        }, SchemeName);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
