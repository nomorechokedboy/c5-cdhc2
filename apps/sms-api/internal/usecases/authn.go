package usecases

import (
	"context"
	"fmt"

	"encore.app/internal/entities"
	"encore.app/internal/logger"
	"encore.app/internal/oauth2"
)

type AuthnUseCase struct {
	oauth2Provider   oauth2.OAuth2Provider
	userInfoProvider oauth2.UserInfoProvider
	tokenProvider    oauth2.TokenProvider
}

func NewAuthnUseCase(
	oauth2Provider oauth2.OAuth2Provider,
	userInfoProvider oauth2.UserInfoProvider,
	tokenProvider oauth2.TokenProvider,
) *AuthnUseCase {
	return &AuthnUseCase{
		oauth2Provider:   oauth2Provider,
		userInfoProvider: userInfoProvider,
		tokenProvider:    tokenProvider,
	}
}

func (uc *AuthnUseCase) GetLoginURL(state string) string {
	return uc.oauth2Provider.GetAuthURL(state)
}

func (uc *AuthnUseCase) HandleCallback(
	ctx context.Context,
	state, code string,
) (*entities.CallbackResponse, error) {
	logger.InfoContext(ctx, "Processing OAuth2 callback", "state", state, "code", code)

	// Exchange code for token
	token, err := uc.oauth2Provider.ExchangeCodeForToken(ctx, code)
	if err != nil {
		logger.Error("Failed to exchange code for token", "err", err)
		return nil, fmt.Errorf("token exchange failed: %w", err)
	}

	// Get user info using the token
	userInfo, err := uc.userInfoProvider.GetUserInfo(ctx, token)
	if err != nil {
		logger.Error("Failed to get user info", "err", err)
		return nil, fmt.Errorf("user info retrieval failed: %w", err)
	}

	req := &entities.TokenPayload{UserID: userInfo.Id}
	resp, err := uc.tokenProvider.GenTokens(ctx, req)
	if err != nil {
		logger.ErrorContext(ctx, "Failed to generate tokens", "err", err, "request", req)
		return nil, err
	}

	return resp, nil
}
