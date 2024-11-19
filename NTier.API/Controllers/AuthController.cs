using NTier.Core.Classes.JWT;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace NTier.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        IHttpContextAccessor _httpContextAccessor;
        UserJWTInfo _userJWTInfo;

        public AuthController(IConfiguration configuration, IHttpContextAccessor httpContextAccessor)
        {
            _configuration = configuration;
            _httpContextAccessor = httpContextAccessor;
            _userJWTInfo = new UserJWTInfo(_httpContextAccessor);
        }

        [HttpGet("login")]
        public IActionResult Login()
        {
            // Validate the user credentials (this is just a simple example)
            var token = GenerateJwtToken("test");
            return Ok(new { token });
        }

        private string GenerateJwtToken(string username)
        {
            List<Claim> claims = new List<Claim>();
            claims.Add(new Claim("userName", username));

            string secretSection = _configuration.GetSection("AppSettings").GetSection("Secret").Value!;

            string token = GenerateToken.Generate(new TokenDescriptor
            {
                Claims = claims.ToArray(),
                ExpiresValue = DateTime.UtcNow.AddDays(1),
                Secret = secretSection
            });

            return token;
        }

        [HttpGet("[action]")] // Bearer {token}
        public IActionResult CheckToken()
        {
            if (!_userJWTInfo.UserNullOrEmpty())
            {
                return new JsonResult(new { Result = true });
            }
            return new JsonResult(new { Result = false });
        }

        [HttpGet("[action]")] // Bearer {token}
        public IActionResult GetUserTokenInfo()
        {
            if (!_userJWTInfo.UserNullOrEmpty())
            {
                return new JsonResult(new { Result = _userJWTInfo.GetInfo() });
            }
            return new JsonResult(new { Result = false });
        }
    }

}