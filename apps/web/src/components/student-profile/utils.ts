import { getMediaUri } from '@/lib/utils'
import type { Student } from '@/types'

/** «Lớp - Đại đội» của học viên, lấy từ unit đã kèm sẵn nên không cần tải danh sách lớp */
export function studentClassLabel(
	student: Pick<Student, 'unit'>
): string | undefined {
	const { unit } = student
	if (!unit) return undefined
	return [unit.name, unit.parent?.name].filter(Boolean).join(' - ')
}

/** Đường dẫn ảnh đại diện; chưa có ảnh thì dùng ảnh mặc định */
export function studentAvatarSrc(student: Pick<Student, 'avatar'>): string {
	return getMediaUri(student.avatar || 'avt.jpg')
}
