package mdlapi

import "context"

type GetUserInfoRequest struct {
	AccessToken *string `json:"accesstoken"`
	UserId      *int    `json:"userid"`
}

type SystemRole struct {
	Roleid    int    `json:"roleid"`
	Shortname string `json:"shortname"`
	Name      string `json:"name"`
	Archetype string `json:"archetype"`
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
	SystemRoles []SystemRole `json:"systemroles"`
	IsTeacher   bool         `json:"isteacher"`
	IsStudent   bool         `json:"isstudent"`
	// Role is the canonical application role, computed by the PHP plugin.
	// Values: "admin" | "manager" | "teacher" | "student"
	Role string `json:"role"`
}

type LocalUserInfoProvider interface {
	GetUserInfo(context.Context, *GetUserInfoRequest) (*GetUserInfoResponse, error)
}
