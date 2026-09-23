export interface PeriodKey {
	year: number
	semester: number
}

const asc = (a: number, b: number) => a - b

export const yearsOf = (periods: PeriodKey[]) =>
	[...new Set(periods.map((p) => p.year))].sort(asc)

export const semestersOf = (periods: PeriodKey[], year: number) =>
	periods
		.filter((p) => p.year === year)
		.map((p) => p.semester)
		.sort(asc)

export function latestPeriod(periods: PeriodKey[]): PeriodKey | null {
	if (periods.length === 0) return null
	const year = Math.max(...periods.map((p) => p.year))
	const semesters = semestersOf(periods, year)
	return { year, semester: semesters[semesters.length - 1] }
}

/**
 * Turns a possibly stale or partial choice into a period that exists: keep it
 * if valid, else the latest semester of the chosen year, else the latest period.
 */
export function resolvePeriod(
	periods: PeriodKey[],
	wanted: Partial<PeriodKey>
): PeriodKey | null {
	if (periods.length === 0) return null
	if (wanted.year !== undefined) {
		const semesters = semestersOf(periods, wanted.year)
		if (semesters.length > 0) {
			if (
				wanted.semester !== undefined &&
				semesters.includes(wanted.semester)
			) {
				return { year: wanted.year, semester: wanted.semester }
			}
			return {
				year: wanted.year,
				semester: semesters[semesters.length - 1]
			}
		}
	}
	return latestPeriod(periods)
}
