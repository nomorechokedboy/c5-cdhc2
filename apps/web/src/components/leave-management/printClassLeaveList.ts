import dayjs from 'dayjs'
import type { LeaveRequest } from '@/api/leave'

function escapeHtml(value: unknown) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
}

export function printClassLeaveList(rows: LeaveRequest[]): boolean {
	const first = rows[0]
	if (!first) return false
	const popup = window.open('', '_blank', 'width=1000,height=760')
	if (!popup) return false
	const fmt = (value: string | null) =>
		value ? dayjs(value).format('DD/MM/YYYY') : '—'
	popup.document
		.write(`<!doctype html><html><head><meta charset="utf-8"><title>Danh sách phép ${escapeHtml(first.className || '')}</title>
	<style>body{font-family:"Times New Roman",serif;margin:28px;color:#000}h1{text-align:center;font-size:22px;margin:0 0 18px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:18px}.meta b{display:inline-block;min-width:110px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:7px;text-align:left}th{text-align:center}.center{text-align:center}.signatures{display:grid;grid-template-columns:1fr 1fr;margin-top:32px;text-align:center}.signatures b{display:block;margin-bottom:70px}@media print{body{margin:12mm}}</style></head><body>
	<h1>DANH SÁCH HỌC VIÊN NGHỈ PHÉP — ${escapeHtml(first.className || 'LỚP')}</h1>
	<div class="meta"><div><b>Đơn vị:</b> ${escapeHtml(first.unitName || '—')}</div><div><b>Loại phép:</b> ${first.leaveType === 'SPECIAL' ? 'Phép đặc biệt' : 'Phép hằng năm'}</div><div><b>Thời gian:</b> ${fmt(first.startDate)} đến ${fmt(first.endDate)}</div><div><b>Số ngày:</b> ${first.totalDays} ngày</div><div><b>Số học viên:</b> ${rows.length}</div><div><b>Trạng thái:</b> ${escapeHtml(first.status)}</div></div>
	<table><thead><tr><th>STT</th><th>Mã QN</th><th>Họ và tên</th><th>Cấp bậc</th><th>Chức vụ</th><th>Nơi nghỉ</th></tr></thead><tbody>
	${rows.map((row, index) => `<tr><td class="center">${index + 1}</td><td>${escapeHtml(row.personnelCode || '—')}</td><td>${escapeHtml(row.personnelName || '—')}</td><td>${escapeHtml(row.rank || '—')}</td><td>${escapeHtml(row.position || '—')}</td><td>${escapeHtml(row.localityPath || '—')}</td></tr>`).join('')}
	</tbody></table><div class="signatures"><div><b>NGƯỜI LẬP DANH SÁCH</b></div><div><b>CHỈ HUY ĐƠN VỊ</b></div></div>
	<script>window.onload=()=>{window.print()}</script></body></html>`)
	popup.document.close()
	return true
}
