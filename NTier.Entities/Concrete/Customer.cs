using NTier.Core.Entities;
using SqlKata.ModelHelper;
using System.Xml.Linq;

namespace NTier.Entities.Concrete
{
    [Table("SalesLT.CustomerNew")]
    public partial class Customer : IEntity
    {
        [PrimaryKey]
        public int CustomerID { get; set; }

        public bool NameStyle { get; set; }
        public string? Title { get; set; }
        public string FirstName { get; set; } = null!;
        public string? MiddleName { get; set; }
        public string LastName { get; set; } = null!;
        public string? Suffix { get; set; }
        public string? CompanyName { get; set; }
        public string? SalesPerson { get; set; }
        public string? EmailAddress { get; set; }
        public string? Phone { get; set; }
        public string PasswordHash { get; set; } = null!;
        public string PasswordSalt { get; set; } = null!;
        public Guid RowGuid { get; set; }
        public DateTime ModifiedDate { get; set; }


    }
}
