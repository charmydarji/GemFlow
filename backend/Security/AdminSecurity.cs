using System.Security.Cryptography;
using System.Text;
using HotChocolate;

namespace GemFlow.Api.Security;

public sealed record AdminLoginRequest(string? Username, string? Password);

public static class AdminSecurity
{
    public static bool CheckPassword(AdminLoginRequest? input, string username, string secret)
    {
        if (input is null || string.IsNullOrWhiteSpace(input.Username) || string.IsNullOrEmpty(input.Password))
            return false;
        // Hash fixed-size values before fixed-time comparison, so secret length is not compared.
        var expected = SHA256.HashData(Encoding.UTF8.GetBytes(secret));
        var given = SHA256.HashData(Encoding.UTF8.GetBytes(input.Password));
        return string.Equals(input.Username, username, StringComparison.Ordinal)
            && CryptographicOperations.FixedTimeEquals(expected, given);
    }

    public static void RequireAdmin(HttpContext? context)
    {
        if (context?.User.Identity?.IsAuthenticated != true || !context.User.IsInRole("Admin"))
            throw new GraphQLException("Administrator sign-in required.");
    }

    public static void RequireAdminMutation(HttpContext? context)
    {
        RequireAdmin(context);
        // Require a custom header for state-changing operations in addition to cookie auth.
        // This forces a browser CORS preflight; the API only allows the configured frontend origin.
        if (!string.Equals(context!.Request.Headers["X-GemFlow-Admin"], "1", StringComparison.Ordinal))
            throw new GraphQLException("Admin mutation header missing.");
    }
}
