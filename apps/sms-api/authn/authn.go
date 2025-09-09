package authn

import (
	"context"
	"net/http"

	"encore.app/internal/entities"
)

// Oauth2 login endpoint
//
//encore:api public raw method=GET path=/login
func OAuth2Login(w http.ResponseWriter, req *http.Request) {
	container.GetController().HandleLogin(w, req)
}

type Response struct {
	Message string
}

type OAuth2CallbackRequest struct {
	State string `json:"state" query:"state"`
	Code  string `json:"code"  query:"code"`
}

type UserInfo struct {
	Id          int64  `json:"id"`
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

// Oauth2 callback endpoint
//
//encore:api public method=GET path=/oauth2/callback
func OAuth2Callback(
	ctx context.Context,
	req *OAuth2CallbackRequest,
) (*entities.CallbackResponse, error) {
	return container.GetController().HandleCallback(ctx, req)
}
