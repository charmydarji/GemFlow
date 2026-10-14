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

    // Eight-hour HMAC token signed with the configured administrator password.
    // No DB session table, cookie encryption key store, or extra NuGet packages needed.
    public static string CreateToken(string username, string secret)
    {
        var expires = DateTimeOffset.UtcNow.AddHours(8).ToUnixTimeSeconds();
        var payload = System.Text.Encoding.UTF8.GetBytes($"{username}\n{expires}");
        var key = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(secret));
        var signature = HMACSHA256.HashData(key, payload);
        return Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(payload) + "." +
               Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(signature);
    }

    public static bool ValidateToken(string token, string username, string secret)
    {
        try
        {
            var parts = token.Split('.');
            if (parts.Length != 2 || parts[0].Length > 300 || parts[1].Length > 200) return false;
            var payload = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlDecode(parts[0]);
            var given = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlDecode(parts[1]);
            var details = System.Text.Encoding.UTF8.GetString(payload).Split('\n');
            if (details.Length != 2 || details[0] != username ||
                !long.TryParse(details[1], out var expiry)) return false;
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            if (expiry <= now || expiry > now + 8 * 60 * 60) return false;
            var key = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(secret));
            var expected = HMACSHA256.HashData(key, payload);
            return CryptographicOperations.FixedTimeEquals(expected, given);
        }
        catch (FormatException) { return false; }
        catch (System.Text.DecoderFallbackException) { return false; }
    }
}
