package config

import (
	"fmt"
	"log/slog"
)

type Oauth2Config struct {
	ClientId     string `env:"CLIENT_ID"     json:"client_id"`
	ClientSecret string `env:"CLIENT_SECRET" json:"client_secret"`
	OriginUrl    string `env:"ORIGIN_URL"    json:"origin_url"`
}

var _ slog.LogValuer = (*Oauth2Config)(nil)

func (c *Oauth2Config) LogValue() slog.Value {
	return slog.GroupValue(
		slog.String("db_url", fmt.Sprintf("**%s**", c.ClientSecret)),
	)
}
