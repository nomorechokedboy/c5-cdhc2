package oauth2

import (
	"context"

	"encore.app/internal/entities"
	"encore.app/internal/mdlapi"
)

var _ UserInfoProvider = (*HTTPUserInfoProvider)(nil)

type HTTPUserInfoProvider struct {
	mdlUserInfoProvider mdlapi.LocalUserInfoProvider
}

func NewHTTPUserInfoProvider(
	mdlApiUserInfoProvider mdlapi.LocalUserInfoProvider,
) *HTTPUserInfoProvider {
	return &HTTPUserInfoProvider{mdlUserInfoProvider: mdlApiUserInfoProvider}
}

// GetUserInfo implements UserInfoProvider.
func (p *HTTPUserInfoProvider) GetUserInfo(
	ctx context.Context,
	userId int64,
) (*entities.UserInfo, error) {
	uId := int(userId)
	resp, err := p.mdlUserInfoProvider.GetUserInfo(
		ctx,
		&mdlapi.GetUserInfoRequest{UserId: &uId},
	)
	if err != nil {
		return nil, err
	}

	return &entities.UserInfo{
		Id:          int64(resp.UserID),
		Address:     "",
		Description: "",
		Email:       resp.Email,
		Firstname:   resp.FirstName,
		Idnumber:    resp.IdNumber,
		Lang:        "",
		Lastname:    resp.LastName,
		Username:    "",
		Phone1:      "",
		IsTeacher:   resp.IsTeacher,
	}, nil
}

// GetUserInfoByMdlToken implements UserInfoProvider.
func (p *HTTPUserInfoProvider) GetUserInfoByMdlToken(
	ctx context.Context,
	token string,
) (*entities.UserInfo, error) {
	resp, err := p.mdlUserInfoProvider.GetUserInfo(
		ctx,
		&mdlapi.GetUserInfoRequest{AccessToken: &token},
	)
	if err != nil {
		return nil, err
	}

	return &entities.UserInfo{
		Id:          int64(resp.UserID),
		Address:     "",
		Description: "",
		Email:       resp.Email,
		Firstname:   resp.FirstName,
		Idnumber:    resp.IdNumber,
		Lang:        "",
		Lastname:    resp.LastName,
		Username:    "",
		Phone1:      "",
		IsTeacher:   resp.IsTeacher,
	}, nil
}
