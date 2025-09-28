package mdlapi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"encore.app/internal/config"
)

type moodleHttpClient struct {
	client  *http.Client
	baseURL string
	token   string
}

var _ MoodleApi = (*moodleHttpClient)(nil)

func New(cfg *config.MoodleApiConfig) *moodleHttpClient {
	return &moodleHttpClient{
		client:  &http.Client{Timeout: 10 * time.Second},
		baseURL: cfg.Url,
		token:   cfg.ApiToken,
	}
}

func (m *moodleHttpClient) Do(ctx context.Context, fn string, payload any, output any) error {
	url := fmt.Sprintf("%s/webservice/restful/server.php/%s", m.baseURL, fn)
	client := http.Client{Timeout: 10 * time.Second}

	// Encode request body
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(body))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", m.token)

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("bad status: %s, body: %s", resp.Status, b)
	}

	return json.NewDecoder(resp.Body).Decode(output)
}
