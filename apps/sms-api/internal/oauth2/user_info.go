package oauth2

import (
	"context"

	"encore.app/internal/entities"
)

type UserInfoProvider interface {
	GetUserInfoByMdlToken(context.Context, string) (*entities.UserInfo, error)
	GetUserInfo(context.Context, int64) (*entities.UserInfo, error)
}
