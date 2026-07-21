/**
 * Mẫu đầu trang / cuối trang Word báo cáo vật tư.
 * Sửa tại form «Mẫu báo cáo» → mọi file Word xuất ra dùng chung.
 */

export type ReportTemplate = {
	/** Dòng 1 trái (vd. TỔNG CỤC HẬU CẦN) */
	superiorUnitName: string
	/** Dòng 2 trái (vd. TRƯỜNG CAO ĐẲNG HẬU CẦN 2) */
	unitName: string
	/** Số hiệu: ....../BC-CDHC */
	docNumber: string
	/** Quốc hiệu */
	republic: string
	/** Tiêu ngữ */
	motto: string
	/** Địa danh (ngày tự ghép khi xuất) */
	city: string
	/** Tiêu đề cột «Nơi nhận:» */
	recipientsTitle: string
	/**
	 * Danh sách nơi nhận — mỗi dòng một mục
	 * (vd. - Như trên;\n- Lưu: VT, HC;)
	 */
	recipients: string
	/** Chức danh ký (vd. CHỈ HUY ĐƠN VỊ) */
	commanderPosition: string
	/** Gợi ý dưới chức danh */
	commanderHint: string
	/** Cấp bậc (tùy chọn) */
	commanderRank: string
	/** Họ tên người ký — trống thì in chấm */
	commanderName: string
}

export const DEFAULT_REPORT_TEMPLATE: ReportTemplate = {
	superiorUnitName: 'TỔNG CỤC HẬU CẦN',
	unitName: 'TRƯỜNG CAO ĐẲNG HẬU CẦN 2',
	docNumber: '....../BC-CDHC',
	republic: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
	motto: 'Độc lập - Tự do - Hạnh phúc',
	city: 'Thành phố Hồ Chí Minh',
	recipientsTitle: 'Nơi nhận:',
	recipients: '- Như trên;\n- Lưu: VT, HC;',
	commanderPosition: 'CHỈ HUY ĐƠN VỊ',
	commanderHint: '(Ký, ghi rõ họ tên, cấp bậc)',
	commanderRank: '',
	commanderName: ''
}

const STORAGE_KEY = 'vat-tu-report-template-v1'

/** Event name — form lưu xong báo các tab/export đọc lại */
export const REPORT_TEMPLATE_CHANGED = 'vat-tu-report-template-changed'

export function loadReportTemplate(): ReportTemplate {
	if (typeof window === 'undefined') {
		return { ...DEFAULT_REPORT_TEMPLATE }
	}
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return { ...DEFAULT_REPORT_TEMPLATE }
		const parsed = JSON.parse(raw) as Partial<ReportTemplate>
		return {
			...DEFAULT_REPORT_TEMPLATE,
			...parsed,
			// Chuẩn hóa chuỗi
			superiorUnitName:
				String(
					parsed.superiorUnitName ??
						DEFAULT_REPORT_TEMPLATE.superiorUnitName
				).trim() || DEFAULT_REPORT_TEMPLATE.superiorUnitName,
			unitName:
				String(
					parsed.unitName ?? DEFAULT_REPORT_TEMPLATE.unitName
				).trim() || DEFAULT_REPORT_TEMPLATE.unitName,
			docNumber:
				String(
					parsed.docNumber ?? DEFAULT_REPORT_TEMPLATE.docNumber
				).trim() || DEFAULT_REPORT_TEMPLATE.docNumber,
			republic:
				String(
					parsed.republic ?? DEFAULT_REPORT_TEMPLATE.republic
				).trim() || DEFAULT_REPORT_TEMPLATE.republic,
			motto:
				String(parsed.motto ?? DEFAULT_REPORT_TEMPLATE.motto).trim() ||
				DEFAULT_REPORT_TEMPLATE.motto,
			city:
				String(parsed.city ?? DEFAULT_REPORT_TEMPLATE.city).trim() ||
				DEFAULT_REPORT_TEMPLATE.city,
			recipientsTitle:
				String(
					parsed.recipientsTitle ??
						DEFAULT_REPORT_TEMPLATE.recipientsTitle
				).trim() || DEFAULT_REPORT_TEMPLATE.recipientsTitle,
			recipients:
				String(
					parsed.recipients ?? DEFAULT_REPORT_TEMPLATE.recipients
				) || DEFAULT_REPORT_TEMPLATE.recipients,
			commanderPosition:
				String(
					parsed.commanderPosition ??
						DEFAULT_REPORT_TEMPLATE.commanderPosition
				).trim() || DEFAULT_REPORT_TEMPLATE.commanderPosition,
			commanderHint:
				String(
					parsed.commanderHint ??
						DEFAULT_REPORT_TEMPLATE.commanderHint
				).trim() || DEFAULT_REPORT_TEMPLATE.commanderHint,
			commanderRank: String(
				parsed.commanderRank ?? DEFAULT_REPORT_TEMPLATE.commanderRank
			).trim(),
			commanderName: String(
				parsed.commanderName ?? DEFAULT_REPORT_TEMPLATE.commanderName
			).trim()
		}
	} catch {
		return { ...DEFAULT_REPORT_TEMPLATE }
	}
}

export function saveReportTemplate(tpl: ReportTemplate): void {
	if (typeof window === 'undefined') return
	const cleaned: ReportTemplate = {
		...DEFAULT_REPORT_TEMPLATE,
		...tpl,
		superiorUnitName: tpl.superiorUnitName.trim(),
		unitName: tpl.unitName.trim(),
		docNumber: tpl.docNumber.trim(),
		republic: tpl.republic.trim(),
		motto: tpl.motto.trim(),
		city: tpl.city.trim(),
		recipientsTitle: tpl.recipientsTitle.trim(),
		recipients: tpl.recipients.replace(/\r\n/g, '\n'),
		commanderPosition: tpl.commanderPosition.trim(),
		commanderHint: tpl.commanderHint.trim(),
		commanderRank: tpl.commanderRank.trim(),
		commanderName: tpl.commanderName.trim()
	}
	localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
	window.dispatchEvent(new CustomEvent(REPORT_TEMPLATE_CHANGED))
}

export function resetReportTemplate(): ReportTemplate {
	if (typeof window !== 'undefined') {
		localStorage.removeItem(STORAGE_KEY)
		window.dispatchEvent(new CustomEvent(REPORT_TEMPLATE_CHANGED))
	}
	return { ...DEFAULT_REPORT_TEMPLATE }
}

/** Tách dòng «Nơi nhận» (bỏ dòng trống) */
export function recipientLines(tpl: ReportTemplate): string[] {
	return (tpl.recipients || '')
		.split('\n')
		.map((s) => s.trim())
		.filter(Boolean)
}

/** Dòng chữ ký: cấp + tên, hoặc chấm */
export function commanderSignLine(tpl: ReportTemplate): string {
	const s = [tpl.commanderRank, tpl.commanderName].filter(Boolean).join(' ')
	return s || '................................'
}
