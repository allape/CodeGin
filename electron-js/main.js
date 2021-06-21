const { app, ipcMain, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

// const mysql = require('mysql');
const { exec } = require("child_process");
const GO_APP_PATH = path.join(app.getAppPath(), 'go-app');

// 当前应用的配置文件夹
const APP_HOME_DIR = path.join(os.homedir(), '.code-gin');
if (!fs.existsSync(APP_HOME_DIR)) {
    fs.mkdirSync(APP_HOME_DIR, { recursive: true });
}

// 模板文件文件夹
const SAVED_TEMPLATE_FILES_FOLDER = path.join(APP_HOME_DIR, 'tpl');

/**
 * 字符串转base64
 * @param s 转换的字符串
 */
function toBase64(s) {
    return Buffer.from(s).toString('base64');
}

function createWindow () {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 800,
        minHeight: 600,
        title: '代码生成器',
        icon: path.join(app.getAppPath(), 'icon.png'),
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            devTools: true,
        },
    });

    if (process.env.ELEC_APP_TYPE === 'web') {
        win.loadURL("http://localhost:3001").then();
    } else {
        win.loadFile('./app/index.html').then();
    }
}

async function execute(conn, sql, params) {
    return new Promise((resolve, reject) => {
        // const queried = conn.query(
        //     sql,
        //     params,
        //     (err, results, fields) => {
        //         if (err) {
        //             reject(err);
        //             return;
        //         }
        //         resolve({ results, fields });
        //     },
        // );
        // console.log(queried.sql);
        exec(`${GO_APP_PATH} "${toBase64(JSON.stringify(conn))}" ${toBase64(sql)} ${(params || []).map(p => `${toBase64(p)}`)}`, (error, stdout, stderr) => {
            try {
                if (error) {
                    throw new Error(`error: ${error.message}`);
                } else if (stderr) {
                    throw new Error(`stderr: ${stderr}`);
                }
                console.log('execute sql raw results: ', stdout);
                const result = { results: JSON.parse(stdout), fields: [] };
                console.log('execute sql results', sql, params, result);
                resolve(result);
            } catch (e) {
                console.error('error occurred while execute sql', sql, params, e);
                reject(e);
            }
        });
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
            // conn = mysql.createConnection({
            //     ...args,
            //     user: args.username,
            //     timeout: 10000,
            // });
            conn = args;
            execute(conn, `SHOW DATABASES`).then(res => {
                e.reply(GetConnectionInfoChannel, {
                    name: `${args.username}@${args.host}:${args.port}`,
                    schemas: res.results.map(i => ({
                        name: i['Database'],
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

    // 保存生成的内容
    const SaveToFileChannel = 'save-to-file';
    ipcMain.on(SaveToFileChannel, (e, args) => {
        try {
            fs.writeFileSync(args.filename, args.content);
            e.returnValue = true;
        } catch (err) {
            e.returnValue = err;
        }
    });
});
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
});
