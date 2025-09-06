package authn

import (
	"context"
	"net/http"

	"encore.app/internal/usecases"
	"encore.dev/beta/errs"
)

type AuthnController struct {
	useCase *usecases.AuthnUseCase
}

func NewAuthnController(useCase *usecases.AuthnUseCase) *AuthnController {
	return &AuthnController{useCase: useCase}
}

func (c *AuthnController) HandleLogin(w http.ResponseWriter, req *http.Request) {
	loginURL := c.useCase.GetLoginURL("randomstate")
	http.Redirect(w, req, loginURL, http.StatusTemporaryRedirect)
}

func (c *AuthnController) HandleCallback(
	ctx context.Context,
	req *OAuth2CallbackRequest,
) (*OAuth2CallbackResponse, error) {
	userInfo, err := c.useCase.HandleCallback(ctx, req.State, req.Code)
	if err != nil {
		return nil, errs.WrapCode(err, errs.Internal, errs.Internal.String())
	}

	return &OAuth2CallbackResponse{Data: &UserInfo{
		Id:          userInfo.Id,
		Address:     userInfo.Address,
		Description: userInfo.Description,
		Email:       userInfo.Email,
		Firstname:   userInfo.Firstname,
		Idnumber:    userInfo.Idnumber,
		Lang:        userInfo.Lang,
		Lastname:    userInfo.Lastname,
		Phone1:      userInfo.Phone1,
		Username:    userInfo.Username,
	}}, nil
}
