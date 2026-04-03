package authn

import (
	"sync"

	"encore.app/internal/cache"
	"encore.app/internal/categories"
	"encore.app/internal/config"
	"encore.app/internal/controllers"
	"encore.app/internal/mdlapi"
	"encore.app/internal/oauth2"
	"encore.app/internal/pool"
	"encore.app/internal/usecases"
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
	userController     *controllers.UserController
	exportController   *controllers.ExportController

	mu sync.RWMutex
}

func NewContainer() *Container {
	cfg := config.GetConfig()

	rdb := cache.New(&cfg.CacheConfig)
	tokenRepo := oauth2.NewOauth2Repository(rdb)

	mdlApi := mdlapi.New(&cfg.MoodleApiConfig)

	courseGradesProvider   := mdlapi.NewLocalCourseGradesProvider(mdlApi)
	userGradeItemsProvider := mdlapi.NewMdlApiUserGradeItemsProvider(mdlApi)
	teacherProvider        := mdlapi.NewLocalTeacherProvider(mdlApi)
	localUserInfoProvider  := mdlapi.NewLocalUserInfoProvider(mdlApi)
	exportProvider         := mdlapi.NewMdlApiExportProvider(mdlApi)

	oauth2Provider   := oauth2.NewMoodleOauth2Provider(cfg)
	userInfoProvider := oauth2.NewHTTPUserInfoProvider(localUserInfoProvider)
	tokenProvider    := oauth2.NewAppTokenProvider(&cfg.AuthnConfig)

	useCase := usecases.NewAuthnUseCase(
		oauth2Provider,
		userInfoProvider,
		tokenProvider,
		tokenRepo,
		&cfg.AuthnConfig,
	)

	p := pool.New(nil)
	p.Start()

	courseUseCase       := usecases.NewCourseUseCase(courseGradesProvider, userGradeItemsProvider, teacherProvider)
	studentGradeUseCase := usecases.NewStudentGradeUseCase(userGradeItemsProvider)
	teacherUseCase      := usecases.NewTeacherUseCase(teacherProvider)
	exportUseCase       := usecases.NewExportUseCase(exportProvider)

	controller         := NewAuthnController(useCase)
	courseController   := controllers.NewCourseController(courseUseCase)
	categoryController := categories.NewCategoryController(teacherUseCase)
	userController     := controllers.NewUserController(studentGradeUseCase)
	exportController   := controllers.NewExportController(exportUseCase)

	return &Container{
		config:             cfg,
		oauth2Provider:     oauth2Provider,
		userInfoProvider:   userInfoProvider,
		controller:         controller,
		courseController:   courseController,
		categoryController: categoryController,
		userController:     userController,
		exportController:   exportController,
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

func (c *Container) GetUserController() *controllers.UserController {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.userController
}

func (c *Container) GetExportController() *controllers.ExportController {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.exportController
}

func GetContainer() *Container {
	return container
}
