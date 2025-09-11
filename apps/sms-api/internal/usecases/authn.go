package usecases

import (
	"context"
	"fmt"
	"time"

	"encore.app/internal/config"
	"encore.app/internal/entities"
	"encore.app/internal/helper"
	"encore.app/internal/logger"
	"encore.app/internal/oauth2"
)

type AuthnUseCase struct {
	oauth2Provider   oauth2.OAuth2Provider
	userInfoProvider oauth2.UserInfoProvider
	tokenProvider    oauth2.TokenProvider
	tokenRepository  oauth2.Repository
	authnConfig      *config.AuthnConfig
}

func NewAuthnUseCase(
	oauth2Provider oauth2.OAuth2Provider,
	userInfoProvider oauth2.UserInfoProvider,
	tokenProvider oauth2.TokenProvider,
	tokenRepository oauth2.Repository,
	authnConfig *config.AuthnConfig,
) *AuthnUseCase {
	return &AuthnUseCase{
		oauth2Provider:   oauth2Provider,
		userInfoProvider: userInfoProvider,
		tokenProvider:    tokenProvider,
		tokenRepository:  tokenRepository,
		authnConfig:      authnConfig,
	}
}

func (uc *AuthnUseCase) setToken(ctx context.Context, req *oauth2.SaveRequest) error {
	if err := uc.tokenRepository.SetEx(ctx, req); err != nil {
		return err
	}

	return nil
}

func (uc *AuthnUseCase) setAccessToken(ctx context.Context, key string, val string) error {
	authCfg := uc.authnConfig
	req := &oauth2.SaveRequest{
		Key:        key,
		Val:        val,
		Expiration: time.Duration(authCfg.TokenExpire) * time.Minute,
	}
	if err := uc.setToken(ctx, req); err != nil {
		logger.ErrorContext(ctx, "Failed to set access token", "err", err, "request", req)
		return err
	}

	return nil
}

func (uc *AuthnUseCase) setRefreshToken(ctx context.Context, key string, val string) error {
	authCfg := uc.authnConfig
	req := &oauth2.SaveRequest{
		Key:        key,
		Val:        val,
		Expiration: time.Duration(authCfg.RefreshTokenExpire) * time.Minute,
	}
	if err := uc.setToken(ctx, req); err != nil {
		logger.ErrorContext(ctx, "Failed to set refresh token", "err", err, "request", req)
		return err
	}

	return nil
}

func (uc *AuthnUseCase) setTokens(
	ctx context.Context,
	mdlTokens *entities.OAuth2Token,
	appTokens *entities.CallbackResponse,
) error {
	if err := uc.setAccessToken(ctx, appTokens.AccessToken, mdlTokens.AccessToken); err != nil {
		return err
	}

	if err := uc.setRefreshToken(ctx, appTokens.RefreshToken, mdlTokens.RefreshToken); err != nil {
		return err
	}

	return nil
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
	userInfo, err := uc.getUserInfoByMdlToken(ctx, token.AccessToken)
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

	go func() {
		ctxWithTimeout, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := uc.setTokens(ctxWithTimeout, token, resp); err != nil {
			logger.ErrorContext(ctx, "Failed to set tokens", "err", err)
		}

		if err := uc.setAccessToken(ctxWithTimeout, string(userInfo.Id), token.AccessToken); err != nil {
			logger.ErrorContext(ctx, "Failed to setAccessToken by userId", "err", err)
		}
	}()

	return resp, nil
}

func (uc *AuthnUseCase) getUserInfoByMdlToken(
	ctx context.Context,
	accessToken string,
) (*entities.UserInfo, error) {
	return uc.userInfoProvider.GetUserInfo(ctx, accessToken)
}

func (uc *AuthnUseCase) getCacheVal(ctx context.Context, key string) (string, error) {
	return uc.tokenRepository.Get(ctx, key)
}

func (uc *AuthnUseCase) GetUserInfo(
	ctx context.Context,
	userId string,
) (*entities.UserInfo, error) {
	mdlToken, err := uc.getCacheVal(ctx, userId)
	if helper.IsKeyDoesNotExistErr(err) {
		logger.ErrorContext(ctx, "Can't get appToken from userId", "userId", userId)
		return nil, fmt.Errorf("Internal error")
	} else if err != nil {
		logger.ErrorContext(ctx, "Get cache value error", "err", err, "key", userId)
		return nil, err
	}

	userInfo, err := uc.getUserInfoByMdlToken(ctx, mdlToken)
	if err != nil {
		logger.ErrorContext(ctx, "Get UserInfo by mdl token error", "err", err, "token", mdlToken)
		return nil, err
	}

	return userInfo, nil
}

func (uc *AuthnUseCase) VerifyAccessToken(
	ctx context.Context,
	token string,
) (*entities.TokenPayload, error) {
	payload, err := uc.tokenProvider.Verify(
		ctx,
		&oauth2.VerifyRequest{TokenStr: token, Secret: uc.authnConfig.JWTSecret},
	)
	if err != nil {
		logger.ErrorContext(ctx, "Failed to verify access token", "err", err, "token", token)
		return nil, err
	}

	return payload, nil
}

func (uc *AuthnUseCase) VerifyRefreshToken(
	ctx context.Context,
	token string,
) (*entities.TokenPayload, error) {
	payload, err := uc.tokenProvider.Verify(
		ctx,
		&oauth2.VerifyRequest{TokenStr: token, Secret: uc.authnConfig.JWTRefreshToken},
	)
	if err != nil {
		logger.ErrorContext(ctx, "Failed to verify refresh token", "err", err, "token", token)
		return nil, err
	}

	return payload, nil
}
