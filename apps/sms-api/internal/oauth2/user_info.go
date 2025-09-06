package oauth2

import (
	"context"

	"encore.app/internal/entities"
)

type UserInfoProvider interface {
	GetUserInfo(ctx context.Context, token *entities.OAuth2Token) (*entities.UserInfo, error)
}
