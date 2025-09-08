package config

import (
	"fmt"

	"github.com/go-sql-driver/mysql"
)

type DatabaseConfig struct {
	Host     string `env:"DB_HOST" env-default:"localhost"`
	Port     string `env:"DB_PORT" env-default:"3007"`
	Name     string `env:"DB_NAME" env-default:"moodle"`
	User     string `env:"DB_USER" env-default:"bn_moodle"`
	Password string `env:"DB_PWD"  env-default:""`
}

func (c *DatabaseConfig) GetDNS() string {
	cfg := mysql.NewConfig()
	cfg.Addr = fmt.Sprintf("%s:%s", c.Host, c.Port)
	cfg.DBName = c.Name
	cfg.Passwd = c.Password
	cfg.User = c.User

	return cfg.FormatDSN()
}
