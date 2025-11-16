package mdlapi

import (
	"context"
	"encoding/json"
	"errors"

	"encore.app/internal/logger"
)

type ExamType int

func (t *ExamType) UnmarshalJSON(data []byte) error {
	if data == nil {
		return nil
	}

	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		logger.Error("ExamType.Unmarshal error", "err", err)
		return err
	}

	switch s {
	case "15P":
		*t = Exam15M
	case "1T":
		*t = Exam45M
	case "Thi":
		*t = ExamFinal
	default:
		return errors.New("invalid GradeType: " + s)
	}

	return nil
}

func (t *ExamType) MarshalJSON() ([]byte, error) {
	return json.Marshal(t.String())
}

const (
	Exam15M ExamType = iota
	Exam45M
	ExamFinal
)

var (
	ExamTypeMap = map[ExamType]string{
		Exam15M:   "15P",
		Exam45M:   "1T",
		ExamFinal: "Thi",
	}
	ReverseExamTypeMap = map[string]ExamType{
		"15P": Exam15M,
		"1T":  Exam45M,
		"Thi": ExamFinal,
	}
	_ json.Marshaler   = (*ExamType)(nil)
	_ json.Unmarshaler = (*ExamType)(nil)
)

func (t ExamType) String() string {
	return ExamTypeMap[t]
}

type GetCourseGradesRequest struct {
	CourseId int64 `json:"courseid"`
}

type GetCourseGradesResponse struct {
	Course struct {
		ID           int    `json:"id"`
		Fullname     string `json:"fullname"`
		Shortname    string `json:"shortname"`
		IDNumber     string `json:"idnumber"`
		Visible      int    `json:"visible"`
		Summary      string `json:"summary"`
		Category     int    `json:"category"`
		StartDate    int64  `json:"startdate"`
		EndDate      int64  `json:"enddate"`
		Marker       int    `json:"marker"`
		TimeModified int64  `json:"timemodified"`
	} `json:"course"`
	Modules  []Module  `json:"modules"`
	Students []Student `json:"students"`
}

type Module struct {
	ID       int       `json:"id"`
	Cmid     int       `json:"cmid"`
	Name     string    `json:"name"`
	Type     string    `json:"type"`
	Grademin float64   `json:"grademin"`
	Grademax float64   `json:"grademax"`
	ExamType *ExamType `json:"examtype"`
}

type Student struct {
	ID        int     `json:"id"`
	Fullname  string  `json:"fullname"`
	Username  *string `json:"username"`
	Firstname string  `json:"firstname"`
	Lastname  string  `json:"lastname"`
	Email     string  `json:"email"`
	Grades    []Grade `json:"grades"`
}

type Grade struct {
	ModuleID     int       `json:"moduleid"`
	ModuleName   string    `json:"modulename"`
	Type         string    `json:"type"`
	Grade        float64   `json:"grade"`
	Weight       float64   `json:"weightraw"`
	ExamType     *ExamType `json:"examtype"`
	ItemModule   string    `json:"itemmodule"`
	ItemInstance int       `json:"iteminstance"`
	ItemNumber   int       `json:"itemnumber"`
	ActivityID   int       `json:"activityid"`
}

type LocalCourseGrades interface {
	GetCourseDetails(context.Context, *GetCourseGradesRequest) (*GetCourseGradesResponse, error)
}
