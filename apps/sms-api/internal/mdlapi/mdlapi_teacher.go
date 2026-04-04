package mdlapi

import "context"

var _ LocalTeacherProvider = (*mdlApiTeacherProvider)(nil)

type mdlApiTeacherProvider struct {
	mdlApi MoodleApi
}

func NewLocalTeacherProvider(mdlApi MoodleApi) *mdlApiTeacherProvider {
	return &mdlApiTeacherProvider{mdlApi: mdlApi}
}

// GetCategories returns categories where the user is a teacher (role_assignments).
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

// GetCategoryCourses returns courses in a category where the user is a teacher.
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

// GetAllCategories returns ALL visible categories (admin / manager use).
func (p *mdlApiTeacherProvider) GetAllCategories(
	ctx context.Context,
	req *GetAllCategoriesRequest,
) (*GetCategoriesResponse, error) {
	resp := &GetCategoriesResponse{}
	if err := p.mdlApi.Do(ctx, GET_ALL_CATEGORIES, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

// GetAllCategoryCoursesForAdmin returns all courses in a category (admin / manager use).
func (p *mdlApiTeacherProvider) GetAllCategoryCoursesForAdmin(
	ctx context.Context,
	req *GetCategoryCoursesRequest,
) (*GetCategoryCoursesResponse, error) {
	resp := &GetCategoryCoursesResponse{}
	if err := p.mdlApi.Do(ctx, GET_ALL_CATEGORY_COURSES, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}
