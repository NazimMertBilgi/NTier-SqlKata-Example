const sql = require("mssql/msnodesqlv8");
const packageSettingsJSON = require('./packageSettings.json');
const fs = require('fs');
const path = require('path');

class NMBDatabaseSchemaGenerator {
    constructor(config) {
        this.config = config;
        this.packageName = packageSettingsJSON.packageName;
    }

    async getTablesAndColumns() {
        try {
            let pool = await sql.connect(this.config);
            const result = await pool.request().query(`
                SELECT 
                    TABLE_NAME, 
                    COLUMN_NAME, 
                    DATA_TYPE,
                    IS_NULLABLE,
                    COLUMNPROPERTY(object_id(TABLE_NAME), COLUMN_NAME, 'IsIdentity') AS IS_PRIMARY_KEY
                FROM 
                    INFORMATION_SCHEMA.COLUMNS 
                ORDER BY 
                    TABLE_NAME, 
                    ORDINAL_POSITION
            `);

            const tables = result.recordset.reduce((acc, { TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, IS_PRIMARY_KEY }) => {
                if (!acc[TABLE_NAME]) {
                    acc[TABLE_NAME] = [];
                }
                acc[TABLE_NAME].push({ COLUMN_NAME, DATA_TYPE, IS_NULLABLE, IS_PRIMARY_KEY });
                return acc;
            }, {});

            this.generateEntities(tables);
            this.generateAbstractDALFiles(tables);
            this.generateConcreteDALFiles(tables);
            this.generateServiceFiles(tables);
            this.generateManagerFiles(tables);
            this.generateDependencyInjectionRegistrations(tables);
            this.generateControllerFiles(tables);
            this.generateModelFiles(tables);
            sql.close();
        } catch (err) {
            console.error('SQL error', err);
            sql.close();
        }
    }

    generateEntities(tables) {
        const entitiesPath = path.join(__dirname, `${this.packageName}.Entities`, 'Concrete');
        if (!fs.existsSync(entitiesPath)) {
            fs.mkdirSync(entitiesPath, { recursive: true });
        }

        for (const [tableName, columns] of Object.entries(tables)) {
            const className = tableName;
            const filePath = path.join(entitiesPath, `${className}.cs`);

            let classContent = `using ${this.packageName}.Core.Entities;\nusing SqlKata.ModelHelper;\nusing System.Xml.Linq;\n\nnamespace ${this.packageName}.Entities.Concrete\n{\n    [Table("${tableName}")]\n    public class ${className} : IEntity\n    {\n`;
            columns.forEach(({ COLUMN_NAME, DATA_TYPE, IS_NULLABLE, IS_PRIMARY_KEY }, index) => {
                let csharpType;
                switch (DATA_TYPE) {
                    case 'int':
                        csharpType = IS_NULLABLE === 'YES' ? 'int?' : 'int';
                        break;
                    case 'varchar':
                    case 'nvarchar':
                    case 'char':
                        csharpType = IS_NULLABLE === 'YES' ? 'string?' : 'string';
                        break;
                    case 'bit':
                        csharpType = IS_NULLABLE === 'YES' ? 'bool?' : 'bool';
                        break;
                    case 'datetime':
                        csharpType = IS_NULLABLE === 'YES' ? 'DateTime?' : 'DateTime';
                        break;
                    default:
                        csharpType = 'object';
                }
                let stringNullableFeature = csharpType == "string" ? "= null!;" : "";
                let primaryKeyAttribute = IS_PRIMARY_KEY ? '[PrimaryKey]\n        ' : '';
                classContent += `        ${primaryKeyAttribute}public ${csharpType} ${COLUMN_NAME} { get; set; } ${stringNullableFeature}\n`;
                if (IS_PRIMARY_KEY && index < columns.length - 1) {
                    classContent += '\n';
                }
            });
            classContent += '    }\n}\n';

            fs.writeFileSync(filePath, classContent, 'utf8');
        }
    }

    generateAbstractDALFiles(tables) {
        const dalPath = path.join(__dirname, `${this.packageName}.DataAccess`, 'Abstract');
        if (!fs.existsSync(dalPath)) {
            fs.mkdirSync(dalPath, { recursive: true });
        }

        for (const tableName of Object.keys(tables)) {
            const className = tableName;
            const filePath = path.join(dalPath, `I${className}Dal.cs`);
            if (fs.existsSync(filePath)) continue;

            const dalContent = `using ${this.packageName}.Core.DataAccess;\nusing ${this.packageName}.Entities.Concrete;\n\nnamespace ${this.packageName}.DataAccess.Abstract\n{\n    public interface I${className}Dal : IEntityRepository<${className}>\n    {\n        // Custom Operations\n    }\n}\n`;
            fs.writeFileSync(filePath, dalContent, 'utf8');
        }
    }

    generateConcreteDALFiles(tables) {
        const dalPath = path.join(__dirname, `${this.packageName}.DataAccess`, 'Concrete', 'SqlKata');
        if (!fs.existsSync(dalPath)) {
            fs.mkdirSync(dalPath, { recursive: true });
        }

        for (const tableName of Object.keys(tables)) {
            const className = tableName;
            const filePath = path.join(dalPath, `SK${className}Dal.cs`);
            if (fs.existsSync(filePath)) continue;

            const dalContent = `using ${this.packageName}.Core.DataAccess;\nusing ${this.packageName}.Core.DataAccess.SqlKata;\nusing ${this.packageName}.DataAccess.Abstract;\nusing ${this.packageName}.Entities.Concrete;\nusing SqlKata.Execution;\nusing System.Data;\n\nnamespace ${this.packageName}.DataAccess.Concrete.SqlKata\n{\n    public class SK${className}Dal : SKEntityRepositoryBase<${className}>, I${className}Dal\n    {\n        public SK${className}Dal(QueryFactory dbConnection, XQuery dbConnectionXQuery) : base(dbConnection, dbConnectionXQuery)\n        {\n        }\n    }\n}\n`;
            fs.writeFileSync(filePath, dalContent, 'utf8');
        }
    }

    generateServiceFiles(tables) {
        const servicePath = path.join(__dirname, `${this.packageName}.Business`, 'Abstract');
        if (!fs.existsSync(servicePath)) {
            fs.mkdirSync(servicePath, { recursive: true });
        }

        for (const tableName of Object.keys(tables)) {
            const className = tableName;
            const filePath = path.join(servicePath, `I${className}Service.cs`);
            if (fs.existsSync(filePath)) continue;

            const serviceContent = `using ${this.packageName}.Entities.Concrete;\nusing SqlKata;\nusing SqlKata.Execution;\n\nnamespace ${this.packageName}.Business.Abstract\n{\n    public interface I${className}Service\n    {\n        IEnumerable<dynamic> ExecQuery(Query query);\n\n        Query ExecQueryWithoutGet(Query query);\n\n        XQuery XQuery();\n        \n        IEnumerable<dynamic> Sql(string sql, dynamic? parameters = null);\n\n        IEnumerable<dynamic> Add(Query query, ${className} entity);\n\n        IEnumerable<dynamic> Update(Query query, ${className} entity);\n\n        IEnumerable<dynamic> Delete(Query query);\n    }\n}\n`;
            fs.writeFileSync(filePath, serviceContent, 'utf8');
        }
    }

    generateManagerFiles(tables) {
        const managerPath = path.join(__dirname, `${this.packageName}.Business`, 'Concrete');
        if (!fs.existsSync(managerPath)) {
            fs.mkdirSync(managerPath, { recursive: true });
        }

        for (const tableName of Object.keys(tables)) {
            const className = tableName;
            const filePath = path.join(managerPath, `${className}Manager.cs`);
            if (fs.existsSync(filePath)) continue;

            const managerContent = `using ${this.packageName}.Business.Abstract;\nusing ${this.packageName}.DataAccess.Abstract;\nusing ${this.packageName}.Entities.Concrete;\nusing SqlKata;\nusing SqlKata.Execution;\n\nnamespace ${this.packageName}.Business.Concrete\n{\n    public class ${className}Manager<TDal> : I${className}Service\n        where TDal : I${className}Dal\n    {\n        private readonly TDal _tDal;\n\n        public ${className}Manager(TDal tDal)\n        {\n            _tDal = tDal;\n        }\n\n        public IEnumerable<dynamic> ExecQuery(Query query)\n        {\n            return _tDal.ExecQuery(query);\n        }\n\n        public Query ExecQueryWithoutGet(Query query)\n        {\n            return _tDal.ExecQueryWithoutGet(query);\n        }\n\n        public XQuery XQuery()\n        {\n            return _tDal.XQuery();\n        }\n\n        public IEnumerable<dynamic> Sql(string sql, dynamic? parameters = null)\n        {\n            return _tDal.Sql(sql, parameters);\n        }\n\n        public IEnumerable<dynamic> Add(Query query, ${className} entity)\n        {\n            return _tDal.Add(query, entity);\n        }\n\n        public IEnumerable<dynamic> Update(Query query, ${className} entity)\n        {\n            return _tDal.Update(query, entity);\n        }\n\n        public IEnumerable<dynamic> Delete(Query query)\n        {\n            return _tDal.Delete(query);\n        }\n    }\n}\n`;
            fs.writeFileSync(filePath, managerContent, 'utf8');
        }
    }

    generateDependencyInjectionRegistrations(tables) {
        const programFilePath = path.join(__dirname, `${this.packageName}.API`, 'Program.cs');
        let programFileContent = fs.readFileSync(programFilePath, 'utf8');
        const injectionLines = [];

        for (const tableName of Object.keys(tables)) {
            const dalRegistration = `builder.Services.AddScoped<I${tableName}Dal, SK${tableName}Dal>();`;
            const serviceRegistration = `builder.Services.AddScoped<I${tableName}Service, ${tableName}Manager<I${tableName}Dal>>();`;

            if (!programFileContent.includes(dalRegistration)) {
                injectionLines.push('//');
                injectionLines.push(dalRegistration);
            }
            if (!programFileContent.includes(serviceRegistration)) {
                injectionLines.push(serviceRegistration);
            }
        }

        const injectionCode = injectionLines.join('\n');
        const modifiedContent = programFileContent.replace(
            'var builder = WebApplication.CreateBuilder(args);',
            `var builder = WebApplication.CreateBuilder(args);${injectionCode.length > 0 ? '\n' : ''}${injectionCode}`
        );

        if (injectionCode.length > 0) {
            fs.writeFileSync(programFilePath, modifiedContent, 'utf8');
        }
    }

    generateControllerFiles(tables) {
        const controllersPath = path.join(__dirname, `${this.packageName}.API`, 'Controllers');
        if (!fs.existsSync(controllersPath)) {
            fs.mkdirSync(controllersPath, { recursive: true });
        }

        for (const [tableName, columns] of Object.entries(tables)) {
            const className = tableName;
            const filePath = path.join(controllersPath, `${className}Controller.cs`);
            if (fs.existsSync(filePath)) continue;

            const primaryKeyColumn = columns.find(column => column.IS_PRIMARY_KEY)?.COLUMN_NAME;
            if (!primaryKeyColumn) {
                console.warn(`No primary key found for table ${tableName}. Skipping controller generation.`);
                continue;
            }

            const fillPropertiesFromModel = columns
                .filter(column => !column.IS_PRIMARY_KEY)
                .map(column => `${column.COLUMN_NAME} = model.${column.COLUMN_NAME}`)
                .join(",\n                ");

            const controllerContent = `using Microsoft.AspNetCore.Mvc;
using ${this.packageName}.Business.Abstract;
using ${this.packageName}.Core.Models.${className};
using ${this.packageName}.Entities.Concrete;
using SqlKata;
using SqlKata.Execution;

namespace ${this.packageName}.API.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class ${className}Controller : ControllerBase
    {
        private readonly I${className}Service _${className.toLowerCase()}Service;

        public ${className}Controller(I${className}Service ${className.toLowerCase()}Service)
        {
            _${className.toLowerCase()}Service = ${className.toLowerCase()}Service;
        }

        [HttpGet("GetAll")]
        public IActionResult GetAll()
        {
            var result = _${className.toLowerCase()}Service.ExecQuery(new SqlKata.Query("${className}"));
            return Ok(result);
        }

        [HttpGet("Get/{id}")]
        public IActionResult Get(int id)
        {
            var result = _${className.toLowerCase()}Service.ExecQuery(new SqlKata.Query("${className}").Where("${primaryKeyColumn}", id)).FirstOrDefault();
            return Ok(result);
        }

        [HttpGet("GetAllChunk")]
        public IActionResult GetAllChunk()
        {
            var result = _${className.toLowerCase()}Service.ExecQueryWithoutGet(new Query("${className}"));
            var ${className.toLowerCase()}s = new List<IEnumerable<${className}>>();
            result.Chunk(10, (index, page) =>
            {
                if (page == 3)
                {
                    return false;
                }
                ${className.toLowerCase()}s.Add(index);
                return true;
            });
            return Ok(${className.toLowerCase()}s);
        }

        [HttpGet("GetAllPaginate")]
        public IActionResult GetAllPaginate()
        {
            var result = _${className.toLowerCase()}Service.ExecQueryWithoutGet(new Query("${className}"));
            var ${className.toLowerCase()}s = result.Paginate(1, 25);
            return Ok(${className.toLowerCase()}s);
        }

        [HttpGet("GetAllStoredProcedure")]
        public IActionResult GetAllStoredProcedure()
        {
            var result = _${className.toLowerCase()}Service.Sql("EXEC ${className}_GetAll");
            return Ok(result);
        }

        [HttpPost("Add")]
        public IActionResult Add([FromBody] ${className}AddModel model)
        {
            var addQuery = new SqlKata.Query("${className}");
            var addEntity = new ${className}
            {
                ${fillPropertiesFromModel}
            };
            var result = _${className.toLowerCase()}Service.Add(addQuery, addEntity);
            return Ok(result);
        }

        [HttpPost("Update")]
        public IActionResult Update([FromBody] ${className}UpdateModel model)
        {
            var updateQuery = new SqlKata.Query("${className}").Where("${primaryKeyColumn}", model.${primaryKeyColumn});
            var updateEntity = new ${className}
            {
                ${fillPropertiesFromModel}
            };
            var result = _${className.toLowerCase()}Service.Update(updateQuery, updateEntity);
            return Ok(result);
        }

        [HttpPost("Delete/{id}")]
        public IActionResult Delete(int id)
        {
            var deleteQuery = new SqlKata.Query("${className}").Where("${primaryKeyColumn}", id);
            var result = _${className.toLowerCase()}Service.Delete(deleteQuery);
            return Ok(result);
        }
    }
}
`;
            fs.writeFileSync(filePath, controllerContent, 'utf8');
        }
    }

    generateModelFiles(tables) {
        const modelsPath = path.join(__dirname, `${this.packageName}.Core`, 'Models');
        if (!fs.existsSync(modelsPath)) {
            fs.mkdirSync(modelsPath, { recursive: true });
        }

        for (const [tableName, columns] of Object.entries(tables)) {
            const className = tableName;
            const tableModelsPath = path.join(modelsPath, className);
            if (!fs.existsSync(tableModelsPath)) {
                fs.mkdirSync(tableModelsPath, { recursive: true });
            }


            const addModelFilePath = path.join(tableModelsPath, `${className}AddModel.cs`);
            if (!fs.existsSync(addModelFilePath)) {
                let addModelContent = `using System;\nusing System.Collections.Generic;\nusing System.ComponentModel.DataAnnotations;\nusing System.Linq;\nusing System.Text;\nusing System.Threading.Tasks;\n\nnamespace ${this.packageName}.Core.Models.${className}\n{\n    public class ${className}AddModel\n    {\n`;
                columns.forEach(({ COLUMN_NAME, DATA_TYPE, IS_NULLABLE, IS_PRIMARY_KEY }) => {
                    if (!IS_PRIMARY_KEY) {
                        let csharpType;
                        switch (DATA_TYPE) {
                            case 'int':
                                csharpType = IS_NULLABLE === 'YES' ? 'int?' : 'int';
                                break;
                            case 'varchar':
                            case 'nvarchar':
                            case 'char':
                                csharpType = IS_NULLABLE === 'YES' ? 'string?' : 'string';
                                break;
                            case 'bit':
                                csharpType = IS_NULLABLE === 'YES' ? 'bool?' : 'bool';
                                break;
                            case 'datetime':
                                csharpType = IS_NULLABLE === 'YES' ? 'DateTime?' : 'DateTime';
                                break;
                            default:
                                csharpType = 'object';
                        }
                        let stringNullableFeature = csharpType === "string" && IS_NULLABLE === 'NO' ? "= null!;" : "";
                        let requiredAttribute = IS_NULLABLE === 'NO' ? `[Required(ErrorMessage = "Lütfen ${COLUMN_NAME} alanını doldurunuz.")]\n        ` : '';
                        addModelContent += `        ${requiredAttribute}public ${csharpType} ${COLUMN_NAME} { get; set; } ${stringNullableFeature}\n\n`;
                    }
                });
                addModelContent += '    }\n}\n';
                fs.writeFileSync(addModelFilePath, addModelContent, 'utf8');
            }

            const updateModelFilePath = path.join(tableModelsPath, `${className}UpdateModel.cs`);
            if (!fs.existsSync(updateModelFilePath)) {
                let updateModelContent = `using System;\nusing System.Collections.Generic;\nusing System.ComponentModel.DataAnnotations;\nusing System.Linq;\nusing System.Text;\nusing System.Threading.Tasks;\n\nnamespace ${this.packageName}.Core.Models.${className}\n{\n    public class ${className}UpdateModel\n    {\n`;
                columns.forEach(({ COLUMN_NAME, DATA_TYPE, IS_NULLABLE }) => {
                    let csharpType;
                    switch (DATA_TYPE) {
                        case 'int':
                            csharpType = IS_NULLABLE === 'YES' ? 'int?' : 'int';
                            break;
                        case 'varchar':
                        case 'nvarchar':
                        case 'char':
                            csharpType = IS_NULLABLE === 'YES' ? 'string?' : 'string';
                            break;
                        case 'bit':
                            csharpType = IS_NULLABLE === 'YES' ? 'bool?' : 'bool';
                            break;
                        case 'datetime':
                            csharpType = IS_NULLABLE === 'YES' ? 'DateTime?' : 'DateTime';
                            break;
                        default:
                            csharpType = 'object';
                    }
                    let stringNullableFeature = csharpType === "string" && IS_NULLABLE === 'NO' ? "= null!;" : "";
                    let requiredAttribute = IS_NULLABLE === 'NO' ? `[Required(ErrorMessage = "Lütfen ${COLUMN_NAME} alanını doldurunuz.")]\n        ` : '';
                    updateModelContent += `        ${requiredAttribute}public ${csharpType} ${COLUMN_NAME} { get; set; } ${stringNullableFeature}\n\n`;
                });
                updateModelContent += '    }\n}\n';
                fs.writeFileSync(updateModelFilePath, updateModelContent, 'utf8');
            }
        }
    }
}

const config = packageSettingsJSON.dbConnection;
const generator = new NMBDatabaseSchemaGenerator(config);
generator.getTablesAndColumns();