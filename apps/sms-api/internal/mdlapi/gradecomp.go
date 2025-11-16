package mdlapi

import (
	"encoding/json"
	"fmt"

	"encore.app/internal/logger"
)

const (
	GradeComponentAssign      GradeComponent = "mod_assign"
	GradeComponentBook        GradeComponent = "mod_book"
	GradeComponentChoice      GradeComponent = "mod_choice"
	GradeComponentData        GradeComponent = "mod_data"
	GradeComponentFeedback    GradeComponent = "mod_feedback"
	GradeComponentFolder      GradeComponent = "mod_folder"
	GradeComponentForum       GradeComponent = "mod_forum"
	GradeComponentGlossary    GradeComponent = "mod_glossary"
	GradeComponentH5PActivity GradeComponent = "mod_h5pactivity"
	GradeComponentIMSCP       GradeComponent = "mod_imscp"
	GradeComponentLabel       GradeComponent = "mod_label"
	GradeComponentLesson      GradeComponent = "mod_lesson"
	GradeComponentLTI         GradeComponent = "mod_lti"
	GradeComponentPage        GradeComponent = "mod_page"
	GradeComponentQBank       GradeComponent = "mod_qbank"
	GradeComponentQuiz        GradeComponent = "mod_quiz"
	GradeComponentResource    GradeComponent = "mod_resource"
	GradeComponentSCORM       GradeComponent = "mod_scorm"
	GradeComponentSubsection  GradeComponent = "mod_subsection"
	GradeComponentURL         GradeComponent = "mod_url"
	GradeComponentWiki        GradeComponent = "mod_wiki"
	GradeComponentWorkshop    GradeComponent = "mod_workshop"
)

var _ json.Unmarshaler = (*GradeComponent)(nil)

// GradeComponent represents the component parameter for grade_update (format: "mod_{module}")
type GradeComponent string

// UnmarshalJSON implements the json.Unmarshaler interface
func (c *GradeComponent) UnmarshalJSON(data []byte) error {
	if data == nil {
		return nil
	}

	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		logger.Error("GradeComponent.Unmarshal error", "err", err)
		return err
	}

	// Validate that the value is a valid GradeComponent
	comp := GradeComponent(s)
	if !comp.IsValid() {
		return fmt.Errorf("invalid GradeComponent value: %s", s)
	}

	*c = comp
	return nil
}

// IsValid checks if the GradeComponent is a valid enum value
func (c GradeComponent) IsValid() bool {
	switch c {
	case GradeComponentAssign,
		GradeComponentBook,
		GradeComponentChoice,
		GradeComponentData,
		GradeComponentFeedback,
		GradeComponentFolder,
		GradeComponentForum,
		GradeComponentGlossary,
		GradeComponentH5PActivity,
		GradeComponentIMSCP,
		GradeComponentLabel,
		GradeComponentLesson,
		GradeComponentLTI,
		GradeComponentPage,
		GradeComponentQBank,
		GradeComponentQuiz,
		GradeComponentResource,
		GradeComponentSCORM,
		GradeComponentSubsection,
		GradeComponentURL,
		GradeComponentWiki,
		GradeComponentWorkshop:
		return true
	default:
		return false
	}
}

// String returns the string representation of the GradeComponent
func (c GradeComponent) String() string {
	return string(c)
}

// ToSource converts a GradeComponent to its corresponding GradeSource
func (c GradeComponent) ToSource() GradeSource {
	switch c {
	case GradeComponentAssign:
		return GradeSourceAssign
	case GradeComponentBook:
		return GradeSourceBook
	case GradeComponentChoice:
		return GradeSourceChoice
	case GradeComponentData:
		return GradeSourceData
	case GradeComponentFeedback:
		return GradeSourceFeedback
	case GradeComponentFolder:
		return GradeSourceFolder
	case GradeComponentForum:
		return GradeSourceForum
	case GradeComponentGlossary:
		return GradeSourceGlossary
	case GradeComponentH5PActivity:
		return GradeSourceH5PActivity
	case GradeComponentIMSCP:
		return GradeSourceIMSCP
	case GradeComponentLabel:
		return GradeSourceLabel
	case GradeComponentLesson:
		return GradeSourceLesson
	case GradeComponentLTI:
		return GradeSourceLTI
	case GradeComponentPage:
		return GradeSourcePage
	case GradeComponentQBank:
		return GradeSourceQBank
	case GradeComponentQuiz:
		return GradeSourceQuiz
	case GradeComponentResource:
		return GradeSourceResource
	case GradeComponentSCORM:
		return GradeSourceSCORM
	case GradeComponentSubsection:
		return GradeSourceSubsection
	case GradeComponentURL:
		return GradeSourceURL
	case GradeComponentWiki:
		return GradeSourceWiki
	case GradeComponentWorkshop:
		return GradeSourceWorkshop
	default:
		return ""
	}
}
