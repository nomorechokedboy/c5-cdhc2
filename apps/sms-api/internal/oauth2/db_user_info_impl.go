package oauth2

import (
	"context"

	"encore.app/internal/authtokens"
	"encore.app/internal/entities"
	"encore.app/internal/logger"
	"encore.app/internal/users"
)

type DBUserInfoProvider struct {
	userRepo      users.Repository
	authTokenRepo authtokens.Repository
}

var _ UserInfoProvider = (*DBUserInfoProvider)(nil)

// NOTE: The DB provider reads from Moodle's database directly and does not
// have access to the role-computation logic in the PHP plugin. It defaults
// to RoleStudent. Prefer HTTPUserInfoProvider for accurate role data.
func (p *DBUserInfoProvider) GetUserInfoByMdlToken(
	ctx context.Context,
	token string,
) (*entities.UserInfo, error) {
	accessToken := &entities.MoodleOauth2AccessToken{AccessToken: token}
	if err := p.authTokenRepo.FindOne(ctx, accessToken); err != nil {
		logger.ErrorContext(
			ctx,
			"DBUserInfoProvider.GetUserInfoByMdlToken.FindOneAccessToken error",
			"err",
			err,
		)
		return nil, err
	}

	mdlUser := &entities.MoodleUser{ID: accessToken.UserID}
	if err := p.userRepo.FindOne(ctx, mdlUser); err != nil {
		logger.ErrorContext(ctx, "DBUserInfoProvider.GetUserInfoByMdlToken.FindOneMoodleUser error",
			"err", err)
		return nil, err
	}

	userInfo := &entities.UserInfo{
		Id:        mdlUser.ID,
		Address:   mdlUser.Address,
		Email:     mdlUser.Email,
		Firstname: mdlUser.FirstName,
		Idnumber:  mdlUser.IDNumber,
		Lang:      mdlUser.Lang,
		Lastname:  mdlUser.LastName,
		Phone1:    mdlUser.Phone1,
		Username:  mdlUser.Username,
		Role:      entities.RoleStudent,
	}
	if mdlUser.Description != nil {
		userInfo.Description = *mdlUser.Description
	}

	return userInfo, nil
}

func (p *DBUserInfoProvider) GetUserInfo(
	ctx context.Context,
	userId int64,
) (*entities.UserInfo, error) {
	mdlUser := &entities.MoodleUser{ID: userId}
	if err := p.userRepo.FindOne(ctx, mdlUser); err != nil {
		logger.ErrorContext(ctx, "DBUserInfoProvider.GetUserInfo.FindOneMoodleUser error",
			"err", err)
		return nil, err
	}

	userInfo := &entities.UserInfo{
		Id:        mdlUser.ID,
		Address:   mdlUser.Address,
		Email:     mdlUser.Email,
		Firstname: mdlUser.FirstName,
		Idnumber:  mdlUser.IDNumber,
		Lang:      mdlUser.Lang,
		Lastname:  mdlUser.LastName,
		Phone1:    mdlUser.Phone1,
		Username:  mdlUser.Username,
		Role:      entities.RoleStudent,
	}
	if mdlUser.Description != nil {
		userInfo.Description = *mdlUser.Description
	}

	return userInfo, nil
}

func NewDBUserInfoProvider(
	userRepo users.Repository,
	authTokenRepo authtokens.Repository,
) *DBUserInfoProvider {
	return &DBUserInfoProvider{userRepo: userRepo, authTokenRepo: authTokenRepo}
}
