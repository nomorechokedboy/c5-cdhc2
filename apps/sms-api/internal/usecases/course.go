package usecases

import (
	"context"

	"encore.app/internal/entities"
	"encore.app/internal/logger"
	"encore.app/internal/mdlapi"
)

type CourseUseCase struct {
	courseGradesProvider mdlapi.LocalCourseGrades
	userGradesProvider   mdlapi.UserGradeItemsProvider
	teacherProvider      mdlapi.LocalTeacherProvider
}

func NewCourseUseCase(
	courseGradesProvider mdlapi.LocalCourseGrades,
	UserGradeItemsProvider mdlapi.UserGradeItemsProvider,
	teacherProvider mdlapi.LocalTeacherProvider,
) *CourseUseCase {
	return &CourseUseCase{
		courseGradesProvider: courseGradesProvider,
		userGradesProvider:   UserGradeItemsProvider,
		teacherProvider:      teacherProvider,
	}
}

func (uc *CourseUseCase) GetUserCourses(
	ctx context.Context,
	req *entities.GetUsersCoursesParams,
) (*entities.GetUsersCoursesResponse, error) {
	logger.InfoContext(ctx, "Processing GetUserCourses", "request", req)
	mdlApiReq := &mdlapi.GetCategoryCoursesRequest{
		UserID: int(req.UserId),
	}

	if req.CategoryId != nil {
		mdlApiReq.CategoryID = int(*req.CategoryId)
	}

	mdlApiResp, err := uc.teacherProvider.GetCategoryCourses(ctx, mdlApiReq)
	if err != nil {
		logger.ErrorContext(ctx, "GetUserCourses usecase error", "err", err, "request", mdlApiReq)
		return nil, err
	}

	data := make([]entities.Course, len(mdlApiResp.Courses))
	for i, c := range mdlApiResp.Courses {
		data[i] = *c.ToAppCourse()
	}

	return &entities.GetUsersCoursesResponse{Data: data}, nil
}

func (uc *CourseUseCase) GetUserCourseDetails(
	ctx context.Context,
	req *entities.FindOneCourseParams,
) (*mdlapi.GetCourseGradesResponse, error) {
	logger.InfoContext(ctx, "Processing GetUserCourseDetails", "request", req)

	resp, err := uc.courseGradesProvider.GetCourseDetails(
		ctx,
		&mdlapi.GetCourseGradesRequest{CourseId: req.Id},
	)
	if err != nil {
		logger.ErrorContext(ctx, "LocalGetCourseDetails error", "err", err, "courseId", req.Id)
		return nil, err
	}

	return resp, nil
}

func (uc *CourseUseCase) UpdateCourseGrades(
	ctx context.Context,
	req *mdlapi.UpdateGradesRequest,
) (mdlapi.UpdateGradesResponse, error) {
	logger.InfoContext(ctx, "Processing UpdateCourseGrades", "request", req)

	resp, err := uc.userGradesProvider.UpdateGrades(ctx, req)
	if err != nil {
		logger.ErrorContext(ctx, "UpdateCourseGrades error", "err", err, "request", req)
		return resp, err
	}

	return resp, nil
}
