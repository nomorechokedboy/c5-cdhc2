package mdlapi

import "context"

var _ LocalUserInfoProvider = (*mdlApiUserInfoProvider)(nil)

type mdlApiUserInfoProvider struct {
	mdlApi MoodleApi
}

func NewLocalUserInfoProvider(mdlApi MoodleApi) *mdlApiUserInfoProvider {
	return &mdlApiUserInfoProvider{mdlApi: mdlApi}
}

// GetUserInfo implements UserInfoProvider.
func (p *mdlApiUserInfoProvider) GetUserInfo(
	ctx context.Context,
	req *GetUserInfoRequest,
) (*GetUserInfoResponse, error) {
	resp := &GetUserInfoResponse{}
	if err := p.mdlApi.Do(ctx, GET_USER_INFO, req, resp); err != nil {
		return nil, err
	}

	return resp, nil
}
