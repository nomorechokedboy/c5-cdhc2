package classreport

import (
	"context"
	"database/sql"

	"github.com/pocketbase/dbx"
)

type mysqlClassResolver struct {
	db *dbx.DB
}

// NewClassResolver finds a student's class from their Moodle enrolments: the
// lowest category id among the courses they are actively enrolled in.
func NewClassResolver(db *dbx.DB) ClassResolver {
	return &mysqlClassResolver{db: db}
}

const classOfSQL = "SELECT MIN(c.category) " +
	"FROM mdl_user_enrolments ue " +
	"JOIN mdl_enrol e ON e.id = ue.enrolid " +
	"JOIN mdl_course c ON c.id = e.courseid " +
	"WHERE ue.userid = {:user} AND ue.status = 0 AND c.id <> 1"

func (r *mysqlClassResolver) ClassOf(ctx context.Context, userID int64) (int, error) {
	var category sql.NullInt64
	err := r.db.WithContext(ctx).NewQuery(classOfSQL).Bind(dbx.Params{"user": userID}).Row(&category)
	if err != nil {
		return 0, err
	}
	if !category.Valid {
		return 0, ErrNotFound
	}
	return int(category.Int64), nil
}
