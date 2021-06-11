export default interface Database {
  // 名称
  name?: string;
  // 数据库列表
  schemas: Schema[];
}

export interface Schema {
  // 库名称
  name?: string;
  // 表列表
  // tables?: Table[];
}

export interface Table {
  // 表名称
  name?: string;
  // 字段列表
  // fields?: Field[];
  // DDL
  // ddl?: string;
}

export interface Field {
  // 字段名称
  name?: string;
  // 字段类型
  type?: 'string' | 'number' | 'boolean';
  // 是否可为null
  nullable?: boolean;
  // 默认值
  defaultValue?: any;
  // 备注信息
  comment?: string;
}
