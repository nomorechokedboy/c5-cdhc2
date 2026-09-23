import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CategoryApi } from '@/api'
import { ReportApi } from '@/api/reports'
import type { ConductEntry } from '@/lib/report/types'

export const reportKeys = {
	classRoot: (categoryId: number) => ['report', 'class', categoryId] as const,
	periods: (categoryId: number) =>
		['report', 'class', categoryId, 'periods'] as const,
	semester: (categoryId: number, year: number, semester: number) =>
		['report', 'class', categoryId, 'semester', year, semester] as const,
	year: (categoryId: number, year: number) =>
		['report', 'class', categoryId, 'year', year] as const,
	myPeriods: ['report', 'me', 'periods'] as const,
	mySemester: (year: number, semester: number) =>
		['report', 'me', 'semester', year, semester] as const,
	myYear: (year: number) => ['report', 'me', 'year', year] as const
}

// Same key as the dashboards, so the list is shared and cached.
export const useCategories = () =>
	useQuery({ queryKey: ['categories'], queryFn: CategoryApi.GetCategories })

export const usePeriods = (categoryId: number) =>
	useQuery({
		queryKey: reportKeys.periods(categoryId),
		queryFn: () => ReportApi.periods(categoryId)
	})

export const useSemesterReport = (
	categoryId: number,
	year: number,
	semester: number
) =>
	useQuery({
		queryKey: reportKeys.semester(categoryId, year, semester),
		queryFn: () => ReportApi.semester(categoryId, year, semester)
	})

export const useYearReport = (categoryId: number, year: number) =>
	useQuery({
		queryKey: reportKeys.year(categoryId, year),
		queryFn: () => ReportApi.year(categoryId, year)
	})

/** Saves rèn luyện and refetches the class's semester and year reports (the year value is derived). */
export function useSaveConduct(categoryId: number) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (entries: ConductEntry[]) =>
			ReportApi.saveConduct(categoryId, entries),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({
					queryKey: [...reportKeys.classRoot(categoryId), 'semester']
				}),
				queryClient.invalidateQueries({
					queryKey: [...reportKeys.classRoot(categoryId), 'year']
				})
			])
	})
}

export const useMyPeriods = () =>
	useQuery({ queryKey: reportKeys.myPeriods, queryFn: ReportApi.myPeriods })

export const useMySemester = (year: number, semester: number) =>
	useQuery({
		queryKey: reportKeys.mySemester(year, semester),
		queryFn: () => ReportApi.mySemester(year, semester)
	})

export const useMyYear = (year: number) =>
	useQuery({
		queryKey: reportKeys.myYear(year),
		queryFn: () => ReportApi.myYear(year)
	})
