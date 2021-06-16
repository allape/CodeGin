DEL /F /Q .\go-app.exe
cd ..\golang
go build -o ..\electron-js\go-app.exe main.go
cd ..\electron-js