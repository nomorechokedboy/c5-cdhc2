package mdlapi

import (
	"context"

	"encore.app/internal/entities"
)

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

type UserGradeItemsProvider interface {
	GetUserGradeItems(
		context.Context,
		*GetUserGradeItemsRequest,
	) (*GetUserGradeItemsResponse, error)
}
