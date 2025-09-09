package helper

import "github.com/google/uuid"

func UUIDStr() string {
	uuid := uuid.New()

	return uuid.String()
}
