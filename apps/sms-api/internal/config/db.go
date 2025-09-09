package config

import (
	"fmt"
	"log/slog"

	"github.com/go-sql-driver/mysql"
)

type DatabaseConfig struct {
	Host     string `env:"DB_HOST" env-default:"127.0.0.1"`
	Port     string `env:"DB_PORT" env-default:"3306"`
	Name     string `env:"DB_NAME" env-default:"moodle"`
	User     string `env:"DB_USER" env-default:"bn_moodle"`
	Password string `env:"DB_PWD"  env-default:""`
}

var _ slog.LogValuer = (*DatabaseConfig)(nil)

func (c *DatabaseConfig) LogValue() slog.Value {
	return slog.GroupValue(
		slog.String("DB_HOST", generateMaskedString(c.Host)),
		slog.String("DB_USER", generateMaskedString(c.User)),
		slog.String("DB_PWD", generateMaskedString(c.Password)),
		slog.String("DB_PORT", c.Port),
		slog.String("DB_NAME", c.Name),
	)
}

func (c *DatabaseConfig) GetDNS() string {
	cfg := mysql.NewConfig()
	cfg.Addr = fmt.Sprintf("%s:%s", c.Host, c.Port)
	cfg.DBName = c.Name
	cfg.Passwd = c.Password
	cfg.User = c.User
	cfg.Net = "tcp"

	return cfg.FormatDSN()
}
