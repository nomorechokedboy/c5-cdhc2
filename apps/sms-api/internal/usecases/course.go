package usecases

import (
	"context"
	"fmt"

	"encore.app/internal/courses"
	"encore.app/internal/entities"
	"encore.app/internal/logger"
	"encore.app/internal/mdlapi"
	"encore.app/internal/pool"
)

type CourseUseCase struct {
	enrolledUserProvider   mdlapi.EnrolledUserProvider
	repo                   courses.Repository
	userGradeItemsProvider mdlapi.UserGradeItemsProvider
	pool                   *pool.Pool
}

func NewCourseUseCase(
	enrolledUserProvider mdlapi.EnrolledUserProvider,
	repo courses.Repository,
	userGradeItemsProvider mdlapi.UserGradeItemsProvider,
	pool *pool.Pool,
) *CourseUseCase {
	return &CourseUseCase{
		enrolledUserProvider:   enrolledUserProvider,
		repo:                   repo,
		userGradeItemsProvider: userGradeItemsProvider,
		pool:                   pool,
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

	students := make([]*entities.Student, 0, len(*enrolledUsers))
	for _, enrolledUser := range *enrolledUsers {
		if !enrolledUser.IsStudent() {
			continue
		}
		student := enrolledUser.ToStudent()
		students = append(students, student)
	}

	if len(students) == 0 {
		// No students to process
		return &entities.GetUserCourseDetailsResponse{
			Data: entities.CourseDetails{Course: course, Students: []*entities.Student{}},
		}, nil
	}

	if err := uc.fetchGradeItemsWithBatch(ctx, students, req.Id); err != nil {
		logger.ErrorContext(ctx, "Failed to fetch grade items concurrently", "err", err)
		return nil, err
	}

	studentsResult := make([]entities.Student, len(students))
	for i, student := range students {
		studentsResult[i] = *student
	}

	return &entities.GetUserCourseDetailsResponse{
		Data: entities.CourseDetails{Course: course, Students: students},
	}, nil
}

func (uc *CourseUseCase) fetchGradeItemsWithBatch(
	ctx context.Context,
	students []*entities.Student,
	courseId int64,
) error {
	// Create tasks for all students
	tasks := make([]pool.Task, len(students))
	for i, student := range students {
		tasks[i] = &gradeItemTask{
			StudentIndex: i,
			Student:      student,
			CourseId:     courseId,
			Provider:     uc.userGradeItemsProvider,
		}
	}

	// Submit batch and wait for all to complete
	batchResult := uc.pool.SubmitBatch(tasks)

	// Check for errors
	for i, err := range batchResult.Errors {
		if err != nil {
			logger.ErrorContext(
				ctx,
				"GetUserGradeItems batch error",
				"err", err,
				"studentId", students[i].Id,
				"courseId", courseId,
			)
			return fmt.Errorf("failed to fetch grade items for student %v: %w", students[i].Id, err)
		}
	}

	// Check task execution errors
	for i, result := range batchResult.Results {
		if result.Error != nil {
			logger.ErrorContext(
				ctx,
				"GetUserGradeItems execution error",
				"err", result.Error,
				"studentId", students[i].Id,
				"courseId", courseId,
			)
			return fmt.Errorf(
				"failed to execute grade item task for student %v: %w",
				students[i].Id,
				result.Error,
			)
		}
	}

	return nil
}

type gradeItemTask struct {
	StudentIndex int
	Student      *entities.Student
	CourseId     int64
	Provider     mdlapi.UserGradeItemsProvider
}

var _ pool.Task = (*gradeItemTask)(nil)

// gradeItemResult holds the result of a grade item fetch operation
type gradeItemResult struct {
	StudentIndex int
	Student      *entities.Student
	Err          error
}

func (t *gradeItemTask) Execute(ctx context.Context) error {
	gradeItemsReq := &mdlapi.GetUserGradeItemsRequest{
		CourseId: t.CourseId,
		UserId:   t.Student.Id,
	}
	logger.InfoContext(
		ctx,
		"GetUserGradeItems for student",
		"studentName",
		t.Student.Fullname,
		"request",
		gradeItemsReq,
	)

	gradeItemsResp, err := t.Provider.GetUserGradeItems(ctx, gradeItemsReq)
	if err != nil {
		return fmt.Errorf("failed to get grade items for user %v: %w", t.Student.Id, err)
	}

	// Update the student with grades
	if len(gradeItemsResp.UserGrades) > 0 {
		t.Student.Grades = gradeItemsResp.UserGrades[0].ToGrades()
	}

	return nil
}
