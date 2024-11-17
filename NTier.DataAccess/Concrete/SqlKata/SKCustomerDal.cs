using NTier.Core.DataAccess.SqlKata;
using NTier.DataAccess.Abstract;
using NTier.Entities.Concrete;
using SqlKata.Execution;
using System.Data;

namespace NTier.DataAccess.Concrete.SqlKata
{
    public class SKCustomerDal : SKEntityRepositoryBase<Customer>, ICustomerDal
    {
        public SKCustomerDal(QueryFactory dbConnection,XQuery dbConnectionXQuery) : base(dbConnection,dbConnectionXQuery)
        {
        }
    }
}
