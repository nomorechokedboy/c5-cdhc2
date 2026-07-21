/**
 * Đọc nội dung QR từ file ảnh (png/jpg/webp) bằng jsqr + canvas.
 * Trả về URL hoặc token EXAM:… (client tra cứu).
 */
import jsQR from 'jsqr'
import { extractExamQrToken } from '@/lib/exam-qr-url'

export async function decodeQrFromImageFile(file: File): Promise<string> {
	const bitmap = await createImageBitmap(file)
	const canvas = document.createElement('canvas')
	canvas.width = bitmap.width
	canvas.height = bitmap.height
	const ctx = canvas.getContext('2d')
	if (!ctx) {
		bitmap.close()
		throw new Error('Trình duyệt không hỗ trợ canvas')
	}
	ctx.drawImage(bitmap, 0, 0)
	bitmap.close()

	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
	const result = jsQR(imageData.data, imageData.width, imageData.height, {
		inversionAttempts: 'attemptBoth'
	})
	if (!result?.data?.trim()) {
		throw new Error(
			'Không đọc được mã QR trong ảnh. Thử ảnh rõ hơn, đủ sáng, QR nằm giữa khung.'
		)
	}
	const raw = result.data.trim()
	// Ưu tiên token EXAM:… để gọi API; giữ nguyên URL nếu không rút được
	const token = extractExamQrToken(raw)
	return token || raw
}
