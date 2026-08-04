/**
 * Mẫu xuất / in Giấy nghỉ phép của cơ quan quản lý.
 */
import dayjs from 'dayjs'
import type { LeaveRequest } from '@/api/leave'

function esc(s: string | null | undefined): string {
	return String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

function fmt(iso: string | null | undefined): string {
	if (!iso) return '……/……/……'
	const d = dayjs(iso)
	return d.isValid() ? d.format('DD/MM/YYYY') : String(iso)
}

function documentDate(r: LeaveRequest): string {
	const d = dayjs(r.decidedAt || undefined)
	const value = d.isValid() ? d : dayjs()
	return `ngày ${value.format('DD')} tháng ${value.format('MM')} năm ${value.format('YYYY')}`
}

function leaveReason(r: LeaveRequest): string {
	if (r.note?.trim()) return r.note.trim()
	if (r.leaveType === 'SPECIAL') return 'Nghỉ phép đặc biệt./.'
	const year = r.startDate
		? dayjs(r.startDate).format('YYYY')
		: dayjs().format('YYYY')
	return `Nghỉ phép năm ${year}./.`
}

/**
 * Mở cửa sổ xem trước/in Giấy nghỉ phép.
 * @param opts Các giá trị đang được cơ quan quản lý điều chỉnh trước khi duyệt.
 */
export function printLeaveCertificate(
	r: LeaveRequest,
	_opts?: {
		travelDays?: number
		extraDays?: number
		totalDays?: number
	}
): boolean {
	const w = window.open('', '_blank', 'width=900,height=1000')
	if (!w) return false

	const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<title>Giấy nghỉ phép số ${r.id}</title>
<style>
  @page { size: A4 portrait; margin: 18mm 18mm 16mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 14pt;
    line-height: 1.28;
    color: #000;
  }
  .page { width: 100%; min-height: 257mm; }
  .header {
    display: grid;
    grid-template-columns: 44% 56%;
    align-items: start;
    text-align: center;
  }
  .upper { text-transform: uppercase; }
  .line { margin: 0; }
  .parent-org { font-size: 12pt; }
  .unit { font-size: 12.5pt; font-weight: 700; }
  .nation { font-size: 13pt; font-weight: 700; }
  .motto { display: inline-block; font-size: 13pt; font-weight: 700; border-bottom: 1px solid #000; padding: 0 8px 2px; }
  .doc-number { margin-top: 20px; font-size: 12.5pt; text-align: left; padding-left: 13%; }
  .place-date { margin-top: 20px; font-size: 12.5pt; font-style: italic; white-space: nowrap; }
  .title { margin: 55px 0 54px; text-align: center; }
  .title h1 { display: inline-block; margin: 0; padding-bottom: 2px; border-bottom: 1px solid #000; font-size: 17pt; text-transform: uppercase; }
  .details { width: 88%; margin: 0 auto; }
  .detail-row { display: grid; grid-template-columns: 178px 1fr; margin: 8px 0; align-items: baseline; }
  .label { white-space: nowrap; }
  .value { min-width: 0; }
  .name { font-weight: 700; text-transform: uppercase; }
  .time-value { padding-left: 56px; }
  .signatures { display: grid; grid-template-columns: 47% 53%; gap: 20px; margin-top: 76px; text-align: center; }
  .signature-title { font-weight: 700; text-transform: uppercase; line-height: 1.12; }
  .signature-subtitle { font-weight: 700; line-height: 1.12; }
  .signature-hint { font-style: italic; font-size: 12pt; }
  .signature-space { height: 98px; }
  .signer { font-weight: 700; }
  @media screen {
    body { background: #e5e7eb; padding: 24px; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 18mm 18mm 16mm; background: white; box-shadow: 0 2px 14px #777; }
  }
  @media print {
    .page { min-height: 0; }
  }
</style>
</head>
<body>
<main class="page">
  <header class="header">
    <div>
      <p class="line parent-org upper">Tổng cục Hậu cần</p>
      <p class="line unit upper">Trường Cao đẳng Hậu cần 2</p>
      <p class="line doc-number">Số: ${r.id}/GNP-CĐHC</p>
    </div>
    <div>
      <p class="line nation upper">Cộng hòa xã hội chủ nghĩa Việt Nam</p>
      <p class="line motto">Độc lập - Tự do - Hạnh phúc</p>
      <p class="line place-date">Thành phố Hồ Chí Minh, ${documentDate(r)}</p>
    </div>
  </header>

  <section class="title"><h1>Giấy nghỉ phép</h1></section>

  <section class="details">
    <div class="detail-row"><span class="label">Họ và tên:</span><span class="value name">${esc(r.personnelName) || '………………………………'}</span></div>
    <div class="detail-row"><span class="label">Cấp bậc:</span><span class="value">${esc(r.rank) || '………………………………'}</span></div>
    <div class="detail-row"><span class="label">Chức vụ:</span><span class="value">${esc(r.position) || '………………………………'}</span></div>
    <div class="detail-row"><span class="label">Đơn vị:</span><span class="value">${esc(r.unitName) || '………………………………'}/Trường Cao đẳng Hậu cần 2</span></div>
    <div class="detail-row"><span class="label">Được nghỉ từ:</span><span class="value time-value">07h00 ngày ${fmt(r.startDate)}</span></div>
    <div class="detail-row"><span class="label">Đến:</span><span class="value time-value">17h00 ngày ${fmt(r.endDate)}</span></div>
    <div class="detail-row"><span class="label">Nơi nghỉ phép:</span><span class="value">${esc(r.localityPath) || '………………………………'}</span></div>
    <div class="detail-row"><span class="label">Lý do:</span><span class="value">${esc(leaveReason(r))}</span></div>
  </section>

  <section class="signatures">
    <div>
      <div class="signature-title">Xác nhận</div>
      <div class="signature-subtitle">Của chính quyền địa phương<br/>nơi nghỉ phép</div>
      <div class="signature-hint">(Ký, đóng dấu)</div>
      <div class="signature-space"></div>
    </div>
    <div>
      <div class="signature-title">KT. Hiệu trưởng</div>
      <div class="signature-title">Phó hiệu trưởng</div>
      <div class="signature-space"></div>
      <div class="signer">${esc(r.decidedByUsername) || '………………………………'}</div>
    </div>
  </section>
</main>
<script>window.onload = function () { window.print(); }</script>
</body>
</html>`

	w.document.open()
	w.document.write(html)
	w.document.close()
	return true
}
