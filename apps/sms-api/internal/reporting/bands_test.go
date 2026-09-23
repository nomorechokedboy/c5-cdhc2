package reporting

import "testing"

func TestClassifyEdges(t *testing.T) {
	cases := []struct {
		score float64
		want  Band
	}{
		{10, BandExcellent}, {9.00, BandExcellent}, {8.99, BandGood},
		{8.00, BandGood}, {7.99, BandFair},
		{7.00, BandFair}, {6.99, BandAverageUp},
		{6.00, BandAverageUp}, {5.99, BandAverage},
		{5.00, BandAverage}, {4.99, BandWeak}, {0, BandWeak},
	}
	for _, c := range cases {
		if got := Classify(c.score); got != c.want {
			t.Errorf("Classify(%v) = %s, want %s", c.score, got, c.want)
		}
	}
}

func TestClassifyConductEdges(t *testing.T) {
	cases := []struct {
		score float64
		want  ConductLabel
	}{
		{10, ConductExcellent}, {9.0, ConductExcellent}, {8.9, ConductGood},
		{8.0, ConductGood}, {7.9, ConductFair},
		{6.5, ConductFair}, {6.4, ConductAverage},
		{5.0, ConductAverage}, {4.9, ConductWeak},
		{3.5, ConductWeak}, {3.4, ConductPoor}, {0, ConductPoor},
	}
	for _, c := range cases {
		if got := ClassifyConduct(c.score); got != c.want {
			t.Errorf("ClassifyConduct(%v) = %s, want %s", c.score, got, c.want)
		}
	}
}
