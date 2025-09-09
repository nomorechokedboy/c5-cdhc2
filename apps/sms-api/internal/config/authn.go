package config

import "log/slog"

type AuthnConfig struct {
	JWTRefreshToken    string `env:"JWT_REFRESH_SECRET"   env-default:"refresh-secret"`
	JWTSecret          string `env:"JWT_SECRET"           env-default:"token-secret"`
	TokenExpire        int    `env:"TOKEN_EXPIRE"         env-default:"30"`
	RefreshTokenExpire int    `env:"REFRESH_TOKEN_EXPIRE" env-default:"84"`
}

var _ slog.LogValuer = (*AuthnConfig)(nil)

func (c *AuthnConfig) LogValue() slog.Value {
	return slog.GroupValue(
		slog.String("JWT_REFRESH_SECRET", generateMaskedString(c.JWTRefreshToken)),
		slog.String("JWT_SECRET", generateMaskedString(c.JWTSecret)),
		slog.Int("TOKEN_EXPIRE", c.TokenExpire),
		slog.Int("REFRESH_TOKEN_EXPIRE", c.RefreshTokenExpire),
	)
}
