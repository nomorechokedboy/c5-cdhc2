package authn

import (
	"context"
	"net/http"

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
) (*entities.CallbackResponse, error) {
	resp, err := c.useCase.HandleCallback(ctx, req.State, req.Code)
	if err != nil {
		return nil, errs.WrapCode(err, errs.Internal, errs.Internal.String())
	}

	return resp, nil
}
