const { ipcRenderer } = require('electron');

async function ipcRendererWrap(channel, args) {
    return new Promise((resolve, reject) => {
        const result = ipcRenderer.sendSync(channel, args);
        console.log(`${channel}: `, result);
        if (result instanceof Error) {
            reject(result);
        } else {
            resolve(result);
        }
    });
}

async function ipcRendererAsyncWrap(channel, args) {
    return new Promise((resolve, reject) => {
        ipcRenderer.once(channel, (e, result) => {
            console.log(`${channel}: `, result);
            if (result instanceof Error) {
                reject(result);
            } else {
                resolve(result);
            }
        });
        ipcRenderer.send(channel, args);
    });
}

const electron = {
    getConnectionInfo: async (conn) => {
        return ipcRendererAsyncWrap('get-connection-info', conn);
    },
    getTables: async (schemaName) => {
        return ipcRendererAsyncWrap('get-tables', schemaName);
    },
    getSavedTplFiles: async () => {
        return ipcRendererWrap('get-saved-tpl-files');
    },
};
