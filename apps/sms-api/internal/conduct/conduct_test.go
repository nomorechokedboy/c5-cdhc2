package conduct

import (
	"errors"
	"testing"
)

func ptr(f float64) *float64 { return &f }

func TestValidateScore(t *testing.T) {
	ok := []float64{0, 3.5, 8, 8.5, 9.9, 10}
	for _, s := range ok {
		if err := ValidateScore(s); err != nil {
			t.Errorf("ValidateScore(%v) = %v, want nil", s, err)
		}
	}
	bad := []float64{-0.1, 10.1, 7.25, 8.05}
	for _, s := range bad {
		if err := ValidateScore(s); !errors.Is(err, ErrInvalid) {
			t.Errorf("ValidateScore(%v) = %v, want ErrInvalid", s, err)
		}
	}
}

func TestValidateEntries(t *testing.T) {
	good := []Entry{{StudentID: 1, Year: 1, Semester: 2, Score: ptr(8.5)}, {StudentID: 2, Year: 1, Semester: 2}}
	if err := ValidateEntries(good); err != nil {
		t.Fatalf("good entries: %v", err)
	}

	cases := map[string][]Entry{
		"empty":         {},
		"no student":    {{Year: 1, Semester: 1, Score: ptr(8)}},
		"no year":       {{StudentID: 1, Semester: 1, Score: ptr(8)}},
		"no semester":   {{StudentID: 1, Year: 1, Score: ptr(8)}},
		"score too big": {{StudentID: 1, Year: 1, Semester: 1, Score: ptr(11)}},
		"too many":      make([]Entry, MaxEntries+1),
	}
	for name, entries := range cases {
		if err := ValidateEntries(entries); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s: err = %v, want ErrInvalid", name, err)
		}
	}
}
