// 打包前复制资源数据
const fs = require('fs');
fs.copyFileSync('../resources/icon.ico', './public/favicon.ico');