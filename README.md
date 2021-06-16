# CodeGin | 代码生成器 | Code Generator

### ⚠️ 包支持不足 | Legacy ⚠️
- npm mysql 不支持mysql8.0以上的默认鉴权方式, 需要使用mysql_native_password的加密方式的用户才行
- npm mysql DOES NOT support the default auth method above mysql 8.0, password encryption MUST be mysql_native_password
- XXX IDENTIFIED WITH mysql_native_password BY 'password'
- 后期解决方式要么内置mysql client或使用golang重新写一个底层应用, 然后使用node的child_process去执行
- Will embed mysql-client or using golang with nodejs.child_process to apply all SQL execution in the future

### 技术栈 | Technologies
- [react](https://reactjs.org/)
- [typescript](http://typescriptlang.org/)
- [monaco-editor](https://github.com/microsoft/monaco-editor)
- [electron-js](https://www.electronjs.org/)
- [mysql](https://www.mysql.com/)
- [golang](https://golang.org/)

#### react
```shell
cd react-app

# 开发启动 | Start
npm start

# 生产启动, 需要在electron环境下 | Start for electron usage
npm run-script start-production

# 打包 | Build
npm build
```

#### electron js
```shell
cd electron-js
# 正常启动 | Start
npm start
# 调试页面启动 | Start for web debug
npm run-script start-web

# MacOS 打包 | Build for MacOS
npm run-script pack-macos
# 其他平台打包参考文档 | Build for another platforms
# https://github.com/electron/electron-packager
# 显示打包帮助内容 | Display electron-packager manual
./node_modules/.bin/electron-packager --help
# 或 | or
#e lectron-packager --help # npm install -g electron-packager
# 或 | or
# node ./node_modules/.bin/electron-packager --help

# MacOS图标生成参考/resources/png2icns.sh
```

#### golang
```shell
cd golang
# 运行go | Run go app cli
go run main.go '{"username":...}' SQL arg1 arg2

# 打包 | Build
# https://stackoverflow.com/questions/20728767/all-possible-goos-value
# https://github.com/golang/go/commit/1eebb91a5828c26532125b9464c92f721cd79d0f

# (打包 | Build for) MacOS x64
rm -Rf ./go-app
GOOS=darwin GOARCH=amd64 go build -o go-app main.go
```
