package mdlapi

import (
	"context"
	"encoding/json"
	"fmt"

	"encore.app/internal/logger"
)

var _ json.Unmarshaler = (*UpdateGradesResponse)(nil)

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

type GetUserGradesRequest struct {
	UserID int `json:"userid"`
}

type GetUserGradesResponse struct {
	UserID    int    `json:"userid"`
	Username  string `json:"username"`
	FirstName string `json:"firstname"`
	LastName  string `json:"lastname"`
	Email     string `json:"email"`
	Courses   []struct {
		CourseID   int              `json:"courseid"`
		CourseName string           `json:"coursename"`
		ShortName  string           `json:"shortname"`
		Visible    int              `json:"visible"`
		Grades     []Grade          `json:"grades"`
		Metadata   []CourseMetadata `json:"metadata"`
		Teachers   []Teacher        `json:"teachers"`
	} `json:"courses"`
}

type Teacher struct {
	ID       int    `json:"id"`
	Fullname string `json:"fullname"`
	Email    string `json:"email"`
	Picture  string `json:"picture"`
}

type UserGradeItemsProvider interface {
	UpdateGrades(context.Context, *UpdateGradesRequest) (UpdateGradesResponse, error)
	GetUserGrades(context.Context, *GetUserGradesRequest) (*GetUserGradesResponse, error)
}
