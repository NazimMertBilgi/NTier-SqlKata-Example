using NTier.Core.Entities;
using SqlKata;
using SqlKata.Execution;

namespace NTier.Core.DataAccess
{
    public interface IEntityRepository<T> where T : class, IEntity, new()
    {
        IEnumerable<dynamic> ExecQuery(Query query);

        Task<IEnumerable<dynamic>> ExecQueryAsync(Query query);
        
        Query ExecQueryWithoutGet(Query query);

        XQuery XQuery();

        IEnumerable<dynamic> Sql(string sql, dynamic? parameters = null);

        IEnumerable<dynamic> Add(Query query, T entity);

        IEnumerable<dynamic> Update(Query query, T entity);

        IEnumerable<dynamic> Delete(Query query);

    }
}
