package entities

type Course struct {
	ID           int    `json:"id"`
	Shortname    string `json:"shortname"`
	Fullname     string `json:"fullname"`
	IDNumber     string `json:"idnumber"`
	Visible      int    `json:"visible"`
	Summary      string `json:"summary"`
	Category     int    `json:"category"`
	StartDate    int64  `json:"startdate"`
	EndDate      int64  `json:"enddate"`
	TimeModified int64  `json:"timemodified"`
}

type GetUsersCoursesParams struct {
	CategoryId *int64
	UserId     int64
}

type FindOneCourseParams struct {
	Id     int64
	UserId int64
}

type GetUsersCoursesRequest struct {
	// CategoryId int64 `query:"categoryId"`
}

type GetUsersCoursesResponse struct {
	Data []Course
}

type CourseDetails struct {
	*Course       `json:"course"`
	Students      []*Student      `json:"students"`
	GradedModules []*GradedModule `json:"gradedModules"`
}

type GradedModule struct {
	Id       int64   `json:"id"`
	Weighted float64 `json:"weighted"`
	Module   string  `json:"module"`
	Type     string  `json:"type"`
	Name     string  `json:"name"`
}

type Student struct {
	Id        int64   `json:"id"`
	Username  string  `json:"username"`
	Firstname string  `json:"firstname"`
	Lastname  string  `json:"lastname"`
	Fullname  string  `json:"fullname"`
	Email     string  `json:"email"`
	Grades    []Grade `json:"grades"`
}

type Grade struct {
	Id          int64    `json:"id"`
	Name        *string  `json:"name"`
	Type        string   `json:"type"`
	Module      *string  `json:"module"`
	GradeRaw    *float64 `json:"gradeRaw"`
	SubmittedAt *int64   `json:"submittedAt"`
	GradedAt    *int64   `json:"gradedAt"`
	WeightedRaw float64  `json:"weightedRaw"`
}

type GetUserCourseDetailsResponse struct {
	Data CourseDetails
}

type UpdateCourseGradesResponse struct {
	Data string `json:"data"`
}
