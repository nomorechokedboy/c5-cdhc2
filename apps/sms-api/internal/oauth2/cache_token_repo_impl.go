package oauth2

import (
	"context"

	"encore.app/internal/logger"
	"github.com/redis/go-redis/v9"
)

type redisTokenRepository struct {
	rdb *redis.Client
}

var _ Repository = (*redisTokenRepository)(nil)

func (r *redisTokenRepository) SetEx(ctx context.Context, req *SaveRequest) error {
	if err := r.rdb.SetEx(ctx, req.Key, req.Val, req.Expiration).Err(); err != nil {
		logger.ErrorContext(ctx, "RedisTokenRepository.SetEx error", "err", err, "request", req)
		return err
	}

	return nil
}

func (r *redisTokenRepository) Get(ctx context.Context, key string) (string, error) {
	val, err := r.rdb.Get(ctx, key).Result()
	if err != nil {
		logger.ErrorContext(ctx, "RedisTokenRepository.Get error", "err", err, "key", key)
		return "", err
	}

	return val, nil
}

func NewOauth2Repository(rdb *redis.Client) *redisTokenRepository {
	return &redisTokenRepository{rdb: rdb}
}
