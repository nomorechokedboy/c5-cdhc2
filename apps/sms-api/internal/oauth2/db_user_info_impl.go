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

func (p *DBUserInfoProvider) GetUserInfo(
	ctx context.Context,
	token *entities.OAuth2Token,
) (*entities.UserInfo, error) {
	accessToken := &entities.MoodleOauth2AccessToken{AccessToken: token.AccessToken}
	if err := p.authTokenRepo.FindOne(ctx, accessToken); err != nil {
		logger.ErrorContext(
			ctx,
			"DBUserInfoProvider.GetUserInfo.FindOneAccessToken error",
			"err",
			err,
		)
		return nil, err
	}

	mdlUser := &entities.MoodleUser{ID: accessToken.UserID}
	if err := p.userRepo.FindOne(ctx, mdlUser); err != nil {
		logger.ErrorContext(
			ctx,
			"DBUserInfoProvider.GetUserInfo.FindOneMoodleUser error",
			"err",
			err,
		)
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
