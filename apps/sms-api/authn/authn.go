package authn

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"encore.app/internal/config"
	"encore.dev/beta/errs"
	"encore.dev/rlog"
)

// Oauth2 login endpoint
//
//encore:api public raw method=GET path=/login
func Oauth2Login(w http.ResponseWriter, req *http.Request) {
	oauth2Cfg := config.GetConfig().GetOauth2Config()
	url := oauth2Cfg.AuthCodeURL("randomstate")
	http.Redirect(w, req, url, http.StatusTemporaryRedirect)
}

type Response struct {
	Message string
}

type Oauth2CallbackRequest struct {
	State string `json:"state" query:"state"`
	Code  string `json:"code"  query:"code"`
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

type Oauth2CallbackResponse struct {
	Data *UserInfo `json:"data"`
}

// Oauth2 callback endpoint
//
//encore:api public method=GET path=/oauth2/callback
func Oauth2Callback(
	ctx context.Context,
	req *Oauth2CallbackRequest,
) (*Oauth2CallbackResponse, error) {
	rlog.Info("Oauth2Callback request", "req", req)

	cfg := config.GetConfig()
	oauth2Cfg := cfg.GetOauth2Config()
	token, err := oauth2Cfg.Exchange(ctx, req.Code)
	if err != nil {
		rlog.Error("Oauth2Callback.Exchange err", "err", err)
		return nil, errs.WrapCode(err, errs.Internal, errs.Internal.String(), "token", token)
	}

	userInfoReq, userInfoEndpoint := map[string]string{
		"access_token": token.AccessToken,
	}, fmt.Sprintf("%s/local/oauth/user_info.php", cfg.Oauth2Config.OriginUrl)
	userInfoReqStr, err := json.Marshal(userInfoReq)
	if err != nil {
		rlog.Error("Oauth2Callback.Marshal err", "err", err)
		return nil, errs.WrapCode(
			err,
			errs.Internal,
			errs.Internal.String(),
			"userInfoReq",
			userInfoReq,
		)
	}

	userInfoData := url.Values{}
	userInfoData.Set("access_token", token.AccessToken)
	rlog.Info("Oauth2Callback.Post request", "userInfoReq", userInfoReq)
	resp, err := http.Post(
		userInfoEndpoint,
		"application/x-www-form-urlencoded",
		strings.NewReader(userInfoData.Encode()),
	)
	if err != nil {
		rlog.Error("Oauth2Callback.GetUserInfo err", "err", err)
		return nil, errs.WrapCode(
			err,
			errs.Internal,
			errs.Internal.String(),
			"userInfoReq",
			string(userInfoReqStr),
		)
	}

	if resp.StatusCode == http.StatusUnauthorized {
		rlog.Error("Oauth2Callback.GetUserInfo unauthenticated")
		return nil, &errs.Error{Code: errs.Internal, Message: errs.Internal.String()}
	}

	respStr, err := io.ReadAll(resp.Body)
	if err != nil {
		rlog.Error("Oauth2Callback.ReadAll err", "err", err)
		return nil, errs.WrapCode(err, errs.Internal, errs.Internal.String())
	}

	userInfoResp := &UserInfo{}
	if err := json.Unmarshal(respStr, userInfoResp); err != nil {
		rlog.Error("Oauth2Callback.Unmarshal err", "err", err)
		return nil, errs.WrapCode(
			err,
			errs.Internal,
			errs.Internal.String(),
			"resp",
			string(respStr),
		)
	}

	return &Oauth2CallbackResponse{Data: userInfoResp}, nil
}
