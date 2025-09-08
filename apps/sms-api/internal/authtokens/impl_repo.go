package authtokens

import (
	"context"
	"reflect"

	"encore.app/internal/entities"
	"github.com/pocketbase/dbx"
)

type repository struct {
	db *dbx.DB
}

var _ Repository = (*repository)(nil)

func (r *repository) FindOne(ctx context.Context, req *entities.MoodleOauth2AccessToken) error {
	if req == nil {
		return nil
	}

	query := r.db.WithContext(ctx).Select()
	val := reflect.ValueOf(*req)
	typ := reflect.TypeOf(*req)

	for i := 0; i < typ.NumField(); i++ {
		field := typ.Field(i)
		dbTag := field.Tag.Get("db")
		if dbTag == "" {
			continue
		}

		v := val.Field(i).Interface()
		switch v := v.(type) {
		case string:
			if v != "" {
				query.AndWhere(dbx.HashExp{dbTag: v})
			}
		case int, int8, int16, int32, int64:
			if reflect.ValueOf(v).Int() != 0 {
				query.AndWhere(dbx.HashExp{dbTag: v})
			}
		}
	}

	return query.One(req)
}

func NewRepo(db *dbx.DB) Repository {
	return &repository{db}
}
