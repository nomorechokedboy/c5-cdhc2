package entities

type Course struct {
	ID               int    `json:"id"`
	Shortname        string `json:"shortname"`
	Fullname         string `json:"fullname"`
	IDNumber         string `json:"idnumber"`
	Visible          int    `json:"visible"`
	Summary          string `json:"summary"`
	SummaryFormat    int    `json:"summaryformat"`
	Format           string `json:"format"`
	ShowGrades       bool   `json:"showgrades"`
	Lang             string `json:"lang"`
	EnableCompletion bool   `json:"enablecompletion"`
	Category         int    `json:"category"`
	StartDate        int64  `json:"startdate"`
	EndDate          int64  `json:"enddate"`
	Marker           int    `json:"marker"`
	TimeModified     int64  `json:"timemodified"`
}

type GetUsersCoursesRequest struct {
	UserId int64
}

type GetUsersCoursesResponse struct {
	Data []Course
}
