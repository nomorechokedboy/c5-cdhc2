package conduct

import (
	"context"
	"time"

	"github.com/pocketbase/dbx"
)

type mysqlRepository struct {
	db *dbx.DB
}

// NewMySQLRepository returns a Repository backed by the sms_conduct table.
func NewMySQLRepository(db *dbx.DB) Repository {
	return &mysqlRepository{db: db}
}

func (r *mysqlRepository) List(ctx context.Context, categoryID int64) ([]Score, error) {
	var rows []struct {
		StudentID int64   `db:"student_id"`
		Year      int     `db:"year"`
		Semester  int     `db:"semester"`
		Score     float64 `db:"score"`
	}
	err := r.db.WithContext(ctx).
		Select("student_id", "year", "semester", "score").
		From("sms_conduct").
		Where(dbx.HashExp{"category_id": categoryID}).
		All(&rows)
	if err != nil {
		return nil, err
	}
	scores := make([]Score, len(rows))
	for i, row := range rows {
		scores[i] = Score{StudentID: row.StudentID, Year: row.Year, Semester: row.Semester, Score: row.Score}
	}
	return scores, nil
}

const upsertSQL = "INSERT INTO sms_conduct " +
	"(category_id, student_id, `year`, semester, score, updated_by, updated_at) " +
	"VALUES ({:category}, {:student}, {:year}, {:semester}, {:score}, {:by}, {:at}) " +
	"ON DUPLICATE KEY UPDATE score = VALUES(score), updated_by = VALUES(updated_by), updated_at = VALUES(updated_at)"

// Save applies every entry in one transaction: all of them or none.
func (r *mysqlRepository) Save(ctx context.Context, categoryID, updatedBy int64, entries []Entry) error {
	now := time.Now().UTC()
	return r.db.WithContext(ctx).TransactionalContext(ctx, nil, func(tx *dbx.Tx) error {
		for _, e := range entries {
			if e.Score == nil {
				_, err := tx.Delete("sms_conduct", dbx.HashExp{
					"category_id": categoryID,
					"student_id":  e.StudentID,
					"year":        e.Year,
					"semester":    e.Semester,
				}).Execute()
				if err != nil {
					return err
				}
				continue
			}
			_, err := tx.NewQuery(upsertSQL).Bind(dbx.Params{
				"category": categoryID,
				"student":  e.StudentID,
				"year":     e.Year,
				"semester": e.Semester,
				"score":    *e.Score,
				"by":       updatedBy,
				"at":       now,
			}).Execute()
			if err != nil {
				return err
			}
		}
		return nil
	})
}
