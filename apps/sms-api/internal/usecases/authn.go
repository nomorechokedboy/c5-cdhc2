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
}

func NewAuthnUseCase(
	oauth2Provider oauth2.OAuth2Provider,
	userInfoProvider oauth2.UserInfoProvider,
) *AuthnUseCase {
	return &AuthnUseCase{
		oauth2Provider:   oauth2Provider,
		userInfoProvider: userInfoProvider,
	}
}

func (uc *AuthnUseCase) GetLoginURL(state string) string {
	return uc.oauth2Provider.GetAuthURL(state)
}

func (uc *AuthnUseCase) HandleCallback(
	ctx context.Context,
	state, code string,
) (*entities.UserInfo, error) {
	logger.InfoContext(ctx, "Processing OAuth2 callback", "state", state, "code", code)

	// Exchange code for token
	token, err := uc.oauth2Provider.ExchangeCodeForToken(ctx, code)
	if err != nil {
		logger.Error("Failed to exchange code for token", "err", err)
		return nil, fmt.Errorf("token exchange failed: %w", err)
	}

	logger.Debug("Token", "token", token)
	// Get user info using the token
	userInfo, err := uc.userInfoProvider.GetUserInfo(ctx, token)
	if err != nil {
		logger.Error("Failed to get user info", "err", err)
		return nil, fmt.Errorf("user info retrieval failed: %w", err)
	}

	return userInfo, nil
}
