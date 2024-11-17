using NTier.Core.Entities;
using SqlKata;
using SqlKata.Execution;

namespace NTier.Core.DataAccess.SqlKata
{
    public class SKEntityRepositoryBase<TEntity> : IEntityRepository<TEntity>
        where TEntity : class, IEntity, new()
    {

        protected readonly QueryFactory _db;
        protected readonly XQuery _dbXQuery;

        public SKEntityRepositoryBase(QueryFactory db, XQuery dbXQuery)
        {
            _db = db;
            _dbXQuery = dbXQuery;
        }

        public IEnumerable<dynamic> Sql(string sql, dynamic? parameters = null)
        {
            return _db.Select(sql, parameters);
        }

        public IEnumerable<dynamic> ExecQuery(Query query)
        {
            return _db.FromQuery(query).Get();
        }

        public XQuery XQuery()
        {
            return _dbXQuery;
        }

        public IEnumerable<dynamic> Update(Query query, TEntity entity)
        {
            return _db.FromQuery(query).AsUpdate(entity).Get();
        }

        public IEnumerable<dynamic> Add(Query query, TEntity entity)
        {
            return _db.FromQuery(query).AsInsert(entity).Get();
        }

        public IEnumerable<dynamic> Delete(Query query)
        {
            return _db.FromQuery(query).AsDelete().Get();
        }

    }
}
