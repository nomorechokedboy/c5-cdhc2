package oauth2

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"encore.app/internal/config"
	"encore.app/internal/entities"
	"encore.app/internal/logger"
	// "github.com/joshuapare/moodle-client-go/v4"
)

var _ UserInfoProvider = (*HTTPUserInfoProvider)(nil)

type HTTPUserInfoProvider struct {
	config *config.Config
	client *http.Client
}

func NewHTTPUserInfoProvider(cfg *config.Config, client *http.Client) *HTTPUserInfoProvider {
	if client == nil {
		client = &http.Client{}
	}
	return &HTTPUserInfoProvider{
		config: cfg,
		client: client,
	}
}

func (p *HTTPUserInfoProvider) GetUserInfo(
	ctx context.Context,
	token string,
) (*entities.UserInfo, error) {
	userInfoEndpoint := fmt.Sprintf(
		"%s/local/oauth2/user_info.php",
		p.config.Oauth2Config.OriginUrl,
	)

	userInfoData := url.Values{}
	userInfoData.Set("access_token", token)

	resp, err := p.client.Post(
		userInfoEndpoint,
		"application/x-www-form-urlencoded",
		strings.NewReader(userInfoData.Encode()),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to request user info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, fmt.Errorf("unauthorized access to user info endpoint")
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var userInfo entities.UserInfo
	if err := json.Unmarshal(respBody, &userInfo); err != nil {
		logger.Error("GetUserInfo.Unmarshal err", "err", err, "respBody", string(respBody))
		return nil, fmt.Errorf("failed to unmarshal user info: %w", err)
	}

	return &userInfo, nil
}
