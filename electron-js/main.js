const { app, ipcMain, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');

// 模板文件文件夹
const SAVED_TEMPLATE_FILES_FOLDER = path.join(app.getAppPath(), 'tpl');

function createWindow () {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 800,
        minHeight: 600,
        title: '代码生成器',
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            devTools: true,
        },
    });

    win.loadFile('./app/index.html').then();
    // win.loadURL("http://localhost:3001").then();
}

async function execute(conn, sql, params) {
    return new Promise((resolve, reject) => {
        const queried = conn.query(
            sql,
            params,
            (err, results, fields) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ results, fields });
            },
        );
        console.log(queried.sql);
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    });

    // 模板文件
    ipcMain.on('get-saved-tpl-files', e => {
        try {
            if (!fs.existsSync(SAVED_TEMPLATE_FILES_FOLDER)) {
                fs.mkdirSync(SAVED_TEMPLATE_FILES_FOLDER, {recursive: true});
            }
            const files = fs.readdirSync(SAVED_TEMPLATE_FILES_FOLDER);
            e.returnValue = files.map(file => {
                const filepath = path.join(SAVED_TEMPLATE_FILES_FOLDER, file);
                const fileStat = fs.statSync(filepath);
                return {
                    id: file,
                    content: String(fs.readFileSync(filepath)),
                    createTime: fileStat.birthtimeMs,
                    updateTime: fileStat.mtimeMs,
                };
            }).sort((c, p) => p.updateTime - c.updateTime);
        } catch (err) {
            e.returnValue = err;
        }
    });

    const SaveTplFileChannel = 'save-tpl-file';
    ipcMain.on(SaveTplFileChannel, (e, { name, content }) => {
        try {
            fs.writeFileSync(path.join(SAVED_TEMPLATE_FILES_FOLDER, name), content);
            e.returnValue = true;
        } catch (err) {
            e.returnValue = err;
        }
    });

    // 缓存连接信息
    let conn = null;

    const GetConnectionInfoChannel = 'get-connection-info';
    ipcMain.on(GetConnectionInfoChannel, (e, args) => {
        try {
            conn = mysql.createConnection({
                ...args,
                user: args.username,
                timeout: 10000,
            });
            execute(conn, `SHOW DATABASES`).then(res => {
                e.reply(GetConnectionInfoChannel, {
                    name: `${args.username}@${args.host}:${args.port}`,
                    schemas: res.results.map(i => ({
                        name: i.Database,
                    })),
                });
            }).catch(err => e.reply(GetConnectionInfoChannel, err));
        } catch (err) {
            e.reply(GetConnectionInfoChannel, err);
        }
    });

    const GetTablesChannel = 'get-tables';
    ipcMain.on(GetTablesChannel, (e, args) => {
        try {
            // execute(conn, `SHOW TABLES FROM \`${args}\``).then(res => {
            //     const colName = `Tables_in_${args}`;
            //     e.reply(GetTablesChannel, res.results.map(i => ({
            //         name: i[colName],
            //     })));
            // }).catch(err => e.reply(GetTablesChannel, err));
            execute(
                conn,
                `SELECT table_name,table_comment FROM INFORMATION_SCHEMA.TABLES WHERE table_schema=?`,
                [args],
            ).then(res => {
                e.reply(GetTablesChannel, res.results.map(i => ({
                    name: i['TABLE_NAME'],
                    comment: i['TABLE_COMMENT'],
                })));
            }).catch(err => e.reply(GetTablesChannel, err));
        } catch (err) {
            e.reply(GetTablesChannel, err);
        }
    });

    const GetTableDDLChannel = 'get-table-ddl';
    ipcMain.on(GetTableDDLChannel, (e, args) => {
        try {
            execute(conn, `SHOW CREATE TABLE ${args}`).then(res => {
                e.reply(GetTableDDLChannel, res.results[0]['Create Table']);
            }).catch(err => e.reply(GetTableDDLChannel, err));
        } catch (err) {
            e.reply(GetTableDDLChannel, err);
        }
    });

    const GetFieldsChannel = 'get-fields';
    ipcMain.on(GetFieldsChannel, (e, args) => {
        try {
            execute(conn, `SHOW FULL COLUMNS FROM ${args}`).then(res => {
                e.reply(GetFieldsChannel, res.results.map(i => ({
                    name: i.Field,
                    type: i.Type,
                    nullable: i['Null'] === 'YES',
                    defaultValue: i['Default'],
                    comment: i['Comment'],
                })));
            }).catch(err => e.reply(GetFieldsChannel, err));
        } catch (err) {
            e.reply(GetFieldsChannel, err);
        }
    });
});
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
});
