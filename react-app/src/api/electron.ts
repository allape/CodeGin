import {Connection} from '../model/connection';
import Database from '../model/database';

export interface Electron {
  getConnectionInfo: (conn: Connection) => Promise<Database>;
}
