import {Connection} from '../model/connection';
import Database, {Field, Table} from '../model/database';

export interface Electron {
  getConnectionInfo: (conn: Connection) => Promise<Database>;
  getTables: (schema: string) => Promise<Table[]>;
  getFields: (table: string) => Promise<Field[]>;
}
