package mdlapi

type Course struct {
	ID                       int    `json:"id"`
	Shortname                string `json:"shortname"`
	Fullname                 string `json:"fullname"`
	Displayname              string `json:"displayname"`
	EnrolledUserCount        int    `json:"enrolledusercount"`
	IDNumber                 string `json:"idnumber"`
	Visible                  int    `json:"visible"`
	Summary                  string `json:"summary"`
	SummaryFormat            int    `json:"summaryformat"`
	Format                   string `json:"format"`
	CourseImage              string `json:"courseimage"`
	ShowGrades               bool   `json:"showgrades"`
	Lang                     string `json:"lang"`
	EnableCompletion         bool   `json:"enablecompletion"`
	CompletionHasCriteria    bool   `json:"completionhascriteria"`
	CompletionUserTracked    bool   `json:"completionusertracked"`
	Category                 int    `json:"category"`
	Progress                 *int   `json:"progress"` // nullable
	Completed                bool   `json:"completed"`
	StartDate                int64  `json:"startdate"`
	EndDate                  int64  `json:"enddate"`
	Marker                   int    `json:"marker"`
	LastAccess               *int64 `json:"lastaccess"` // nullable
	IsFavourite              bool   `json:"isfavourite"`
	Hidden                   bool   `json:"hidden"`
	OverviewFiles            []any  `json:"overviewfiles"`
	ShowActivityDates        bool   `json:"showactivitydates"`
	ShowCompletionConditions bool   `json:"showcompletionconditions"`
	TimeModified             int64  `json:"timemodified"`
}

type GetUsersCoursesRequest struct {
	Userid string `json:"userid"`
}

type GetUsersCouresResponse []Course
