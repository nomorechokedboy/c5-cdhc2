package reporting

import "testing"

func g(t ExamType, v float64) Item { return Item{Type: t, Grade: v, Graded: true} }
func blank(t ExamType) Item        { return Item{Type: t} }

func TestCourseScore(t *testing.T) {
	cases := []struct {
		name  string
		items []Item
		want  float64
		ok    bool
	}{
		{
			name: "two regular, two periodic, one exam",
			// ĐTBKT = (14 + 2·16) / (2 + 2·2) = 46/6; ĐMH = 0.4·46/6 + 0.6·8 = 7.8667
			items: []Item{g(ExamRegular, 8), g(ExamRegular, 6), g(ExamPeriodic, 7), g(ExamPeriodic, 9), g(ExamFinal, 8)},
			want:  7.87, ok: true,
		},
		{
			name: "unequal counts are weighted by count, not by (avg15P + 2·avg1T)/3",
			// ĐTBKT = (10 + 2·10) / (1 + 2·2) = 6.0; ĐMH = 2.4 + 4.2 = 6.6 (the old formula gives 6.87)
			items: []Item{g(ExamRegular, 10), g(ExamPeriodic, 4), g(ExamPeriodic, 6), g(ExamFinal, 7)},
			want:  6.60, ok: true,
		},
		{
			name: "a blank test counts as 0 and still counts in the denominator",
			// ĐTBKT = (8 + 0 + 2·6) / (2 + 2·1) = 5.0; ĐMH = 2.0 + 3.0
			items: []Item{g(ExamRegular, 8), blank(ExamRegular), g(ExamPeriodic, 6), g(ExamFinal, 5)},
			want:  5.00, ok: true,
		},
		{
			name: "a retake replaces the first exam grade",
			// ĐTBKT = 5; ĐKTM = 6.4 (not 3.7, not the average 5.05); ĐMH = 2.0 + 3.84
			items: []Item{g(ExamRegular, 5), g(ExamPeriodic, 5), g(ExamFinal, 3.7), g(ExamFinal, 6.4)},
			want:  5.84, ok: true,
		},
		{
			name: "an empty retake item leaves the first exam grade in place",
			// ĐTBKT = 10; ĐKTM = 7.5; ĐMH = 4.0 + 4.5
			items: []Item{g(ExamRegular, 10), g(ExamPeriodic, 10), g(ExamFinal, 7.5), blank(ExamFinal)},
			want:  8.50, ok: true,
		},
		{
			name:  "no exam grade at all counts as 0",
			items: []Item{g(ExamRegular, 10), g(ExamPeriodic, 10), blank(ExamFinal)},
			want:  4.00, ok: true,
		},
		{
			name: "the result rounds half up to 2 decimals",
			// ĐTBKT = (10.1 + 2·21) / 8 = 6.5125; 0.4·6.5125 + 0.6·7 = 6.805 -> 6.81
			items: []Item{g(ExamRegular, 5), g(ExamRegular, 5.1), g(ExamPeriodic, 7), g(ExamPeriodic, 7), g(ExamPeriodic, 7), g(ExamFinal, 7)},
			want:  6.81, ok: true,
		},
		{
			name: "test scores round to 1 decimal first (7.25 -> 7.3)",
			// ĐTBKT = (7.3 + 2·7.3) / 3 = 7.3; ĐMH = 2.92 + 4.38
			items: []Item{g(ExamRegular, 7.25), g(ExamPeriodic, 7.25), g(ExamFinal, 7.3)},
			want:  7.30, ok: true,
		},
		{name: "no items is not scored", items: nil, want: 0, ok: false},
		{name: "items of unknown type are ignored", items: []Item{g("Bonus", 10)}, want: 0, ok: false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, ok := CourseScore(c.items)
			if ok != c.ok || got != c.want {
				t.Fatalf("CourseScore = (%v, %v), want (%v, %v)", got, ok, c.want, c.ok)
			}
		})
	}
}
