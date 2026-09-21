package reporting

// Band is a study classification (Điều 11 for a course, Điều 14 for a period).
type Band string

const (
	BandExcellent Band = "xuat_sac"       // Xuất sắc
	BandGood      Band = "gioi"           // Giỏi
	BandFair      Band = "kha"            // Khá
	BandAverageUp Band = "trung_binh_kha" // Trung bình khá
	BandAverage   Band = "trung_binh"     // Trung bình
	BandWeak      Band = "yeu"            // Yếu
)

// Bands lists every band from best to worst.
var Bands = []Band{BandExcellent, BandGood, BandFair, BandAverageUp, BandAverage, BandWeak}

// Classify returns the band of a course score or an ĐTB (both already rounded
// to 2 decimals): ≥9 · 8–8.99 · 7–7.99 · 6–6.99 · 5–5.99 · <5.
func Classify(score float64) Band {
	switch h := hundredths(score); {
	case h >= 900:
		return BandExcellent
	case h >= 800:
		return BandGood
	case h >= 700:
		return BandFair
	case h >= 600:
		return BandAverageUp
	case h >= 500:
		return BandAverage
	default:
		return BandWeak
	}
}

// ConductLabel is the label of a rèn luyện score. Its thresholds are their own
// table, separate from the study bands.
type ConductLabel string

const (
	ConductExcellent ConductLabel = "xuat_sac"
	ConductGood      ConductLabel = "tot"
	ConductFair      ConductLabel = "kha"
	ConductAverage   ConductLabel = "trung_binh"
	ConductWeak      ConductLabel = "yeu"
	ConductPoor      ConductLabel = "kem"
)

// ClassifyConduct labels a rèn luyện score: ≥9 · 8–8.99 · 6.5–7.99 · 5–6.49 · 3.5–4.99 · <3.5.
// The ranges below Xuất sắc are working values; change them here only.
func ClassifyConduct(score float64) ConductLabel {
	switch h := hundredths(score); {
	case h >= 900:
		return ConductExcellent
	case h >= 800:
		return ConductGood
	case h >= 650:
		return ConductFair
	case h >= 500:
		return ConductAverage
	case h >= 350:
		return ConductWeak
	default:
		return ConductPoor
	}
}
