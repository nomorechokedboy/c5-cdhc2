package mdlapi

import (
	"context"

	"encore.app/internal/entities"
)

type GetCategoriesRequest struct {
	UserID int `json:"userid"`
}

type Category struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Parent      int    `json:"parent"`
	ParentName  string `json:"parentname"`
	Path        string `json:"path"`
	Depth       int    `json:"depth"`
	Visible     int    `json:"visible"`
	SortOrder   int    `json:"sortorder"`
	CourseCount int    `json:"coursecount"`
	CourseIds   []int  `json:"courseids"`
	IdNumber    string `json:"idnumber"`
}

func (c *Category) ToAppCategory() *entities.Category {
	return &entities.Category{
		Id:           int64(c.ID),
		Name:         c.Name,
		Idnumber:     &c.IdNumber,
		Description:  &c.Description,
		Visible:      c.Visible == 1,
		TimeModified: 0,
	}
}

type GetCategoriesResponse struct {
	Userid          int        `json:"userid"`
	Username        string     `json:"username"`
	Firstname       string     `json:"firstname"`
	Lastname        string     `json:"lastname"`
	Email           string     `json:"email"`
	Totalcategories int        `json:"totalcategories"`
	Categories      []Category `json:"categories"`
}

type GetCategoryCoursesRequest struct {
	CategoryID int `json:"categoryid"`
	UserID     int `json:"userid"`
}

type CourseMetadata struct {
	Name  string `json:"name"`
	Value int    `json:"value"`
}

type CategoryCourse struct {
	ID              int              `json:"id"`
	Fullname        string           `json:"fullname"`
	Shortname       string           `json:"shortname"`
	Idnumber        string           `json:"idnumber"`
	Summary         string           `json:"summary"`
	Visible         int              `json:"visible"`
	Startdate       int              `json:"startdate"`
	Enddate         int              `json:"enddate"`
	Categoryid      int              `json:"categoryid"`
	Categoryname    string           `json:"categoryname"`
	Categorypath    string           `json:"categorypath"`
	Categoryvisible int              `json:"categoryvisible"`
	Metadata        []CourseMetadata `json:"metadata"`
}

func (c *CategoryCourse) ToAppCourse() *entities.Course {
	return &entities.Course{
		ID:           c.ID,
		Shortname:    c.Shortname,
		Fullname:     c.Fullname,
		IDNumber:     c.Idnumber,
		Visible:      c.Visible,
		Summary:      c.Summary,
		Category:     c.Categoryid,
		StartDate:    int64(c.Startdate),
		EndDate:      int64(c.Enddate),
		TimeModified: 0,
	}
}

type GetCategoryCoursesResponse struct {
	Userid       int              `json:"userid"`
	Username     string           `json:"username"`
	Firstname    string           `json:"firstname"`
	Lastname     string           `json:"lastname"`
	Email        string           `json:"email"`
	Totalcourses int              `json:"totalcourses"`
	Courses      []CategoryCourse `json:"courses"`
}

type LocalTeacherProvider interface {
	GetCategories(context.Context, *GetCategoriesRequest) (*GetCategoriesResponse, error)
	GetCategoryCourses(
		context.Context,
		*GetCategoryCoursesRequest,
	) (*GetCategoryCoursesResponse, error)
}
