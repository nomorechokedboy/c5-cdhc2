package authn

import (
	"encore.app/internal/config"
	"encore.app/internal/oauth2"
	"encore.app/internal/usecases"
)

var container *Container

func init() {
	container = NewContainer()
}

type Container struct {
	config           *config.Config
	oauth2Provider   oauth2.OAuth2Provider
	userInfoProvider oauth2.UserInfoProvider
	controller       *AuthnController
}

func NewContainer() *Container {
	cfg := config.GetConfig()
	oauth2Provider := oauth2.NewMoodleOauth2Provider(cfg)
	userInfoProvider := oauth2.NewHTTPUserInfoProvider(cfg, nil)
	useCase := usecases.NewAuthnUseCase(oauth2Provider, userInfoProvider)
	controller := NewAuthnController(useCase)

	return &Container{
		config:           cfg,
		oauth2Provider:   oauth2Provider,
		userInfoProvider: userInfoProvider,
		controller:       controller,
	}
}

func (c *Container) GetController() *AuthnController {
	return c.controller
}
