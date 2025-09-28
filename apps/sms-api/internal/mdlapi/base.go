package mdlapi

import "context"

type MoodleApi interface {
	Do(ctx context.Context, fn string, payload any, output any) error
}
