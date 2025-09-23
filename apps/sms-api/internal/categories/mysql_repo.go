package categories

import (
	"context"
	"fmt"

	"encore.app/internal/entities"
	"github.com/pocketbase/dbx"
)

type repository struct {
	db *dbx.DB
}

func NewRepository(db *dbx.DB) *repository {
	return &repository{db: db}
}

var _ Repository = (*repository)(nil)

func (r *repository) Find(
	ctx context.Context,
	req *entities.GetUsersCategoriesRequest,
) (*entities.GetUsersCategoriesResponse, error) {
	if req == nil {
		return nil, fmt.Errorf("Request is nil")
	}

	resp := make([]entities.Category, 0)
	query := r.db.WithContext(ctx).
		Select(
			"cat.id AS id",
			"cat.name AS name",
			"cat.idnumber AS idnumber",
			"cat.description AS description",
			"cat.visible AS visible",
			"cat.timemodified AS timemodified",
		).
		Distinct(true).
		From("mdl_course c").
		InnerJoin("mdl_context ctx", dbx.NewExp("ctx.instanceid = c.id AND ctx.contextlevel = 50")).
		InnerJoin("mdl_course_categories cat", dbx.NewExp("cat.id = c.category")).
		InnerJoin("mdl_role_assignments ra", dbx.NewExp("ra.contextid = ctx.id")).
		InnerJoin("mdl_role r", dbx.NewExp("r.id = ra.roleid")).
		Where(dbx.And(
			dbx.HashExp{"ra.userid": req.UserId},
			dbx.NewExp("r.archetype IN ('editingteacher', 'teacher')"),
			dbx.NewExp("c.id != 1"),
		)).
		OrderBy("cat.name")

	if err := query.All(&resp); err != nil {
		return nil, err
	}

	return &entities.GetUsersCategoriesResponse{Data: resp}, nil
}
