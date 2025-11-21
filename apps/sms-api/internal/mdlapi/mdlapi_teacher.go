package mdlapi

import "context"

var _ LocalTeacherProvider = (*mdlApiTeacherProvider)(nil)

type mdlApiTeacherProvider struct {
	mdlApi MoodleApi
}

func NewLocalTeacherProvider(mdlApi MoodleApi) *mdlApiTeacherProvider {
	return &mdlApiTeacherProvider{mdlApi: mdlApi}
}

// GetCategories implements LocalTeacherProvider.
func (p *mdlApiTeacherProvider) GetCategories(
	ctx context.Context,
	req *GetCategoriesRequest,
) (*GetCategoriesResponse, error) {
	resp := &GetCategoriesResponse{}
	if err := p.mdlApi.Do(ctx, GET_CATEGORIES, req, resp); err != nil {
		return nil, err
	}

	return resp, nil
}

// GetCategoryCourses implements LocalTeacherProvider.
func (p *mdlApiTeacherProvider) GetCategoryCourses(
	ctx context.Context,
	req *GetCategoryCoursesRequest,
) (*GetCategoryCoursesResponse, error) {
	resp := &GetCategoryCoursesResponse{}
	if err := p.mdlApi.Do(ctx, GET_CATEGORY_COURSES, req, resp); err != nil {
		return nil, err
	}

	return resp, nil
}
