using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace NTier.Core.Models.Customer
{
    public class CustomerAddModel
    {
        public bool NameStyle { get; set; } = false;
        public string FirstName { get; set; } = null!;
        public string LastName { get; set; } = null!;
        public string PasswordHash { get; set; } = "1";
        public string PasswordSalt { get; set; } = "1";
        public Guid RowGuid { get; set; } = Guid.NewGuid();
        public DateTime ModifiedDate { get; set; } = DateTime.Now.Date;
    }
}
