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
	for i, c := range mdlApiResp.Categories {
		data[i] = *c.ToAppCategory()
	}

	return &entities.GetUsersCategoriesResponse{Data: data}, nil
}
