package authn

import (
	"log"

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

	mdlApi := mdlapi.New(&cfg.MoodleApiConfig)
	enrolledUserProvider := mdlapi.NewMdwlApiEnrolledUserProvider(mdlApi)
	userGradeItemsProvider := mdlapi.NewMdlApiUserGradeItemsProvider(mdlApi)
	courseUseCase := usecases.NewCourseUseCase(
		enrolledUserProvider,
		mdlCourseRepo,
		userGradeItemsProvider,
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
	return c.controller
}

func (c *Container) GetCourseController() *controllers.CourseController {
	return c.courseController
}

func (c *Container) GetCategoryController() *categories.CategoryController {
	return c.categoryController
}

func GetContainer() *Container {
	return container
}
