package config

import (
	"fmt"
	"log"
	"log/slog"
	"strings"

	"encore.app/internal/logger"
	"golang.org/x/oauth2"

	"github.com/ilyakaznacheev/cleanenv"
)

func generateMaskedString(input string) string {
	length := len(input)
	masked := strings.Repeat("*", length)
	return masked
}

const (
	DEV  = "dev"
	PROD = "prod"
)

var (
	_      slog.LogValuer = (*Config)(nil)
	config *Config
)

type Config struct {
	AuthnConfig
	CacheConfig
	DatabaseConfig
	Oauth2Config
	MoodleApiConfig
	ClientOriginUrl      string `env:"CLIENT_ORIGIN_URL"      env-default:"http://localhost:3000" json:"client_origin_url"`
	ClientOauth2Callback string `env:"CLIENT_OAUTH2_CALLBACK" env-default:"oauth2/callback"       json:"client_oauth2_callback"`
	Env                  string `env:"ENV"                    env-default:"dev"                   json:"env"`
	Port                 int    `env:"PORT"                   env-default:"4000"                  json:"port"`
	// OtelEndpoint    string `env:"OTEL_ENDPOINT" env-default:"localhost:4318" json:"otel_endpoint"`
}

func (c *Config) GetOauth2Config() oauth2.Config {
	return oauth2.Config{
		RedirectURL:  "http://localhost:4000/oauth2/callback",
		ClientID:     c.Oauth2Config.ClientId,
		ClientSecret: c.Oauth2Config.ClientSecret,
		Scopes:       []string{"user_info"},
		Endpoint: oauth2.Endpoint{
			AuthURL:  fmt.Sprintf("%s%s", c.Oauth2Config.OriginUrl, c.Oauth2Config.AuthUrl),
			TokenURL: fmt.Sprintf("%s%s", c.Oauth2Config.OriginUrl, c.Oauth2Config.TokenUrl),
		},
	}
}

func (c *Config) LogValue() slog.Value {
	return slog.GroupValue(
		slog.Int("port", c.Port),
		slog.Any("authn_config", &c.AuthnConfig),
		slog.String("client_origin_url", c.ClientOriginUrl),
		slog.Any("oauth2_cfg", &c.Oauth2Config),
		slog.String("env", c.Env),
		slog.Any("cache_config", &c.CacheConfig),
		slog.Any("db_config", &c.DatabaseConfig),
	)
}

func new() (*Config, error) {
	config := &Config{}
	if err := cleanenv.ReadEnv(config); err != nil {
		log.Fatal("ReadEnv failed: ", err)
		return nil, err
	}

	if config.Env == "dev" {
		if err := cleanenv.ReadConfig(".env", config); err != nil {
			log.Fatal("ReadConfig from .env failed: ", err)
			return nil, err
		}
	}

	return config, nil
}

func init() {
	var err error
	config, err = loadConfig()
	if err != nil {
		logger.Error("Failed to load config: ", err)
	}

	logger.Info("Init config success", "config", config)
}

// GetConfig returns the singleton instance of Config
func GetConfig() *Config {
	return config
}

func loadConfig() (*Config, error) {
	config := &Config{}
	if err := cleanenv.ReadEnv(config); err != nil {
		return nil, err
	}

	if config.Env == "dev" {
		if err := cleanenv.ReadConfig(".env", config); err != nil {
			return nil, err
		}
	}
	return config, nil
}
