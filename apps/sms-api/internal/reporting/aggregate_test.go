package reporting

import "testing"

func TestGPAWeightsByCredits(t *testing.T) {
	// Chu Việt Anh, HK1: GP, SL, CN M-LN, VSKST plus GDTC and QS (all six count).
	got, ok := GPA([]CourseResult{
		{5.8, 4}, {7.9, 3}, {7.7, 4}, {8.7, 3}, {6.2, 2}, {7.4, 2},
	})
	if !ok || got != 7.28 { // 131.0 / 18 = 7.2777...
		t.Fatalf("GPA = (%v, %v), want (7.28, true)", got, ok)
	}
}

func TestGPARoundsHalfUp(t *testing.T) {
	// (7.8·1 + 7.89·1) / 2 = 7.845 -> 7.85
	got, _ := GPA([]CourseResult{{7.8, 1}, {7.89, 1}})
	if got != 7.85 {
		t.Fatalf("GPA = %v, want 7.85", got)
	}
}

func TestGPANoCredits(t *testing.T) {
	if _, ok := GPA(nil); ok {
		t.Fatal("GPA of nothing must not be ok")
	}
	if _, ok := GPA([]CourseResult{{9, 0}}); ok {
		t.Fatal("GPA with zero credits must not be ok")
	}
}

func TestMean(t *testing.T) {
	if got, ok := Mean([]float64{8.5, 7.0, 6.4}); !ok || got != 7.30 {
		t.Fatalf("Mean = (%v, %v), want (7.3, true)", got, ok)
	}
	if _, ok := Mean(nil); ok {
		t.Fatal("Mean of nothing must not be ok")
	}
}

func fp(v float64) *float64 { return &v }

func TestRankCompetition(t *testing.T) {
	// 8.7, 8.6, six students on 8.5, then 8.4: ranks 1, 2, 3 x6, 9.
	values := []*float64{fp(8.4), fp(8.5), fp(8.7), fp(8.5), fp(8.6), fp(8.5), fp(8.5), fp(8.5), fp(8.5), nil}
	want := []int{9, 3, 1, 3, 2, 3, 3, 3, 3, 0}
	got := Rank(values)
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("rank[%d] = %d, want %d (all: %v)", i, got[i], want[i], got)
		}
	}
}
