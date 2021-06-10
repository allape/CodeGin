const fs = require('fs');
const APP_FOLDER = '../electron-js/app/';
if (fs.existsSync(APP_FOLDER)) fs.rmdirSync(APP_FOLDER, { recursive: true });
// fs.mkdirSync(APP_FOLDER, { recursive: true });
fs.renameSync('./build', APP_FOLDER);
