package entities

type Category struct {
	Id           int64   `json:"id"`
	Name         string  `json:"name"`
	Idnumber     *string `json:"idnumber"`
	Description  *string `json:"description"`
	Visible      bool    `json:"visible"`
	TimeModified int64   `json:"timemodified"`
}

func (e *Category) TableName() string {
	return "mdl_course_categories"
}

type GetUsersCategoriesRequest struct {
	UserId int64
}

type GetUsersCategoriesResponse struct {
	Data []Category
}
