package mdlapi

import (
	"context"
)

type GetCourseGradesRequest struct {
	CourseId int64 `json:"courseid"`
}

type GetCourseGradesResponse struct {
	Course struct {
		ID       int    `json:"id"`
		Fullname string `json:"fullname"`
	} `json:"course"`
	Modules  []Module  `json:"modules"`
	Students []Student `json:"students"`
}

type Module struct {
	ID       int     `json:"id"`
	Cmid     int     `json:"cmid"`
	Name     string  `json:"name"`
	Type     string  `json:"type"`
	Grademin float64 `json:"grademin"`
	Grademax float64 `json:"grademax"`
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
	ModuleID   int     `json:"moduleid"`
	ModuleName string  `json:"modulename"`
	Type       string  `json:"type"`
	Grade      float64 `json:"grade"`
	Weight     float64 `json:"weightraw"`
}

type LocalCourseGrades interface {
	GetCourseDetails(context.Context, *GetCourseGradesRequest) (*GetCourseGradesResponse, error)
}
