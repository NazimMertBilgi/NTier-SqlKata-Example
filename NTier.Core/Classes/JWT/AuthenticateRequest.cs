using System.Text.Json.Serialization;

namespace NTier.Core.Classes.JWT
{
    public class AuthenticateRequest
    {
        public string UserName { get; set; }

        public string Password { get; set; }
    }
}
