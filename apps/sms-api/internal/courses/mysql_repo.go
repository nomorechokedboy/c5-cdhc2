package courses

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
	req *entities.GetUsersCoursesParams,
) (*entities.GetUsersCoursesResponse, error) {
	if req == nil {
		return nil, fmt.Errorf("Request is nil")
	}

	resp := make([]entities.Course, 0)
	query := r.db.WithContext(ctx).
		Select(
			"c.id AS id",
			"c.shortname AS shortname",
			"c.fullname AS fullname",
			"c.idnumber AS idnumber",
			"c.visible AS visible",
			"c.summary AS summary",
			"c.summaryformat AS summaryformat",
			"c.format AS format",
			"c.showgrades AS showgrades",
			"c.lang AS lang",
			"c.enablecompletion AS enablecompletion",
			"c.category AS category",
			"c.startdate AS startdate",
			"c.enddate AS enddate",
			"c.marker AS marker",
			"c.timemodified AS timemodified",
		).
		Distinct(true).
		From("mdl_course c").
		InnerJoin("mdl_context ctx", dbx.NewExp("ctx.instanceid = c.id AND ctx.contextlevel = 50")).
		InnerJoin("mdl_role_assignments ra", dbx.NewExp("ra.contextid = ctx.id")).
		InnerJoin("mdl_role r", dbx.NewExp("r.id = ra.roleid")).
		Where(dbx.And(
			dbx.HashExp{"ra.userid": req.UserId},
			dbx.HashExp{"c.category": req.CategoryId},
			dbx.NewExp("r.archetype IN ('editingteacher', 'teacher')"),
			dbx.NewExp("c.id != 1"),
		)).
		OrderBy("c.fullname")

	if err := query.All(&resp); err != nil {
		return nil, err
	}

	return &entities.GetUsersCoursesResponse{Data: resp}, nil
}
