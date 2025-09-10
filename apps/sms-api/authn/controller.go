package authn

import (
	"context"
	"fmt"
	"net/http"

	"encore.app/internal/config"
	"encore.app/internal/entities"
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
) (*entities.HttpCallbackResponse, error) {
	resp, err := c.useCase.HandleCallback(ctx, req.State, req.Code)
	if err != nil {
		return nil, errs.WrapCode(err, errs.Internal, errs.Internal.String())
	}

	cfg := config.GetConfig()
	location := fmt.Sprintf(
		"%s/%s?accessToken=%s&refreshToken=%s",
		cfg.ClientOriginUrl,
		cfg.ClientOauth2Callback,
		resp.AccessToken,
		resp.RefreshToken,
	)
	return &entities.HttpCallbackResponse{Status: 308, Location: location}, nil
}
