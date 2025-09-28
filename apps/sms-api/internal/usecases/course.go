package usecases

import (
	"context"

	"encore.app/internal/courses"
	"encore.app/internal/entities"
	"encore.app/internal/logger"
	"encore.app/internal/mdlapi"
)

type CourseUseCase struct {
	enrolledUserProvider   mdlapi.EnrolledUserProvider
	repo                   courses.Repository
	userGradeItemsProvider mdlapi.UserGradeItemsProvider
}

func NewCourseUseCase(
	enrolledUserProvider mdlapi.EnrolledUserProvider,
	repo courses.Repository,
	userGradeItemsProvider mdlapi.UserGradeItemsProvider,
) *CourseUseCase {
	return &CourseUseCase{
		enrolledUserProvider:   enrolledUserProvider,
		repo:                   repo,
		userGradeItemsProvider: userGradeItemsProvider,
	}
}

func (uc *CourseUseCase) GetUserCourses(
	ctx context.Context,
	req *entities.GetUsersCoursesParams,
) (*entities.GetUsersCoursesResponse, error) {
	logger.InfoContext(ctx, "Processing GetUserCourses", "request", req)

	resp, err := uc.repo.Find(ctx, req)
	if err != nil {
		logger.ErrorContext(ctx, "GetUserCourses error", "err", err, "request", req)
		return nil, err
	}

	return resp, nil
}

func (uc *CourseUseCase) GetUserCourseDetails(
	ctx context.Context,
	req *entities.FindOneCourseParams,
) (*entities.GetUserCourseDetailsResponse, error) {
	logger.InfoContext(ctx, "Processing GetUserCourseDetails", "request", req)

	course, err := uc.repo.FindOne(ctx, req)
	if err != nil {
		logger.ErrorContext(ctx, "FindOneCourse error", "err", err, "request", req)
		return nil, err
	}

	enrolledUsers, err := uc.enrolledUserProvider.GetEnrolledUsers(
		ctx,
		&mdlapi.EnrolledUsersRequest{CourseId: req.Id},
	)
	if err != nil {
		logger.ErrorContext(ctx, "GetEnrolledUsers error", "err", err, "courseId", req.Id)
		return nil, err
	}

	students := make([]entities.Student, 0, len(*enrolledUsers))
	for _, enrolledUser := range *enrolledUsers {
		if !enrolledUser.IsStudent() {
			continue
		}

		student := enrolledUser.ToStudent()
		gradeItemsReq := &mdlapi.GetUserGradeItemsRequest{CourseId: req.Id, UserId: student.Id}
		gradeItemsResp, err := uc.userGradeItemsProvider.GetUserGradeItems(
			ctx,
			gradeItemsReq,
		)
		if err != nil {
			logger.ErrorContext(
				ctx,
				"GetUserGradeItems error",
				"err",
				err,
				"request",
				gradeItemsReq,
			)
			return nil, err
		}

		student.Grades = gradeItemsResp.UserGrades[0].ToGrades()
		students = append(students, *student)
	}

	return &entities.GetUserCourseDetailsResponse{
		Data: entities.CourseDetails{Course: course, Students: students},
	}, nil
}
