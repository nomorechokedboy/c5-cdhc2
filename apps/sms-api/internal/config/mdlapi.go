package config

import "log/slog"

type MoodleApiConfig struct {
	Url      string `env:"MOODLE_URL"       env-default:"http://localhost:8083"`
	ApiToken string `env:"MOODLE_API_TOKEN" env-default:"4734d29fb1f9ca155217041ca581db0d"`
}

var _ slog.LogValuer = (*MoodleApiConfig)(nil)

func (c *MoodleApiConfig) LogValue() slog.Value {
	return slog.GroupValue(
		slog.String("MOODLE_URL", c.Url),
		slog.String("MOODLE_API_TOKEN", generateMaskedString(c.ApiToken)),
	)
}
