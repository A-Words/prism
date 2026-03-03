package db

import (
	"fmt"
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Connect 初始化 GORM 数据库连接并执行自动迁移。
// dsn 为 PostgreSQL 连接字符串，格式：postgres://user:pass@host:port/dbname?sslmode=disable
func Connect(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("连接数据库失败: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("获取底层 sql.DB 失败: %w", err)
	}

	// 连接池参数
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)

	// 自动迁移所有 GORM 模型
	if err := autoMigrate(db); err != nil {
		return nil, fmt.Errorf("数据库迁移失败: %w", err)
	}

	log.Println("数据库连接成功，迁移完成")
	return db, nil
}

// autoMigrate 执行所有表的自动迁移
func autoMigrate(db *gorm.DB) error {
	// 启用 pgvector 扩展（忽略已存在的情况）
	db.Exec("CREATE EXTENSION IF NOT EXISTS vector")

	return db.AutoMigrate(
		&KnowledgePointModel{},
		&KnowledgeDependencyModel{},
		&QuestionModel{},
		&KnowledgeMasteryModel{},
		&AssessmentSessionModel{},
		&QuestionAttemptModel{},
		&LearningPathModel{},
		&LearningPathStateModel{},
		&PathAdjustmentEventModel{},
		&HomeworkUploadModel{},
		&AssignmentModel{},
		&HealthAlertModel{},
		&StudyLogModel{},
		&ChatSessionModel{},
		&ChatMessageModel{},
		&NoteModel{},
		&NoteKnowledgeLinkModel{},
	)
}
