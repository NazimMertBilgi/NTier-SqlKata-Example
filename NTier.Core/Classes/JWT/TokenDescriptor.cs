using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace NTier.Core.Classes.JWT
{
    public class TokenDescriptor
    {
        public Claim[] Claims { get; set; }
        public string Secret { get; set; }
        public DateTime ExpiresValue { get; set; }
    }
}
