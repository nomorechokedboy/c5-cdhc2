package helper

import "github.com/redis/go-redis/v9"

func IsKeyDoesNotExistErr(err error) bool {
	return err == redis.Nil
}
