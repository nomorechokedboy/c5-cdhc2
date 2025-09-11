package authn

import (
	"context"
	"fmt"

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

func (c *AuthnController) HandleGetUserInfo(
	ctx context.Context,
	userId string,
) (*entities.UserInfo, error) {
	return c.useCase.GetUserInfo(ctx, userId)
}

func (c *AuthnController) VerifyAccessToken(
	ctx context.Context,
	token string,
) (*entities.TokenPayload, error) {
	return c.useCase.VerifyAccessToken(ctx, token)
}

func (c *AuthnController) HandleRefreshToken(
	ctx context.Context,
	token string,
) (*entities.CallbackResponse, error) {
	return c.useCase.RefreshToken(ctx, token)
}
