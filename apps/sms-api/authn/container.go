package authn

import (
	"log"

	"encore.app/internal/authtokens"
	"encore.app/internal/config"
	"encore.app/internal/db"
	"encore.app/internal/logger"
	"encore.app/internal/oauth2"
	"encore.app/internal/usecases"
	"encore.app/internal/users"
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
	db, err := db.New(&cfg.DatabaseConfig)
	if err != nil {
		logger.Error("Init db error", "err", err)
		log.Fatal(err)
	}

	mdlUserRepo := users.NewRepo(db)
	mdlAuthToken := authtokens.NewRepo(db)

	oauth2Provider := oauth2.NewMoodleOauth2Provider(cfg)
	userInfoProvider := oauth2.NewDBUserInfoProvider(mdlUserRepo, mdlAuthToken)
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
