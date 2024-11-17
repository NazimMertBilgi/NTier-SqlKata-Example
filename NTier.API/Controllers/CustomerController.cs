using Microsoft.AspNetCore.Mvc;
using NTier.Business.Abstract;
using NTier.Core.Models.Customer;
using NTier.Entities.Concrete;
using SqlKata;
using SqlKata.Execution;

namespace NTier.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CustomerController : ControllerBase
    {
        private readonly XQuery _xQuery;
        private readonly ICustomerService<Customer> _customerService;
        public CustomerController(ICustomerService<Customer> customerService, XQuery xQuery)
        {
            _customerService = customerService;
            _xQuery = xQuery;
        }

        [HttpGet("GetAllCustomers")]
        public IActionResult GetAllCustomers()
        {
            var customers = _customerService.ExecQuery(new SqlKata.Query("SalesLT.CustomerNew"));
            // or
            // var customers = _customerService.Sql("SELECT * FROM SalesLT.CustomerNew");
            return Ok(customers);
        }

        [HttpGet("GetCustomer/{id}")]
        public IActionResult GetCustomer(int id)
        {
            var customer = _customerService.ExecQuery(new SqlKata.Query("SalesLT.CustomerNew").Where("CustomerID", id)).FirstOrDefault();
            // or
            // var customer = _customerService.Sql("SELECT * FROM SalesLT.CustomerNew WHERE CustomerID = @id", new { id }).FirstOrDefault();
            return Ok(customer);
        }

        [HttpGet("GetCustomersWithAdress_InnerJoin")]
        public IActionResult GetCustomersWithAdress_InnerJoin()
        {
            var customers = _customerService.ExecQuery(new SqlKata.Query("SalesLT.CustomerNew").Join("SalesLT.CustomerAddress", "SalesLT.CustomerNew.CustomerID", "SalesLT.CustomerAddress.CustomerID"));
            // or
            // var customers = _customerService.Sql("SELECT * FROM SalesLT.CustomerNew INNER JOIN SalesLT.CustomerAddress ON SalesLT.CustomerNew.CustomerID = SalesLT.CustomerAddress.CustomerID");
            return Ok(customers);
        }

        [HttpGet("GetCustomersWithAdress_LeftJoin")]
        public IActionResult GetCustomersWithAdress_LeftJoin()
        {

            var customers = _customerService.ExecQuery(new SqlKata.Query("SalesLT.CustomerNew").Join("SalesLT.CustomerAddress", "SalesLT.CustomerNew.CustomerID", "SalesLT.CustomerAddress.CustomerID", "=", "left join"));
            // or
            // var customers = _customerService.Sql("SELECT * FROM SalesLT.CustomerNew LEFT JOIN SalesLT.CustomerAddress ON SalesLT.CustomerNew.CustomerID = SalesLT.CustomerAddress.CustomerID");
            return Ok(customers);
        }

        [HttpGet("GetCustomersSubQuery")]
        public IActionResult GetCustomersSubQuery()
        {
            var addressCount = new Query("SalesLT.CustomerAddress").WhereColumns("SalesLT.CustomerAddress.CustomerID", "=", "SalesLT.CustomerNew.CustomerID").AsCount();
            var customers = _customerService.ExecQuery(new SqlKata.Query("SalesLT.CustomerNew").Select("*").Select(addressCount, "AddressCount"));
            return Ok(customers);
        }

        [HttpGet("GetCustomersAddressUnion")]
        public IActionResult GetCustomersAddressUnion()
        {
            var result = _customerService.ExecQuery(new Query("SalesLT.CustomerNew")).Union(_customerService.ExecQuery(new Query("SalesLT.CustomerAddress")));
            return Ok(result);
        }

        [HttpGet("GetCustomersChunk")]
        public IActionResult GetCustomersChunk()
        {
            // Bazen tüm tablonun belleğe bir kere yüklenmesini önlemek için verileri parçalar halinde almak isteyebilirsiniz, bunun için bu Chunkyöntemi kullanabilirsiniz.
            // Bu, binlerce kaydın bulunduğu durumlarda kullanışlıdır.
            var result = _customerService.ExecQueryWithoutGet(new Query("SalesLT.CustomerNew"));
            var customers = new List<IEnumerable<dynamic>>();
            result.Chunk(10, (index, page) =>
            {
                if (page == 3)
                {
                    return false;
                }
                customers.Add(index);
                return true;
            });
            return Ok(customers);
        }

        [HttpGet("GetCustomersPaginate")]
        public IActionResult GetCustomersPaginate()
        {
            // Bu yöntem, sayfalama işlemi yapmak için kullanılır.
            var result = _customerService.ExecQueryWithoutGet(new Query("SalesLT.CustomerNew"));
            var customers = result.Paginate(1,25);
            return Ok(customers);
        }

        [HttpGet("GetCustomersStoredProcedure")]
        public IActionResult GetCustomersStoredProcedures()
        {
            var result = _customerService.Sql("EXEC SelectAllCustomers");
            return Ok(result);
        }

        [HttpGet("GetCustomersOrderBy")]
        public IActionResult GetCustomersOrderBy()
        {
            var customers = _customerService.ExecQuery(new Query("SalesLT.CustomerNew").OrderByDesc("FirstName"));
            return Ok(customers);
        }


        [HttpGet("GetCustomersWhereBetween")]
        public IActionResult GetCustomersWhereBetween()
        {
            var customers = _customerService.ExecQuery(new Query("SalesLT.CustomerNew").WhereBetween("CustomerID", 1, 10));
            return Ok(customers);
        }

        [HttpGet("GetCustomersWhereIn")]
        public IActionResult GetCustomersWhereIn()
        {
            var customers = _customerService.ExecQuery(new Query("SalesLT.CustomerNew").WhereIn("CustomerID", new[] { 1, 2, 3 }));
            return Ok(customers);
        }

        [HttpGet("GetCustomersWhereNotIn")]
        public IActionResult GetCustomersWhereNotIn()
        {
            var customers = _customerService.ExecQuery(new Query("SalesLT.CustomerNew").WhereNotIn("CustomerID", new[] { 1, 2, 3 }));
            return Ok(customers);
        }

        [HttpGet("GetCustomersWhereNull")]
        public IActionResult GetCustomersWhereNull()
        {
            var customers = _customerService.ExecQuery(new Query("SalesLT.CustomerNew").WhereNull("MiddleName"));
            return Ok(customers);
        }

        [HttpGet("GetCustomersWhereNotNull")]
        public IActionResult GetCustomersWhereNotNull()
        {
            var customers = _customerService.ExecQuery(new Query("SalesLT.CustomerNew").WhereNotNull("MiddleName"));
            return Ok(customers);
        }

        [HttpGet("GetCustomersWhereDate")]
        public IActionResult GetCustomersWhereDate()
        {
            var customers = _customerService.ExecQuery(new Query("SalesLT.CustomerNew").WhereDate("ModifiedDate", "2021-01-01"));
            return Ok(customers);
        }

        [HttpPost("AddCustomer")]
        public IActionResult AddCustomer([FromBody] CustomerAddModel model)
        {
            var addQuery = new SqlKata.Query("SalesLT.CustomerNew");
            var addEntity = new Customer
            {
                NameStyle = model.NameStyle,
                FirstName = model.FirstName,
                LastName = model.LastName,
                PasswordHash = model.PasswordHash,
                PasswordSalt = model.PasswordSalt,
                RowGuid = model.RowGuid,
                ModifiedDate = model.ModifiedDate
            };
            var result = _customerService.Add(addQuery, addEntity);
            return Ok(result);
        }
    }
}
