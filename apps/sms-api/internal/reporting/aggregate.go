package reporting

import "math/big"

// CourseResult is a scored course with its credits.
type CourseResult struct {
	Score   float64
	Credits int
}

// GPA returns the ĐTB (Điều 14): Σ(score·credits) / Σcredits, 2 decimals, half
// up. ok is false when there are no credits to weigh by.
func GPA(results []CourseResult) (gpa float64, ok bool) {
	sum, credits := new(big.Rat), 0
	for _, r := range results {
		sum.Add(sum, new(big.Rat).Mul(decimal(r.Score), big.NewRat(int64(r.Credits), 1)))
		credits += r.Credits
	}
	if credits == 0 {
		return 0, false
	}
	sum.Quo(sum, big.NewRat(int64(credits), 1))
	return toFloat(roundHalfUp(sum, 2)), true
}

// Mean returns the simple mean of values to 2 decimals, half up. ok is false
// for an empty slice. Used for class ĐTB and for the year rèn luyện.
func Mean(values []float64) (mean float64, ok bool) {
	if len(values) == 0 {
		return 0, false
	}
	sum := new(big.Rat)
	for _, v := range values {
		sum.Add(sum, decimal(v))
	}
	sum.Quo(sum, big.NewRat(int64(len(values)), 1))
	return toFloat(roundHalfUp(sum, 2)), true
}

// Rank gives each value its competition rank (1, 2, 3, 3, 3, 3, 3, 3, 9 ...):
// one plus the number of strictly greater values, compared at 2 decimals. A nil
// value has no rank (0).
func Rank(values []*float64) []int {
	ranks := make([]int, len(values))
	for i, v := range values {
		if v == nil {
			continue
		}
		ranks[i] = 1
		for j, w := range values {
			if j != i && w != nil && hundredths(*w) > hundredths(*v) {
				ranks[i]++
			}
		}
	}
	return ranks
}
