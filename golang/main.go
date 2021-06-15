package main

import (
    "database/sql"
    "encoding/json"
    "fmt"
    _ "github.com/go-sql-driver/mysql"
    "gopkg.in/guregu/null.v3"
    "log"
    "os"
    "time"
)

type ConnectionInfo struct {
    Username null.String `json:"username"`
    Password null.String `json:"password"`
    Host null.String `json:"host"`
    Port null.Int `json:"port"`
}

func PanicErr(err interface{}) {
    if err != nil {
        log.Fatalf("error occurred: %s", err)
    }
}

func String2Interface(str []string) []interface{} {
    results := make([]interface{}, len(str))
    for s := range str {
        results = append(results, s)
    }
    return results
}

func main() {
    args := os.Args[1:]
    if len(args) < 2 {
        log.Fatalf("usage: ./go " +
            "'{\"username\":\"root\",\"password\":\"\",\"host\":\"localhost\",\"port\":3306}' " +
            "SQL [arg1 arg2 arg3 ...]")
    }
    for _, arg := range args {
       log.Printf("%s", arg)
    }

    var connInfo ConnectionInfo
    err := json.Unmarshal([]byte(args[0]), &connInfo)
    PanicErr(err)

    if !connInfo.Host.Valid {
        PanicErr("host is required")
    } else if !connInfo.Port.Valid {
        PanicErr("port is required")
    } else if !connInfo.Username.Valid {
        PanicErr("username is required")
    }

    url := fmt.Sprintf(
        "%s:%s@tcp(%s:%d)/",
        connInfo.Username.String,
        connInfo.Password.String,
        connInfo.Host.String,
        connInfo.Port.Int64,
    )

    db, err := sql.Open("mysql", url)
    defer func() {
        err := db.Close()
        PanicErr(err)
    }()
    PanicErr(err)
    db.SetConnMaxLifetime(time.Minute * 3)
    db.SetMaxOpenConns(1)
    db.SetMaxIdleConns(1)

    rows, err := db.Query(args[1], String2Interface(args[2:])...)
    defer func() {
        err := rows.Close()
        PanicErr(err)
    }()
    PanicErr(err)

    columns, err := rows.Columns()
    PanicErr(err)

    count := len(columns)
    tableData := make([]map[string]interface{}, 0)
    values := make([]interface{}, count)
    valuePtrs := make([]interface{}, count)

    for rows.Next() {
        for i := 0; i < count; i++ {
            valuePtrs[i] = &values[i]
        }
        err := rows.Scan(valuePtrs...)
        PanicErr(err)
        entry := make(map[string]interface{})
        for i, col := range columns {
            var v interface{}
            val := values[i]
            b, ok := val.([]byte)
            if ok {
                v = string(b)
            } else {
                v = val
            }
            entry[col] = v
        }
        tableData = append(tableData, entry)
    }
    jsonData, err := json.Marshal(tableData)
    PanicErr(err)
    print(string(jsonData))
}
