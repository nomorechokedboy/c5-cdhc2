package entities

type OAuth2Token struct {
	AccessToken string `json:"access_token"`
}

type UserInfo struct {
	Id          string `json:"id"`
	Address     string `json:"address"`
	Description string `json:"description"`
	Email       string `json:"email"`
	Firstname   string `json:"firstname"`
	Idnumber    string `json:"idnumber"`
	Lang        string `json:"lang"`
	Lastname    string `json:"lastname"`
	Phone1      string `json:"phone1"`
	Username    string `json:"username"`
}
