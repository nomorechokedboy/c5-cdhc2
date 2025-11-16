package mdlapi

import (
	"encoding/json"
	"fmt"

	"encore.app/internal/logger"
)

var _ json.Unmarshaler = (*GradeSource)(nil)

// GradeSource represents the source parameter for grade_update (format: "mod/{module}")
type GradeSource string

// UnmarshalJSON implements the json.Unmarshaler interface
func (s *GradeSource) UnmarshalJSON(data []byte) error {
	if data == nil {
		return nil
	}

	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		logger.Error("GradeSource.Unmarshal error", "err", err)
		return err
	}

	// Validate that the value is a valid GradeSource
	source := GradeSource(str)
	if !source.IsValid() {
		return fmt.Errorf("invalid GradeSource value: %s", str)
	}

	*s = source
	return nil
}

func (s GradeSource) IsValid() bool {
	switch s {
	case GradeSourceAssign,
		GradeSourceBook,
		GradeSourceChoice,
		GradeSourceData,
		GradeSourceFeedback,
		GradeSourceFolder,
		GradeSourceForum,
		GradeSourceGlossary,
		GradeSourceH5PActivity,
		GradeSourceIMSCP,
		GradeSourceLabel,
		GradeSourceLesson,
		GradeSourceLTI,
		GradeSourcePage,
		GradeSourceQBank,
		GradeSourceQuiz,
		GradeSourceResource,
		GradeSourceSCORM,
		GradeSourceSubsection,
		GradeSourceURL,
		GradeSourceWiki,
		GradeSourceWorkshop:
		return true
	default:
		return false
	}
}

// ToComponent converts a GradeSource to its corresponding GradeComponent
func (s GradeSource) ToComponent() GradeComponent {
	switch s {
	case GradeSourceAssign:
		return GradeComponentAssign
	case GradeSourceBook:
		return GradeComponentBook
	case GradeSourceChoice:
		return GradeComponentChoice
	case GradeSourceData:
		return GradeComponentData
	case GradeSourceFeedback:
		return GradeComponentFeedback
	case GradeSourceFolder:
		return GradeComponentFolder
	case GradeSourceForum:
		return GradeComponentForum
	case GradeSourceGlossary:
		return GradeComponentGlossary
	case GradeSourceH5PActivity:
		return GradeComponentH5PActivity
	case GradeSourceIMSCP:
		return GradeComponentIMSCP
	case GradeSourceLabel:
		return GradeComponentLabel
	case GradeSourceLesson:
		return GradeComponentLesson
	case GradeSourceLTI:
		return GradeComponentLTI
	case GradeSourcePage:
		return GradeComponentPage
	case GradeSourceQBank:
		return GradeComponentQBank
	case GradeSourceQuiz:
		return GradeComponentQuiz
	case GradeSourceResource:
		return GradeComponentResource
	case GradeSourceSCORM:
		return GradeComponentSCORM
	case GradeSourceSubsection:
		return GradeComponentSubsection
	case GradeSourceURL:
		return GradeComponentURL
	case GradeSourceWiki:
		return GradeComponentWiki
	case GradeSourceWorkshop:
		return GradeComponentWorkshop
	default:
		return ""
	}
}

const (
	GradeSourceAssign      GradeSource = "mod/assign"
	GradeSourceBook        GradeSource = "mod/book"
	GradeSourceChoice      GradeSource = "mod/choice"
	GradeSourceData        GradeSource = "mod/data"
	GradeSourceFeedback    GradeSource = "mod/feedback"
	GradeSourceFolder      GradeSource = "mod/folder"
	GradeSourceForum       GradeSource = "mod/forum"
	GradeSourceGlossary    GradeSource = "mod/glossary"
	GradeSourceH5PActivity GradeSource = "mod/h5pactivity"
	GradeSourceIMSCP       GradeSource = "mod/imscp"
	GradeSourceLabel       GradeSource = "mod/label"
	GradeSourceLesson      GradeSource = "mod/lesson"
	GradeSourceLTI         GradeSource = "mod/lti"
	GradeSourcePage        GradeSource = "mod/page"
	GradeSourceQBank       GradeSource = "mod/qbank"
	GradeSourceQuiz        GradeSource = "mod/quiz"
	GradeSourceResource    GradeSource = "mod/resource"
	GradeSourceSCORM       GradeSource = "mod/scorm"
	GradeSourceSubsection  GradeSource = "mod/subsection"
	GradeSourceURL         GradeSource = "mod/url"
	GradeSourceWiki        GradeSource = "mod/wiki"
	GradeSourceWorkshop    GradeSource = "mod/workshop"
)

// String returns the string representation of the GradeSource
func (s GradeSource) String() string {
	return string(s)
}

// GradableModules returns a list of modules that typically support grading
// Note: Not all modules in this list necessarily have grades (e.g., label, folder)
func GradableModules() []GradeSource {
	return []GradeSource{
		GradeSourceAssign,
		GradeSourceQuiz,
		GradeSourceLesson,
		GradeSourceWorkshop,
		GradeSourceSCORM,
		GradeSourceForum,
		GradeSourceGlossary,
		GradeSourceH5PActivity,
		GradeSourceData,
		GradeSourceChoice,
		GradeSourceLTI,
	}
}
