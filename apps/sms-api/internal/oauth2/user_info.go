package oauth2

import (
	"context"

	"encore.app/internal/entities"
)

type UserInfoProvider interface {
	GetUserInfo(context.Context, string) (*entities.UserInfo, error)
}
