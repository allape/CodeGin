import {Connection} from '../model/connection';
import Database, {Field, Table} from '../model/database';
import {TemplateFile} from '../model/template-file';

export interface Electron {
  getConnectionInfo(conn: Connection): Promise<Database>;
  getTables(schema: string): Promise<Table[]>;
  getFields(table: string): Promise<Field[]>;
  getSavedTplFiles(): Promise<TemplateFile[]>;
  saveTplFile(name: string, content: string): Promise<boolean>;
}
