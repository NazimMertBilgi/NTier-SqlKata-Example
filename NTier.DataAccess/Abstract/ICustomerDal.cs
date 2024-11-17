using NTier.Core.DataAccess;
using NTier.Entities.Concrete;

namespace NTier.DataAccess.Abstract
{
    public interface ICustomerDal : IEntityRepository<Customer>
    {
        //Custom Operations
    }
}
