const { ipcRenderer } = require('electron');

// async function execute(sql, params) {
//     return new Promise((resolve, reject) => {
//         const queried = conn.query(
//             sql,
//             params,
//             (err, results, fields) => {
//                 if (err) {
//                     reject(err);
//                     return;
//                 }
//                 resolve({ results, fields });
//             },
//         );
//         console.log(queried.sql);
//     });
// }
//
// async function gen() {
//     await execute(
//         `INSERT INTO person_temp (person_id, meter, rssi, temperature) VALUES (?, ?, ?, ?)`,
//         [
//             'b71850b1-6430-11ea-8607-00e269244a8a', '8933',
//             -20, (Math.random() * 50).toFixed(2),
//         ],
//     );
//     setTimeout(() => gen(), 1001);
// }

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
    getSavedTplFiles: async () => {
        return ipcRendererWrap('get-saved-tpl-files');
    },
};
