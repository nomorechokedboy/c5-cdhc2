package reporting

import "math/big"

// ExamType is the kind of a graded item in a course.
type ExamType string

const (
	// ExamRegular is a regular test (kiểm tra thường xuyên, weight 1).
	ExamRegular ExamType = "15P"
	// ExamPeriodic is a periodic test (kiểm tra định kỳ, weight 2).
	ExamPeriodic ExamType = "1T"
	// ExamFinal is the end-of-course exam; a retake is a later item of this type.
	ExamFinal ExamType = "Thi"
)

// Item is one configured grade item of a course, for one student.
// Graded is false when the teacher has not entered a grade; the item then
// counts as 0 (Điều 10.5, 11.2.c).
type Item struct {
	Type   ExamType
	Grade  float64
	Graded bool
}

// CourseScore returns the course score ĐMH (Điều 11):
//
//	ĐMH   = 0.4·ĐTBKT + 0.6·ĐKTM
//	ĐTBKT = (ΣKTTX + 2·ΣKTĐK) / (nKTTX + 2·nKTĐK)
//
// n is the number of configured items of that type, so a blank grade lowers
// the average instead of shrinking it. ĐKTM is the last graded ExamFinal item
// in course order: a retake replaces the earlier value, it is never averaged.
// Test scores are rounded to 1 decimal (Điều 10.4); the result to 2 decimals.
// ok is false when the course has no items of a known type.
func CourseScore(items []Item) (score float64, ok bool) {
	var sumRegular, sumPeriodic, final big.Rat
	nRegular, nPeriodic, known := 0, 0, 0

	for _, it := range items {
		switch it.Type {
		case ExamRegular:
			nRegular++
			known++
			if it.Graded {
				sumRegular.Add(&sumRegular, roundHalfUp(decimal(it.Grade), 1))
			}
		case ExamPeriodic:
			nPeriodic++
			known++
			if it.Graded {
				sumPeriodic.Add(&sumPeriodic, roundHalfUp(decimal(it.Grade), 1))
			}
		case ExamFinal:
			known++
			if it.Graded {
				final = *decimal(it.Grade)
			}
		}
	}
	if known == 0 {
		return 0, false
	}

	avgTests := new(big.Rat)
	if den := nRegular + 2*nPeriodic; den > 0 {
		num := new(big.Rat).Add(&sumRegular, new(big.Rat).Mul(big.NewRat(2, 1), &sumPeriodic))
		avgTests.Quo(num, big.NewRat(int64(den), 1))
	}

	total := new(big.Rat).Mul(big.NewRat(2, 5), avgTests)
	total.Add(total, new(big.Rat).Mul(big.NewRat(3, 5), &final))
	return toFloat(roundHalfUp(total, 2)), true
}
