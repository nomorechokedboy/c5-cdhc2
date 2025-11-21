package entities

type GetStudentGradesRequest struct {
	UserID int
}

type GetStudentGradesResponse struct {
	UserID    int    `json:"userid"`
	Username  string `json:"username"`
	FirstName string `json:"firstname"`
	LastName  string `json:"lastname"`
	Email     string `json:"email"`
	Courses   []struct {
		CourseID   int     `json:"courseid"`
		CourseName string  `json:"coursename"`
		ShortName  string  `json:"shortname"`
		Visible    int     `json:"visible"`
		Grades     []Grade `json:"grades"`
	} `json:"courses"`
}

type Grade struct {
	ActivityID   int     `json:"activityid"`
	ExamType     string  `json:"examtype"`
	Grade        float64 `json:"grade"`
	ItemInstance int     `json:"iteminstance"`
	ItemModule   string  `json:"itemmodule"`
	ItemNumber   int     `json:"itemnumber"`
	ModuleID     int     `json:"moduleid"`
	ModuleName   string  `json:"modulename"`
}
