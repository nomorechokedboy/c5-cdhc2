package mdlapi

import (
	"context"

	"encore.app/internal/entities"
)

type EnrolledUser struct {
	ID                int64  `json:"id"`
	Username          string `json:"username"`
	Firstname         string `json:"firstname"`
	Lastname          string `json:"lastname"`
	Fullname          string `json:"fullname"`
	Email             string `json:"email"`
	Department        string `json:"department"`
	Firstaccess       int64  `json:"firstaccess"`
	Lastaccess        int64  `json:"lastaccess"`
	Lastcourseaccess  int64  `json:"lastcourseaccess"`
	Description       string `json:"description"`
	Descriptionformat int    `json:"descriptionformat"`
	City              string `json:"city"`
	Country           string `json:"country"`
	ProfileImageSmall string `json:"profileimageurlsmall"`
	ProfileImage      string `json:"profileimageurl"`
	Roles             []struct {
		RoleID    int    `json:"roleid"`
		Name      string `json:"name"`
		Shortname string `json:"shortname"`
		Sortorder int    `json:"sortorder"`
	} `json:"roles"`
}

func (u *EnrolledUser) IsStudent() bool {
	for _, role := range u.Roles {
		// default student role id will be 5
		if role.RoleID == 5 || role.Shortname == "student" {
			return true
		}
	}

	return false
}

func (u *EnrolledUser) ToStudent() *entities.Student {
	return &entities.Student{
		Email:     u.Email,
		Firstname: u.Firstname,
		Fullname:  u.Fullname,
		Id:        u.ID,
		Lastname:  u.Lastname,
		Username:  u.Username,
	}
}

type EnrolledUsersRequest struct {
	CourseId int64 `json:"courseid"`
}

type EnrolledUsersResponse []EnrolledUser

type EnrolledUserProvider interface {
	GetEnrolledUsers(context.Context, *EnrolledUsersRequest) (*EnrolledUsersResponse, error)
}
