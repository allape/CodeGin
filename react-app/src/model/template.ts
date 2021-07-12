import {DEFINITION_IMPORT, PRESET_DEFINITIONS} from './definition';
import {TFunction} from 'react-i18next';
import Database, {Field, Table} from './database';

/**
 * 保存的模板文件
 */
export interface TemplateFile {
  // 文件名称
  id: string;
  // 内容
  content: string;
  // 创建时间
  createTime: number;
  // 修改时间
  updateTime: number;
}

/**
 * 模板执行结果
 */
export interface TemplateResult {
  // 结果
  result: string;
  // 文件名称
  filename?: string;
}

// 默认的内容
export const DEFAULT_TEMPLATE =
`// 不要删除该import或添加其他的import语句, 执行模板的时候会替换掉第一句import, 这个仅仅是为了使用monaco editor的语法提示
import {database, table, fields, fieldMap, ${DEFINITION_IMPORT}} from 'code-gin';

// 驼峰的表名
const tableName = toCamelCase(table.name);
const TableName = toCamelCase(table.name, true);

// 忽略的字段
const ignoreFields = ['id', 'status', 'create_time', 'update_time'];

// 对字段进行简要的处理
fields.forEach(field => {
  field.newName = toCamelCase(field.name);
  field.newType = toJavaType(field.type);
});
// 过滤后的字段数组
const filteredFields = fields.filter(i => !ignoreFields.includes(i.name));

// 字符串模板内容
let tpl = 
\`package net.allape.admin.entity

/**
 * \${table.comment}
 */
@Data
public class \${TableName} extends BaseEntity {
    \${filteredFields.map(field => 
    \`
    /**
     * \${field.comment}
     */
    private \${field.newType} \${field.newName};
\`
    ).join('')}
}
\`;
// \`package net.allape.admin.controller
//
// /**
//  * \${table.comment}
//  */
// @RequestMapping("/\${table.name.replaceAll('_', '-')}")
// @RestController
// public class \${TableName}Controller extends BaseController<\${TableName}> {
//     @PostMapping('/')
//     public Response CRUD(@RequestBody data) {
//         return Response.i(Response.Code.OK, this.\${tableName}Service.crud(data));
//     }
// }
// \`;

// 必须存在一个return语句, 因为模板执行方式是: (new Function(依赖 + 模板内容))()的返回值
return {
  // 结果内容
  result: tpl,
  // 保存至的文件名称,
  filename: \`\${TableName}Entity.java\`,
  // filename: \`\${TableName}Controller.java\`,
};`;

/**
 * 执行模板内容
 * @param t i18n
 * @param definitions 预设内容
 * @param source 模板内容
 */
export const run = (t: TFunction, definitions: string, source: string): TemplateResult => {
  const sourceCode = `
        ${definitions.replace(/(?<=\n) *((import.+?;)|export )/g, '')}
        ${/*替换掉第一个import*/source.replace(/\s*(import.+?;)/, '')}
      `;
  console.log(sourceCode);
  const result = new Function(sourceCode)() as TemplateResult;
  if (result === undefined) {
    throw new Error(t('template.noReturnStatement'));
  } else if (!result.result) {
    throw new Error(t('template.noResultContent'));
  }
  return result;
};

/**
 * 生成数据库依赖内容
 * @param t i18n
 * @param database 数据库信息
 * @param table 表信息
 * @param fields 字段信息
 * @param ddl DDL
 */
export const define = (t: TFunction, database: Database, table: Table, fields: Field[], ddl: string): string => `
// ${t('template.default.DDL')}
${
  /*ddl.split('\n').map(i => `// ${i}`).join('\n')*/
  '// ' + (ddl || '').replace(/\n/g, '\n// ')
}

// ${t('template.default.database')}
export const database = ${JSON.stringify(database, undefined, 4)};

// ${t('template.default.table')}
export const table = ${JSON.stringify(table, undefined, 4)};

// ${t('template.default.fields')}
export const fields = ${JSON.stringify(fields, undefined, 4)};

// ${t('template.default.fieldMap')}
export const fieldMap = ${JSON.stringify(fields.reduce((p, c) => ({...p, [c.name as string]: c}), {}), undefined, 4)};

// ${t('template.default.presetFunctions')}
${PRESET_DEFINITIONS}
`;
