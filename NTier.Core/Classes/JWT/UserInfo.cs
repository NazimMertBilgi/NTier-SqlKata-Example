using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace NTier.Core.Classes.JWT
{
    public class UserInfo
    {

        public int id { get; set; }
        public string userName { get; set; }
        public string[] role { get; set; }
        public string email { get; set; }

    }
}
