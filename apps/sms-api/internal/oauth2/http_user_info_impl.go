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

func mapRole(resp *mdlapi.GetUserInfoResponse) entities.UserRole {
	// The PHP plugin computes the canonical role; use it directly.
	// Fall back to inferring from IsTeacher for backward compatibility
	// with older plugin versions that don't yet return "role".
	if resp.Role != "" {
		return resp.Role
	}
	if resp.IsTeacher {
		return entities.RoleTeacher
	}
	return entities.RoleStudent
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
		Id:        int64(resp.UserID),
		Email:     resp.Email,
		Firstname: resp.FirstName,
		Idnumber:  resp.IdNumber,
		Lastname:  resp.LastName,
		Role:      mapRole(resp),
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
		Id:        int64(resp.UserID),
		Email:     resp.Email,
		Firstname: resp.FirstName,
		Idnumber:  resp.IdNumber,
		Lastname:  resp.LastName,
		Role:      mapRole(resp),
	}, nil
}
