package mdlapi

import "context"

type GetUserInfoRequest struct {
	AccessToken *string `json:"accesstoken"`
	UserId      *int    `json:"userid"`
}

type GetUserInfoResponse struct {
	UserID    int    `json:"userid"`
	Username  string `json:"username"`
	FirstName string `json:"firstname"`
	LastName  string `json:"lastname"`
	Email     string `json:"email"`
	IdNumber  string `json:"idnumber"`
	Auth      string `json:"auth"`
	Suspended int    `json:"suspended"`
	Deleted   int    `json:"deleted"`
	Roles     []struct {
		Roleid     int    `json:"roleid"`
		Shortname  string `json:"shortname"`
		Name       string `json:"name"`
		Archetype  string `json:"archetype"`
		Courseid   int    `json:"courseid"`
		Coursename string `json:"coursename"`
	} `json:"roles"`
	SystemRoles []string `json:"systemroles"`
	IsTeacher   bool     `json:"isteacher"`
	IsStudent   bool     `json:"isstudent"`
}

type LocalUserInfoProvider interface {
	GetUserInfo(context.Context, *GetUserInfoRequest) (*GetUserInfoResponse, error)
}
