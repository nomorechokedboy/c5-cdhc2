import type { Band, ConductLabel } from './types'

/** Study bands, best first (the order used for bars, legends and sheets). */
export const BANDS: Band[] = [
	'xuat_sac',
	'gioi',
	'kha',
	'trung_binh_kha',
	'trung_binh',
	'yeu'
]

export const bandKey = (band: Band) => `report.band.${band}`
export const conductKey = (label: ConductLabel) => `report.conductBand.${label}`

/** Colour band of a score cell, from the sample legend. Below 5 the Score component circles it in red. */
export type Tone = 'good' | 'warn' | 'none'

export function scoreTone(value: number): Tone {
	if (value >= 9) return 'good'
	if (value >= 5 && value < 7) return 'warn'
	return 'none'
}

export const TONE_CLASS: Record<Tone, string> = {
	good: 'bg-success/15',
	warn: 'bg-warning/20',
	none: ''
}

/** Segment colour of each study band in the distribution bar. */
export const BAND_BAR: Record<Band, string> = {
	xuat_sac: 'bg-success',
	gioi: 'bg-success/70',
	kha: 'bg-primary/60',
	trung_binh_kha: 'bg-warning/80',
	trung_binh: 'bg-warning/55',
	yeu: 'bg-destructive'
}
