using NTier.Entities.Concrete;
using SqlKata;
using SqlKata.Execution;

namespace NTier.Business.Abstract
{
    public interface ICustomerService
    {
        IEnumerable<dynamic> ExecQuery(Query query);
        Query ExecQueryWithoutGet(Query query);
        XQuery XQuery();
        IEnumerable<dynamic> Sql(string sql, dynamic? parameters = null);

        IEnumerable<dynamic> Add(Query query, Customer entity);

        IEnumerable<dynamic> Update(Query query, Customer entity);

        IEnumerable<dynamic> Delete(Query query);
    }
}
