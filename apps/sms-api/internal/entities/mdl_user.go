package entities

type MoodleUser struct {
	ID                int64   `db:"id"`
	Auth              string  `db:"auth"`
	Confirmed         *bool   `db:"confirmed"`
	PolicyAgreed      *bool   `db:"policyagreed"`
	Deleted           *bool   `db:"deleted"`
	Suspended         *bool   `db:"suspended"`
	MnetHostID        int64   `db:"mnethostid"`
	Username          string  `db:"username"`
	Password          string  `db:"password"`
	IDNumber          string  `db:"idnumber"`
	FirstName         string  `db:"firstname"`
	LastName          string  `db:"lastname"`
	Email             string  `db:"email"`
	EmailStop         *bool   `db:"emailstop"`
	Phone1            string  `db:"phone1"`
	Phone2            string  `db:"phone2"`
	Institution       string  `db:"institution"`
	Department        string  `db:"department"`
	Address           string  `db:"address"`
	City              string  `db:"city"`
	Country           string  `db:"country"`
	Lang              string  `db:"lang"`
	CalendarType      string  `db:"calendartype"`
	Theme             string  `db:"theme"`
	Timezone          string  `db:"timezone"`
	FirstAccess       int64   `db:"firstaccess"`
	LastAccess        int64   `db:"lastaccess"`
	LastLogin         int64   `db:"lastlogin"`
	CurrentLogin      int64   `db:"currentlogin"`
	LastIP            string  `db:"lastip"`
	Secret            string  `db:"secret"`
	Picture           int64   `db:"picture"`
	Description       *string `db:"description"`
	DescriptionFormat int8    `db:"descriptionformat"`
	MailFormat        *bool   `db:"mailformat"`
	MailDigest        *bool   `db:"maildigest"`
	MailDisplay       int8    `db:"maildisplay"`
	AutoSubscribe     *bool   `db:"autosubscribe"`
	TrackForums       *bool   `db:"trackforums"`
	TimeCreated       int64   `db:"timecreated"`
	TimeModified      int64   `db:"timemodified"`
	TrustBitmask      int64   `db:"trustbitmask"`
	ImageAlt          *string `db:"imagealt"`
	LastNamePhonetic  *string `db:"lastnamephonetic"`
	FirstNamePhonetic *string `db:"firstnamephonetic"`
	MiddleName        *string `db:"middlename"`
	AlternateName     *string `db:"alternatename"`
	MoodleNetProfile  *string `db:"moodlenetprofile"`
}

func (e *MoodleUser) TableName() string {
	return "mdl_user"
}
