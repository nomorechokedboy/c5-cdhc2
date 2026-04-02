package entities

type OAuth2Token struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

// UserRole is the canonical role for a user in the SMS application.
// Priority order (highest to lowest): admin > manager > teacher > student
type UserRole = string

const (
	RoleAdmin   UserRole = "admin"
	RoleManager UserRole = "manager"
	RoleTeacher UserRole = "teacher"
	RoleStudent UserRole = "student"
)

type UserInfo struct {
	Id          int64    `json:"id"`
	Address     string   `json:"address"`
	Description string   `json:"description"`
	Email       string   `json:"email"`
	Firstname   string   `json:"firstname"`
	Idnumber    string   `json:"idnumber"`
	Lang        string   `json:"lang"`
	Lastname    string   `json:"lastname"`
	Phone1      string   `json:"phone1"`
	Username    string   `json:"username"`
	Role        UserRole `json:"role"`
}

type MoodleOauth2AccessToken struct {
	ID          int64  `json:"id"           db:"id"`
	AccessToken string `json:"access_token" db:"access_token"`
	ClientID    string `json:"client_id"    db:"client_id"`
	UserID      int64  `json:"user_id"      db:"user_id"`
	Expires     int64  `json:"expires"      db:"expires"`
	Scope       string `json:"scope"        db:"scope"`
}

func (e *MoodleOauth2AccessToken) TableName() string {
	return "mdl_local_oauth2_access_token"
}

type CallbackResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

// TokenPayload is embedded in JWT claims. Role is included so that
// authorization checks in handlers don't require an extra DB/cache lookup.
type TokenPayload struct {
	UserID int64    `json:"userID"`
	Role   UserRole `json:"role"`
}

type HttpCallbackResponse struct {
	Location string `header:"Location"`
	Status   int    `                  encore:"httpstatus"`
}
