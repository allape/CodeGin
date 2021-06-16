GOOS=darwin
GOARCH=amd64

if [ ! -z $1 ]; then
  GOOS=$1
fi

if [ ! -z $2 ]; then
  GOARCH=$2
fi

rm -Rf ./go-app
old=$(pwd)
cd ../golang
go build -o ../electron-js/go-app main.go
cd $old
