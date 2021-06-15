old=$(pwd)
cd ../golang
rm -Rf ./go-app
GOOS=darwin GOARCH=amd64 go build -o ../electron-js/go-app main.go
cd $old
