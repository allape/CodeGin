const fs = require('fs');
const APP_FOLDER = '../electron-js/app/';
fs.unlinkSync(APP_FOLDER)
// fs.mkdirSync(APP_FOLDER, { recursive: true });
fs.renameSync('./build', APP_FOLDER);
