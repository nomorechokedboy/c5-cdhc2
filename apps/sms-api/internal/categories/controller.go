package categories

import (
	"context"

	"encore.app/internal/entities"
	"encore.app/internal/logger"
)

type CategoryController struct {
	repo Repository
}

func NewCategoryController(repo Repository) *CategoryController {
	return &CategoryController{repo: repo}
}

func (c *CategoryController) GetUserCategories(
	ctx context.Context,
	req *entities.GetUsersCategoriesRequest,
) (*entities.GetUsersCategoriesResponse, error) {
	logger.InfoContext(ctx, "GetUserCategories request", "request", req)
	resp, err := c.repo.Find(ctx, req)
	if err != nil {
		logger.ErrorContext(ctx, "GetUserCategories error", "err", err, "request", req)
		return nil, err
	}

	return resp, nil
}
