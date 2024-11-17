using NTier.Core.Entities;
using SqlKata;
using SqlKata.Execution;

namespace NTier.Business.Abstract
{
    public interface ICustomerService<T> where T : class, IEntity, new()
    {
        IEnumerable<dynamic> ExecQuery(Query query);
        XQuery XQuery();

        IEnumerable<dynamic> Sql(string sql, dynamic? parameters = null);

        IEnumerable<dynamic> Add(Query query, T entity);

        IEnumerable<dynamic> Update(Query query, T entity);

        IEnumerable<dynamic> Delete(Query query);
    }
}
