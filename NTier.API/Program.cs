using Microsoft.Data.SqlClient;
using NTier.Business.Abstract;
using NTier.Business.Concrete;
using NTier.DataAccess.Abstract;
using NTier.DataAccess.Concrete.SqlKata;
using NTier.Entities.Concrete;
using SqlKata.Compilers;
using SqlKata.Execution;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);


// Add services to the container.

builder.Services.AddControllers(options => options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true).AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    options.JsonSerializerOptions.PropertyNamingPolicy = null;
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.JsonSerializerOptions.WriteIndented = true;
});

builder.Services.AddCors(p => p.AddPolicy("corsapp", builder =>
{
    builder.WithOrigins("*").AllowAnyMethod().AllowAnyHeader();
}));
//
builder.Services.AddTransient<QueryFactory>((e) =>
{
    var connection = new SqlConnection(builder.Configuration.GetConnectionString("DefaultConnection"));
    var compiler = new SqlServerCompiler();
    return new QueryFactory(connection, compiler);
});
builder.Services.AddTransient<XQuery>((e) =>
{
    var connection = new SqlConnection(builder.Configuration.GetConnectionString("DefaultConnection"));
    var compiler = new SqlServerCompiler();
    return new XQuery(connection, compiler);
});
//
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
