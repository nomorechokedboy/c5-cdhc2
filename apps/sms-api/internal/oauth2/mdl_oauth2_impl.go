package oauth2

import (
	"context"

	"encore.app/internal/config"
	"encore.app/internal/entities"
)

var _ OAuth2Provider = (*MoodleOauth2Provider)(nil)

type MoodleOauth2Provider struct {
	config *config.Config
}

func NewMoodleOauth2Provider(cfg *config.Config) *MoodleOauth2Provider {
	return &MoodleOauth2Provider{cfg}
}

func (p *MoodleOauth2Provider) GetAuthURL(state string) string {
	oauth2Cfg := p.config.GetOauth2Config()
	return oauth2Cfg.AuthCodeURL(state)
}

func (p *MoodleOauth2Provider) ExchangeCodeForToken(
	ctx context.Context,
	code string,
) (*entities.OAuth2Token, error) {
	oauth2Cfg := p.config.GetOauth2Config()
	token, err := oauth2Cfg.Exchange(ctx, code)
	if err != nil {
		return nil, err
	}

	return &entities.OAuth2Token{
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
		ExpiresIn:    token.ExpiresIn,
	}, nil
}
