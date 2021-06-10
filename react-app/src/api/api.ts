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
 * 获取报错了的模板文件
 */
export async function getSavedTplFiles(): Promise<TemplateFile[]> {
  if (production) {
    return electron.getSavedTplFiles();
  }
  if (Math.random() * 100 < 30) return Promise.reject('获取文件失败');
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
