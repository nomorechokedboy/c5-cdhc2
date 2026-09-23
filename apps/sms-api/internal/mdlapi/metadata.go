package mdlapi

import (
	"encoding/json"
	"strconv"
	"strings"
)

// UnmarshalJSON reads the "value" of a course custom field leniently. Moodle
// sends it as a number, a numeric string, an empty string (field not set on the
// course) or null. A number becomes Value; anything else leaves Value at 0, so
// one course with an empty field cannot fail the whole category response.
func (m *CourseMetadata) UnmarshalJSON(data []byte) error {
	var raw struct {
		Name  string          `json:"name"`
		Value json.RawMessage `json:"value"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	m.Name = raw.Name
	m.Value = 0

	s := strings.Trim(strings.TrimSpace(string(raw.Value)), `"`)
	if s == "" || s == "null" {
		return nil
	}
	if f, err := strconv.ParseFloat(s, 64); err == nil {
		m.Value = int(f)
	}
	return nil
}
