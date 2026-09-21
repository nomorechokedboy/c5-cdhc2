package mdlapi

import (
	"encoding/json"
	"testing"
)

func TestGradeIsGraded(t *testing.T) {
	one, zero := 1, 0
	cases := []struct {
		name  string
		grade Grade
		want  bool
	}{
		{"flag says graded, even with a zero", Grade{Grade: 0, Graded: &one}, true},
		{"flag says blank, even with a value", Grade{Grade: 7, Graded: &zero}, false},
		{"old plugin, non-zero grade", Grade{Grade: 6.5}, true},
		{"old plugin, zero grade reads as blank", Grade{Grade: 0}, false},
	}
	for _, c := range cases {
		if got := c.grade.IsGraded(); got != c.want {
			t.Errorf("%s: IsGraded() = %v, want %v", c.name, got, c.want)
		}
	}
}

func TestCourseGradesResponseReadsNewFields(t *testing.T) {
	body := `{"students":[{"id":5,"fullname":"An","username":"an","idnumber":"2301010001",
		"grades":[{"moduleid":9,"grade":0,"graded":0,"examtype":"Thi"}]}]}`
	var resp GetCourseGradesResponse
	if err := json.Unmarshal([]byte(body), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	st := resp.Students[0]
	if st.IDNumber != "2301010001" {
		t.Fatalf("idnumber = %q", st.IDNumber)
	}
	if st.Grades[0].IsGraded() {
		t.Fatal("a blank Thi grade must not read as graded")
	}
}
