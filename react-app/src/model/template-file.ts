/**
 * 保存的模板文件
 */
import {DEFINITION_IMPORT} from './definition';

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

// 默认的内容
export const DEFAULT_TEMPLATE =
`// 不要删除该import或添加其他的import语句, 执行模板的时候会替换掉第一句import, 这个仅仅是为了使用monaco editor的语法提示
import {database, table, fields, fieldMap, ${DEFINITION_IMPORT}} from 'dbtpl';

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
return tpl;`;
