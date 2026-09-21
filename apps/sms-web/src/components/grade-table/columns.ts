/**
 * Cột «điểm điều kiện» chen vào ngay trước hai cột cuối (bài thi cuối kỳ trở đi),
 * và chỉ khi lớp có nhiều hơn hai cột điểm.
 */
export const hasConditionalAfter = (index: number, columnCount: number) =>
	columnCount > 2 && index === columnCount - 2
