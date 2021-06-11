const { app, ipcMain, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');

// 模板文件文件夹
const SAVED_TEMPLATE_FILES_FOLDER = './tpl';

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
            });
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
                    name: '',
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
            execute(conn, `SHOW TABLES FROM \`${args}\``).then(res => {
                console.log(res);
                // TODO
                e.reply(GetTablesChannel, []);
            }).catch(err => e.reply(GetTablesChannel, err));
        } catch (err) {
            e.reply(GetTablesChannel, err);
        }
    });
});
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
});
