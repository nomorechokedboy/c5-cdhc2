// Package conduct stores rèn luyện (conduct) scores. They are not a Moodle
// grade: sms-api keeps one score per student and semester of a class.
package conduct

import (
	"context"
	"errors"
	"fmt"
	"math"
)

// MaxEntries caps how many scores one save may carry.
const MaxEntries = 500

// Score is a stored conduct score.
type Score struct {
	StudentID int64
	Year      int
	Semester  int
	Score     float64
}

// Entry is one requested change. A nil Score deletes the stored score.
type Entry struct {
	StudentID int64    `json:"studentId"`
	Year      int      `json:"year"`
	Semester  int      `json:"semester"`
	Score     *float64 `json:"score"`
}

// Repository keeps conduct scores per class (Moodle category).
type Repository interface {
	List(ctx context.Context, categoryID int64) ([]Score, error)
	Save(ctx context.Context, categoryID, updatedBy int64, entries []Entry) error
}

// ErrInvalid marks a request the caller can fix.
var ErrInvalid = errors.New("invalid conduct entries")

// ValidateScore accepts 0 to 10 with at most one decimal.
func ValidateScore(score float64) error {
	if math.IsNaN(score) || score < 0 || score > 10 {
		return fmt.Errorf("%w: score %v is outside 0-10", ErrInvalid, score)
	}
	if math.Abs(score*10-math.Round(score*10)) > 1e-9 {
		return fmt.Errorf("%w: score %v has more than one decimal", ErrInvalid, score)
	}
	return nil
}

// ValidateEntries checks a whole request before anything is written.
func ValidateEntries(entries []Entry) error {
	if len(entries) == 0 {
		return fmt.Errorf("%w: no entries", ErrInvalid)
	}
	if len(entries) > MaxEntries {
		return fmt.Errorf("%w: more than %d entries", ErrInvalid, MaxEntries)
	}
	for i, e := range entries {
		if e.StudentID <= 0 || e.Year < 1 || e.Semester < 1 {
			return fmt.Errorf("%w: entry %d needs a student, a year and a semester", ErrInvalid, i)
		}
		if e.Score != nil {
			if err := ValidateScore(*e.Score); err != nil {
				return fmt.Errorf("entry %d: %w", i, err)
			}
		}
	}
	return nil
}
