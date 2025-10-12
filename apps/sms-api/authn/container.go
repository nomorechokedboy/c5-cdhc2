package authn

import (
	"log"
	"sync"

	"encore.app/internal/authtokens"
	"encore.app/internal/cache"
	"encore.app/internal/categories"
	"encore.app/internal/config"
	"encore.app/internal/controllers"
	"encore.app/internal/courses"
	"encore.app/internal/db"
	"encore.app/internal/logger"
	"encore.app/internal/mdlapi"
	"encore.app/internal/oauth2"
	"encore.app/internal/pool"
	"encore.app/internal/usecases"
	"encore.app/internal/users"
)

var container *Container

func init() {
	container = NewContainer()
}

type Container struct {
	config             *config.Config
	oauth2Provider     oauth2.OAuth2Provider
	userInfoProvider   oauth2.UserInfoProvider
	controller         *AuthnController
	courseController   *controllers.CourseController
	categoryController *categories.CategoryController

	mu sync.RWMutex
}

func NewContainer() *Container {
	cfg := config.GetConfig()
	db, err := db.New(&cfg.DatabaseConfig)
	if err != nil {
		logger.Error("Init db error", "err", err)
		log.Fatal(err)
	}

	rdb := cache.New(&cfg.CacheConfig)

	mdlUserRepo := users.NewRepo(db)
	mdlAuthToken := authtokens.NewRepo(db)
	tokenRepo := oauth2.NewOauth2Repository(rdb)
	mdlCourseRepo := courses.NewRepository(db)
	categoryRepo := categories.NewRepository(db)

	oauth2Provider := oauth2.NewMoodleOauth2Provider(cfg)
	userInfoProvider := oauth2.NewDBUserInfoProvider(mdlUserRepo, mdlAuthToken)
	tokenProvider := oauth2.NewAppTokenProvider(&cfg.AuthnConfig)
	useCase := usecases.NewAuthnUseCase(
		oauth2Provider,
		userInfoProvider,
		tokenProvider,
		tokenRepo,
		&cfg.AuthnConfig,
	)

	p := pool.New(nil)
	p.Start()

	mdlApi := mdlapi.New(&cfg.MoodleApiConfig)
	courseGradesProvider := mdlapi.NewLocalCourseGradesProvider(mdlApi)
	courseUseCase := usecases.NewCourseUseCase(
		mdlCourseRepo,
		courseGradesProvider,
	)

	controller := NewAuthnController(useCase)
	courseController := controllers.NewCourseController(courseUseCase)
	categoryController := categories.NewCategoryController(categoryRepo)

	return &Container{
		config:             cfg,
		oauth2Provider:     oauth2Provider,
		userInfoProvider:   userInfoProvider,
		controller:         controller,
		courseController:   courseController,
		categoryController: categoryController,
	}
}

func (c *Container) GetController() *AuthnController {
	c.mu.Lock()
	defer c.mu.Unlock()

	return c.controller
}

func (c *Container) GetCourseController() *controllers.CourseController {
	c.mu.Lock()
	defer c.mu.Unlock()

	return c.courseController
}

func (c *Container) GetCategoryController() *categories.CategoryController {
	c.mu.Lock()
	defer c.mu.Unlock()

	return c.categoryController
}

func GetContainer() *Container {
	return container
}
