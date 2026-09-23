package reporting

import "testing"

func TestRound2IsHalfUpOnExactDecimals(t *testing.T) {
	cases := []struct{ in, want float64 }{
		{7.845, 7.85}, // a float64 multiply-and-round would give 7.84
		{2.675, 2.68},
		{6.805, 6.81},
		{5, 5},
		{4.994, 4.99},
		{4.995, 5},
		{0, 0},
	}
	for _, c := range cases {
		if got := round2(c.in); got != c.want {
			t.Errorf("round2(%v) = %v, want %v", c.in, got, c.want)
		}
	}
}

func TestHundredths(t *testing.T) {
	if got := hundredths(8.99); got != 899 {
		t.Errorf("hundredths(8.99) = %d, want 899", got)
	}
	if got := hundredths(7.28); got != 728 {
		t.Errorf("hundredths(7.28) = %d, want 728", got)
	}
}
