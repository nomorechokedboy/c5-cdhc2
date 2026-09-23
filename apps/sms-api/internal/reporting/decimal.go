package reporting

import (
	"math"
	"math/big"
	"strconv"
)

// decimal converts a float64 to the exact decimal it prints as (7.85 becomes
// 785/100, not the nearest binary fraction), so sums and rounding are exact.
func decimal(f float64) *big.Rat {
	r, ok := new(big.Rat).SetString(strconv.FormatFloat(f, 'f', -1, 64))
	if !ok {
		return new(big.Rat)
	}
	return r
}

// roundHalfUp rounds a non-negative value to the given number of decimal
// places, halves going up (6.805 -> 6.81).
func roundHalfUp(r *big.Rat, places int) *big.Rat {
	scale := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(places)), nil)
	x := new(big.Rat).Mul(r, new(big.Rat).SetInt(scale))
	x.Add(x, big.NewRat(1, 2))
	floor := new(big.Int).Div(x.Num(), x.Denom())
	return new(big.Rat).SetFrac(floor, scale)
}

func toFloat(r *big.Rat) float64 {
	f, _ := r.Float64()
	return f
}

// round2 rounds a float64 to 2 decimal places, half up, through exact decimals.
func round2(f float64) float64 {
	return toFloat(roundHalfUp(decimal(f), 2))
}

// hundredths returns the value in hundredths (7.85 -> 785). Band and rank
// comparisons use it so they never depend on float representation.
func hundredths(f float64) int {
	return int(math.Round(f * 100))
}
