package oauth2

import (
	"context"
	"errors"
	"fmt"
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

func (a *appTokenProvider) Verify(
	ctx context.Context,
	req *VerifyRequest,
) (*entities.TokenPayload, error) {
	token, err := jwt.ParseWithClaims(
		req.TokenStr,
		&AppClaims{},
		func(token *jwt.Token) (any, error) {
			return []byte(req.Secret), nil
		},
	)
	if err != nil {
		logger.ErrorContext(ctx, "Verify token error", "err", err)
	}

	switch {
	case token.Valid:
		if claims, ok := token.Claims.(*AppClaims); ok {
			return claims.TokenPayload, nil
		}

		return nil, fmt.Errorf("Token is not AppToken")
	case errors.Is(err, jwt.ErrTokenMalformed):
		return nil, fmt.Errorf("Token is malformed")
	case errors.Is(err, jwt.ErrTokenSignatureInvalid):
		return nil, fmt.Errorf("Error token signature is invalid")
	case errors.Is(err, jwt.ErrTokenExpired) || errors.Is(err, jwt.ErrTokenNotValidYet):
		return nil, fmt.Errorf("Token is expired")
	default:
		return nil, fmt.Errorf("Couldn't handle this token")
	}
}

func NewAppTokenProvider(authnConfig *config.AuthnConfig) *appTokenProvider {
	return &appTokenProvider{authnConfig: authnConfig}
}
