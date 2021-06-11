import {Connection} from '../model/connection';
import Database, {Field, Table} from '../model/database';
import {Electron} from './electron';
import {TemplateFile} from '../model/template-file';

declare const electron: Electron;

const production = process.env.NODE_ENV === 'production';

export function stringifyError(e: any): string {
  return typeof e === 'string' ? e : (e.message || e.msg);
}

/**
 * 连接数据库并获取数据库数据
 * @param conn 连接信息
 */
export async function connect(conn: Connection): Promise<Database> {
  if (production) {
    return electron.getConnectionInfo(conn);
  } else {
    return new Promise(resolve => setTimeout(() => resolve({
      name: `${conn.username}@${conn.host}`,
      schemas: [
        {
          name: 'test',
        },
        {
          name: 'test1',
        },
        {
          name: 'test12',
        },
      ],
    }), 1000));
  }
}

/**
 * 获取数据库表列表
 * @param schemaName 数据库名称
 */
export async function getTables(schemaName: string): Promise<Table[]> {
  if (production) {
    return electron.getTables(schemaName);
  } else {
    if (Math.random() * 100 < 30) return Promise.reject('当前还未建立数据库连接');
    return new Promise(resolve => setTimeout(() => resolve([
      {
        name: 'test_table_1',
      },
      {
        name: 'test_table_2',
      },
      {
        name: 'test_table_3',
      },
    ]), 1000));
  }
}

/**
 * 获取表DDL
 * @param tableName 表名
 */
export async function getTableDDL(tableName: string): Promise<string> {
  if (production) {
    return electron.getTableDDL(tableName);
  }
  return `
CREATE TABLE \`controller_log\` (
  \`id\` varchar(64) NOT NULL,
  \`url\` text COMMENT '请求的URL',
  \`http_method\` varchar(64) DEFAULT NULL COMMENT '请求方式',
  \`ip\` text COMMENT '请求的IP',
  \`auth\` text COMMENT 'Authorization头',
  \`lang\` text COMMENT 'Accept-Language头',
  \`time\` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '请求时间',
  \`thread\` text COMMENT '当前线程信息',
  \`class_method\` text COMMENT '处理的类方法',
  \`args\` longtext COMMENT '类方法参数',
  \`return\` longtext COMMENT '方法响应内容',
  \`exception\` longtext COMMENT '类方法抛出的异常',
  \`finish\` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '处理完成时间',
  \`large\` blob COMMENT '大数据内容',
  \`create_time\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`status\` decimal(1,0) NOT NULL DEFAULT '1',
  PRIMARY KEY (\`id\`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='访问记录'
`;
}

/**
 * 获取表字段
 * @param tableName 表名
 */
export async function getFields(tableName: string): Promise<Field[]> {
  if (production) {
    return electron.getFields(tableName);
  } else {
    if (Math.random() * 100 < 30) return Promise.reject('当前还未建立数据库连接');
    return new Promise(resolve => setTimeout(() => resolve([
      {
        name: 'id',
        type: 'string',
        nullable: false,
      },
      {
        name: 'name',
        type: 'string',
        nullable: false,
      },
      {
        name: 'sex',
        type: 'number',
        nullable: true,
      },
      {
        name: 'avatar',
        type: 'string',
        nullable: true,
      },
      {
        name: 'address',
        type: 'string',
        nullable: true,
      },
    ]), 1000));
  }
}

/**
 * 获取保存了的模板文件
 */
export async function getSavedTplFiles(): Promise<TemplateFile[]> {
  if (production) {
    return electron.getSavedTplFiles();
  }
  return new Promise(resolve => setTimeout(() => resolve([
    {
      id: '电了么后台管理系统',
      content: `电了么后台管理系统`,
      createTime: Date.now(),
      updateTime: Date.now(),
    },
    {
      id: '电了么后台管理系统-带城市',
      content: `电了么后台管理系统-带城市`,
      createTime: Date.now(),
      updateTime: Date.now(),
    },
  ]), 1000));
}

/**
 * 保存模板文件
 */
export async function saveTplFile(name: string, content: string): Promise<boolean> {
  if (production) {
    return electron.saveTplFile(name, content);
  }
  console.log('dev: should save', content, 'to', name);
  if (Math.random() * 100 < 30) return Promise.reject('获取文件失败');
  return new Promise(resolve => setTimeout(() => resolve(true), 1000));
}
