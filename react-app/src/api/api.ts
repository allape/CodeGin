import {Connection} from '../model/connection';
import Database from '../model/database';
import {Electron} from './electron';

declare const electron: Electron;

const production = process.env.NODE_ENV === 'production';

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
      ],
    }), 1000));
  }
}

export function stringifyError(e: any): string {
  return typeof e === 'string' ? e : (e.message || e.msg);
}
