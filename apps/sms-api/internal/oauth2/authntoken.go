package oauth2

import (
	"context"
	"time"

	"encore.app/internal/config"
	"encore.app/internal/entities"
	"encore.app/internal/helper"
	"encore.app/internal/logger"
	"github.com/golang-jwt/jwt/v5"
)

type appTokenProvider struct {
	authnConfig *config.AuthnConfig
}

type AppClaims struct {
	*entities.TokenPayload
	jwt.RegisteredClaims
}

var _ TokenProvider = (*appTokenProvider)(nil)

func (a *appTokenProvider) genToken(
	claims *AppClaims,
	jwtSecret []byte,
) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		return "", err
	}
	return tokenString, nil
}

func (a *appTokenProvider) genAccessToken(payload *entities.TokenPayload) (string, error) {
	authConfig := a.authnConfig
	accessTokenClaims := &AppClaims{
		payload,
		jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(
				time.Now().Add(time.Duration(authConfig.TokenExpire) * time.Hour),
			),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "sms-api",
			Subject:   string(payload.UserID),
			ID:        helper.UUIDStr(),
			Audience:  []string{"sms-web"},
		},
	}

	return a.genToken(accessTokenClaims, []byte(authConfig.JWTSecret))
}

func (a *appTokenProvider) genRefreshToken(payload *entities.TokenPayload) (string, error) {
	authConfig := a.authnConfig
	refreshTokenClaims := &AppClaims{
		payload,
		jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(
				time.Now().Add(time.Duration(authConfig.RefreshTokenExpire) * time.Hour),
			),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "sms-api",
			Subject:   string(payload.UserID),
			ID:        helper.UUIDStr(),
			Audience:  []string{"sms-web"},
		},
	}

	return a.genToken(refreshTokenClaims, []byte(authConfig.JWTRefreshToken))
}

func (a *appTokenProvider) GenTokens(
	ctx context.Context,
	req *entities.TokenPayload,
) (*entities.CallbackResponse, error) {
	accessToken, err := a.genAccessToken(req)
	if err != nil {
		logger.ErrorContext(ctx, "AppTokenProvider.genAccessToken error", "err", err)
		return nil, err
	}

	refreshToken, err := a.genRefreshToken(req)
	if err != nil {
		logger.ErrorContext(ctx, "AppTokenProvider.genRefreshToken error", "err", err)
		return nil, err
	}

	return &entities.CallbackResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func NewAppTokenProvider(authnConfig *config.AuthnConfig) *appTokenProvider {
	return &appTokenProvider{authnConfig: authnConfig}
}
