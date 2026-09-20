import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

const DISPLAY_FORMAT = 'DD/MM/YYYY'
const STORED_FORMAT = 'YYYY-MM-DD'

const DISPLAY_RE = /^\d{2}\/\d{2}\/\d{4}$/
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T/

/**
 * Giá trị ngày từ API → dd/mm/yyyy để hiển thị trong DatePicker.
 * Nhận yyyy-mm-dd, timestamp ISO (dữ liệu cũ, đọc theo múi giờ máy) hoặc dd/mm/yyyy.
 * Giá trị không nhận dạng được (vd. văn bản tự do) được giữ nguyên.
 */
export function toDisplayDate(value?: string | null): string {
	const raw = value?.trim()
	if (!raw) return ''
	if (DISPLAY_RE.test(raw)) return raw

	if (ISO_DATE_RE.test(raw)) {
		const d = dayjs(raw, STORED_FORMAT, true)
		return d.isValid() ? d.format(DISPLAY_FORMAT) : raw
	}
	if (ISO_TIMESTAMP_RE.test(raw)) {
		const d = dayjs(raw)
		return d.isValid() ? d.format(DISPLAY_FORMAT) : raw
	}
	return raw
}

/** dd/mm/yyyy → yyyy-mm-dd để lưu. Rỗng → ''; không hợp lệ → giữ nguyên. */
export function toStoredDate(value?: string | null): string {
	const raw = value?.trim()
	if (!raw) return ''
	const d = dayjs(raw, DISPLAY_FORMAT, true)
	return d.isValid() ? d.format(STORED_FORMAT) : raw
}

export function isDisplayDate(value?: string | null): boolean {
	const raw = value?.trim()
	return !!raw && dayjs(raw, DISPLAY_FORMAT, true).isValid()
}
