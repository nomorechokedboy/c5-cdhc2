package db

import (
	"log"

	"encore.app/internal/config"
	"encore.app/internal/logger"
	_ "github.com/go-sql-driver/mysql"
	"github.com/pocketbase/dbx"
)

func New(cfg *config.DatabaseConfig) (*dbx.DB, error) {
	logger.Debug("Debug db dns", "DNS", cfg.GetDNS())
	db, err := dbx.MustOpen("mysql", cfg.GetDNS())
	if err != nil {
		return nil, err
	}
	db.LogFunc = log.Printf

	return db, nil
}
