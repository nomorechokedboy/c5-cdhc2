package oauth2

import (
	"context"
	"time"
)

type SaveRequest struct {
	Key        string
	Val        string
	Expiration time.Duration
}

type Repository interface {
	SetEx(context.Context, *SaveRequest) error
	Get(context.Context, string) (string, error)
}
