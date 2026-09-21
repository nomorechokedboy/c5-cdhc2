package mdlapi

import (
	"encoding/json"
	"testing"
)

func TestCourseMetadataValueIsLenient(t *testing.T) {
	cases := []struct {
		name string
		json string
		want int
	}{
		{"number", `{"name":"credit","value":4}`, 4},
		{"numeric string", `{"name":"credit","value":"3"}`, 3},
		{"decimal string", `{"name":"credit","value":"2.0"}`, 2},
		{"empty string", `{"name":"year","value":""}`, 0},
		{"null", `{"name":"year","value":null}`, 0},
		{"text", `{"name":"year","value":"n/a"}`, 0},
		{"missing", `{"name":"year"}`, 0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			var m CourseMetadata
			if err := json.Unmarshal([]byte(c.json), &m); err != nil {
				t.Fatalf("unmarshal: %v", err)
			}
			if m.Value != c.want {
				t.Fatalf("value = %d, want %d", m.Value, c.want)
			}
		})
	}
}

func TestCourseCategoryResponseSurvivesAnEmptyField(t *testing.T) {
	body := `{"courses":[{"id":1,"metadata":[{"name":"credit","value":3},{"name":"year","value":""}]}]}`
	var resp GetCategoryCoursesResponse
	if err := json.Unmarshal([]byte(body), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	md := resp.Courses[0].Metadata
	if len(md) != 2 || md[0].Value != 3 || md[1].Value != 0 {
		t.Fatalf("metadata = %+v", md)
	}
}
