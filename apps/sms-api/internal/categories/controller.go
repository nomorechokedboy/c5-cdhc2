package categories

import (
	"context"

	"encore.app/internal/entities"
	"encore.app/internal/mdlapi"
	"encore.app/internal/usecases"
)

type CategoryController struct {
	useCase *usecases.TeacherUseCase
}

func NewCategoryController(useCase *usecases.TeacherUseCase) *CategoryController {
	return &CategoryController{useCase: useCase}
}

// GetUserCategories returns categories where the user is assigned as teacher.
func (c *CategoryController) GetUserCategories(
	ctx context.Context,
	req *entities.GetUsersCategoriesRequest,
) (*entities.GetUsersCategoriesResponse, error) {
	mdlApiReq := &mdlapi.GetCategoriesRequest{UserID: int(req.UserId)}
	mdlApiResp, err := c.useCase.GetCategories(ctx, mdlApiReq)
	if err != nil {
		return nil, err
	}

	data := make([]entities.Category, len(mdlApiResp.Categories))
	for i, cat := range mdlApiResp.Categories {
		data[i] = *cat.ToAppCategory()
	}

	return &entities.GetUsersCategoriesResponse{Data: data}, nil
}

// GetAllCategories returns all visible Moodle categories (admin / manager).
func (c *CategoryController) GetAllCategories(
	ctx context.Context,
) (*entities.GetUsersCategoriesResponse, error) {
	mdlApiResp, err := c.useCase.GetAllCategories(ctx)
	if err != nil {
		return nil, err
	}

	data := make([]entities.Category, len(mdlApiResp.Categories))
	for i, cat := range mdlApiResp.Categories {
		data[i] = *cat.ToAppCategory()
	}

	return &entities.GetUsersCategoriesResponse{Data: data}, nil
}

// GetCategoryCoursesForAdmin returns all courses in a category (admin / manager).
func (c *CategoryController) GetCategoryCoursesForAdmin(
	ctx context.Context,
	categoryID int64,
) (*entities.GetUsersCoursesResponse, error) {
	req := &mdlapi.GetCategoryCoursesRequest{CategoryID: int(categoryID)}
	resp, err := c.useCase.GetAllCategoryCoursesForAdmin(ctx, req)
	if err != nil {
		return nil, err
	}

	data := make([]entities.Course, len(resp.Courses))
	for i, c := range resp.Courses {
		data[i] = *c.ToAppCourse()
	}

	return &entities.GetUsersCoursesResponse{Data: data}, nil
}
