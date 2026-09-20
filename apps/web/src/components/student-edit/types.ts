/**
 * Form từ `useAppForm` (kiểu suy ra rất dài và đổi theo defaultValues) —
 * cả codebase truyền form dạng `any` cho các step/tab.
 */
export type StudentEditFormApi = any

export type StudentEditTabProps = { form: StudentEditFormApi }
