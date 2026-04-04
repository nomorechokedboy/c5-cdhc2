package entities

type Category struct {
	Id           int64   `json:"id"`
	Name         string  `json:"name"`
	Idnumber     *string `json:"idnumber"`
	Description  *string `json:"description"`
	Parent       int64   `json:"parent"`
	Visible      bool    `json:"visible"`
	TimeModified int64   `json:"timemodified"`
}

func (e *Category) TableName() string {
	return "mdl_course_categories"
}

type GetUsersCategoriesRequest struct {
	UserId int64 `json:"userId"`
}

type GetUsersCategoriesResponse struct {
	Data []Category `json:"data"`
}
