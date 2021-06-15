// 打包前复制资源数据
const fs = require('fs');
fs.copyFileSync('../resources/icon.svg', './public/icon.svg');