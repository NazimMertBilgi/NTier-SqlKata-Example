const sql = require("mssql/msnodesqlv8");
const packageSettingsJSON = require('./packageSettings.json');
const fs = require('fs');
const path = require('path');

class NMBDatabaseSchemaGenerator {
    constructor(config) {
        this.config = config;
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
            sql.close();
        } catch (err) {
            console.error('SQL error', err);
            sql.close();
        }
    }

    generateEntities(tables) {
        const entitiesPath = path.join(__dirname, 'NTier.Entities', 'Concrete');
        if (!fs.existsSync(entitiesPath)) {
            fs.mkdirSync(entitiesPath, { recursive: true });
        }

        for (const [tableName, columns] of Object.entries(tables)) {
            const className = tableName;
            let classContent = `using NTier.Core.Entities;\nusing SqlKata.ModelHelper;\nusing System.Xml.Linq;\n\nnamespace NTier.Entities.Concrete\n{\n    [Table("${tableName}")]\n    public class ${className}\n    {\n`;
            columns.forEach(({ COLUMN_NAME, DATA_TYPE, IS_NULLABLE, IS_PRIMARY_KEY }, index) => {
                let csharpType;
                switch (DATA_TYPE) {
                    case 'int':
                        csharpType = IS_NULLABLE === 'YES' ? 'int?' : 'int';
                        break;
                    case 'varchar':
                    case 'nvarchar':
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

            const filePath = path.join(entitiesPath, `${className}.cs`);
            fs.writeFileSync(filePath, classContent, 'utf8');
        }
    }

    generateAbstractDALFiles(tables) {
        const dalPath = path.join(__dirname, 'NTier.DataAccess', 'Abstract');
        if (!fs.existsSync(dalPath)) {
            fs.mkdirSync(dalPath, { recursive: true });
        }

        for (const tableName of Object.keys(tables)) {
            const className = tableName;
            const dalContent = `using NTier.Core.DataAccess;\nusing NTier.Entities.Concrete;\n\nnamespace NTier.DataAccess.Abstract\n{\n    public interface I${className}Dal : IEntityRepository<${className}>\n    {\n        // Custom Operations\n    }\n}\n`;

            const filePath = path.join(dalPath, `I${className}Dal.cs`);
            fs.writeFileSync(filePath, dalContent, 'utf8');
        }
    }

    generateConcreteDALFiles(tables) {
        const dalPath = path.join(__dirname, 'NTier.DataAccess', 'Concrete', 'SqlKata');
        if (!fs.existsSync(dalPath)) {
            fs.mkdirSync(dalPath, { recursive: true });
        }

        for (const tableName of Object.keys(tables)) {
            const className = tableName;
            const dalContent = `using NTier.Core.DataAccess;\nusing NTier.Core.DataAccess.SqlKata;\nusing NTier.DataAccess.Abstract;\nusing NTier.Entities.Concrete;\nusing SqlKata.Execution;\nusing System.Data;\n\nnamespace NTier.DataAccess.Concrete.SqlKata\n{\n    public class SK${className}Dal : SKEntityRepositoryBase<${className}>, I${className}Dal\n    {\n        public SK${className}Dal(QueryFactory dbConnection, XQuery dbConnectionXQuery) : base(dbConnection, dbConnectionXQuery)\n        {\n        }\n    }\n}\n`;

            const filePath = path.join(dalPath, `SK${className}Dal.cs`);
            fs.writeFileSync(filePath, dalContent, 'utf8');
        }
    }

    generateServiceFiles(tables) {
        const servicePath = path.join(__dirname, 'NTier.Business', 'Abstract');
        if (!fs.existsSync(servicePath)) {
            fs.mkdirSync(servicePath, { recursive: true });
        }

        for (const tableName of Object.keys(tables)) {
            const className = tableName;
            const serviceContent = `using NTier.Entities.Concrete;\nusing SqlKata;\nusing SqlKata.Execution;\n\nnamespace NTier.Business.Abstract\n{\n    public interface I${className}Service\n    {\n        IEnumerable<dynamic> ExecQuery(Query query);\n\n        Query ExecQueryWithoutGet(Query query);\n\n        XQuery XQuery();\n        \n        IEnumerable<dynamic> Sql(string sql, dynamic? parameters = null);\n\n        IEnumerable<dynamic> Add(Query query, ${className} entity);\n\n        IEnumerable<dynamic> Update(Query query, ${className} entity);\n\n        IEnumerable<dynamic> Delete(Query query);\n    }\n}\n`;

            const filePath = path.join(servicePath, `I${className}Service.cs`);
            fs.writeFileSync(filePath, serviceContent, 'utf8');
        }
    }

    generateManagerFiles(tables) {
        const managerPath = path.join(__dirname, 'NTier.Business', 'Concrete');
        if (!fs.existsSync(managerPath)) {
            fs.mkdirSync(managerPath, { recursive: true });
        }

        for (const tableName of Object.keys(tables)) {
            const className = tableName;
            const managerContent = `using NTier.Business.Abstract;\nusing NTier.DataAccess.Abstract;\nusing NTier.Entities.Concrete;\nusing SqlKata;\nusing SqlKata.Execution;\n\nnamespace NTier.Business.Concrete\n{\n    public class ${className}Manager<TDal> : I${className}Service\n        where TDal : I${className}Dal\n    {\n        private readonly TDal _tDal;\n\n        public ${className}Manager(TDal tDal)\n        {\n            _tDal = tDal;\n        }\n\n        public IEnumerable<dynamic> ExecQuery(Query query)\n        {\n            return _tDal.ExecQuery(query);\n        }\n\n        public Query ExecQueryWithoutGet(Query query)\n        {\n            return _tDal.ExecQueryWithoutGet(query);\n        }\n\n        public XQuery XQuery()\n        {\n            return _tDal.XQuery();\n        }\n\n        public IEnumerable<dynamic> Sql(string sql, dynamic? parameters = null)\n        {\n            return _tDal.Sql(sql, parameters);\n        }\n\n        public IEnumerable<dynamic> Add(Query query, ${className} entity)\n        {\n            return _tDal.Add(query, entity);\n        }\n\n        public IEnumerable<dynamic> Update(Query query, ${className} entity)\n        {\n            return _tDal.Update(query, entity);\n        }\n\n        public IEnumerable<dynamic> Delete(Query query)\n        {\n            return _tDal.Delete(query);\n        }\n    }\n}\n`;

            const filePath = path.join(managerPath, `${className}Manager.cs`);
            fs.writeFileSync(filePath, managerContent, 'utf8');
        }
    }

    generateDependencyInjectionRegistrations(tables) {
        const programFilePath = path.join(__dirname, 'NTier.API', 'Program.cs');
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

        fs.writeFileSync(programFilePath, modifiedContent, 'utf8');
    }
}

const config = packageSettingsJSON.dbConnection;
const generator = new NMBDatabaseSchemaGenerator(config);
generator.getTablesAndColumns();