
using NTier.Business.Abstract;
using NTier.Core.Entities;
using NTier.DataAccess.Abstract;
using NTier.Entities.Concrete;
using SqlKata;
using SqlKata.Execution;

namespace NTier.Business.Concrete
{
    public class CustomerManager<TEntity, TDal>(TDal tDal) : ICustomerService<TEntity>
        where TEntity : Customer, IEntity, new()
        where TDal : ICustomerDal
    {
        private readonly TDal _tDal = tDal;

        public IEnumerable<dynamic> ExecQuery(Query query)
        {
            return _tDal.ExecQuery(query);
        }

        public XQuery XQuery()
        {
            return _tDal.XQuery();
        }

        public IEnumerable<dynamic> Sql(string sql, dynamic? parameters = null)
        {
            return _tDal.Sql(sql, parameters);
        }

        public IEnumerable<dynamic> Add(Query query, TEntity entity)
        {
            return _tDal.Add(query, entity);
        }

        public IEnumerable<dynamic> Update(Query query, TEntity entity)
        {
            return _tDal.Update(query, entity);
        }

        public IEnumerable<dynamic> Delete(Query query)
        {
            return _tDal.Delete(query);
        }
    }
}
