package db

import "database/sql"

type Postgres struct {
	DB *sql.DB
}

// Connect 是数据库连接占位入口。
// 当前模块默认以内存仓储运行；当接入真实数据库时在此扩展驱动初始化。
func Connect(_ string) (*Postgres, error) {
	return &Postgres{DB: nil}, nil
}
