package mdlapi

import (
	"context"
	"encoding/json"
	"fmt"

	"encore.app/internal/entities"
	"encore.app/internal/logger"
)

var _ json.Unmarshaler = (*UpdateGradesResponse)(nil)

type GetUserGradeItemsResponse struct {
	UserGrades []UserGrade `json:"usergrades"`
	Warnings   []any       `json:"warnings"`
}

type UserGrade struct {
	CourseID       int         `json:"courseid"`
	CourseIDNumber string      `json:"courseidnumber"`
	UserID         int         `json:"userid"`
	UserFullName   string      `json:"userfullname"`
	UserIDNumber   string      `json:"useridnumber"`
	MaxDepth       int         `json:"maxdepth"`
	GradeItems     []GradeItem `json:"gradeitems"`
}

func (e *UserGrade) ToGrades() []entities.Grade {
	grades := make([]entities.Grade, len(e.GradeItems))
	for i, gradeItem := range e.GradeItems {
		if gradeItem.ItemType == "course" {
			continue
		}

		grades[i] = *gradeItem.ToGrade()
	}

	return grades
}

type GradeItem struct {
	ID                  int      `json:"id"`
	ItemName            *string  `json:"itemname"` // nullable
	ItemType            string   `json:"itemtype"`
	ItemModule          *string  `json:"itemmodule"` // nullable
	ItemInstance        int      `json:"iteminstance"`
	ItemNumber          *int     `json:"itemnumber"` // nullable
	IDNumber            *string  `json:"idnumber"`   // nullable
	CategoryID          *int     `json:"categoryid"` // nullable
	OutcomeID           *int     `json:"outcomeid"`  // nullable
	ScaleID             *int     `json:"scaleid"`    // nullable
	Locked              bool     `json:"locked"`
	CMID                *int     `json:"cmid"` // nullable
	WeightedRaw         float64  `json:"weightedraw"`
	GradeRaw            *float64 `json:"graderaw"`           // nullable
	GradeDateSubmitted  *int64   `json:"gradedatesubmitted"` // nullable (timestamp)
	GradeDateGraded     *int64   `json:"gradedategraded"`    // nullable (timestamp)
	GradeHiddenByDate   bool     `json:"gradehiddenbydate"`
	GradeNeedsUpdate    bool     `json:"gradeneedsupdate"`
	GradeIsHidden       bool     `json:"gradeishidden"`
	GradeIsLocked       bool     `json:"gradeislocked"`
	GradeIsOverridden   bool     `json:"gradeisoverridden"`
	GradeFormatted      string   `json:"gradeformatted"`
	GradeMin            float64  `json:"grademin"`
	GradeMax            float64  `json:"grademax"`
	RangeFormatted      string   `json:"rangeformatted"`
	PercentageFormatted string   `json:"percentageformatted"`
	Feedback            string   `json:"feedback"`
	FeedbackFormat      int      `json:"feedbackformat"`
}

func (g *GradeItem) ToGrade() *entities.Grade {
	return &entities.Grade{
		Id:          int64(g.ID),
		Name:        g.ItemName,
		Type:        g.ItemType,
		Module:      g.ItemModule,
		GradeRaw:    g.GradeRaw,
		SubmittedAt: g.GradeDateSubmitted,
		GradedAt:    g.GradeDateGraded,
		WeightedRaw: g.WeightedRaw,
	}
}

type GetUserGradeItemsRequest struct {
	CourseId int64 `json:"courseid"`
	UserId   int64 `json:"userid"`
}

type UpdateGradesRequest struct {
	Source     GradeSource    `json:"source"`
	CourseID   int            `json:"courseid"`
	Component  GradeComponent `json:"component"`
	ActivityID int            `json:"activityid"`
	ItemNumber int            `json:"itemnumber"`
	Grades     []UpdateGrade  `json:"grades"`
}

type UpdateGrade struct {
	StudentID int     `json:"studentid"`
	Grade     float64 `json:"grade"`
}

type UpdateGradesResponse bool

// UnmarshalJSON implements json.Unmarshaler.
func (u *UpdateGradesResponse) UnmarshalJSON(data []byte) error {
	if data == nil {
		return nil
	}

	var s int
	if err := json.Unmarshal(data, &s); err != nil {
		logger.Error("UpdateGradesResponse.Unmarshal error", "err", err)
		return err
	}

	if s != 0 && s != 1 {
		logger.Error("UpdateGradesResponse invalid response", "response", s)
		return fmt.Errorf("Invalid update grades response")
	}

	if s == 0 {
		*u = true
		return nil
	}

	*u = false
	return nil
}

type UserGradeItemsProvider interface {
	GetUserGradeItems(
		context.Context,
		*GetUserGradeItemsRequest,
	) (*GetUserGradeItemsResponse, error)
	UpdateGrades(context.Context, *UpdateGradesRequest) (UpdateGradesResponse, error)
}
