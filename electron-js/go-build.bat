GOOS=darwin
if [ ! -z $1 ]; then
  GOOS=$1
fi
old=$(pwd)
cd ../golang
rm -Rf ./go-app
GOARCH=amd64 go build -o ../electron-js/go-app main.go
cd $old
