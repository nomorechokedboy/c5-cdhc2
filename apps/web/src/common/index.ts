// Chuẩn hóa ngày về ISO yyyy-mm-dd
export function toIsoDate(value: any): string {
  if (!value) return '';

  // Nếu là number (Excel date serial) → convert
  if (typeof value === 'number') {
    return excelSerialToIso(value);
  }

  const trimmed = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed; // yyyy-mm-dd
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}


// Chuyển ISO yyyy-mm-dd sang dd/mm/yyyy để hiển thị
export function toDdMmYyyy(value: string): string {
  if (!value) return '';

  const trimmed = value.trim();

  // Nếu đã là dd/mm/yyyy thì giữ nguyên
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // Nếu là yyyy-mm-dd thì convert sang dd/mm/yyyy
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-');
    return `${day}/${month}/${year}`;
  }

  // Fallback
  return trimmed;
}
// Convert serial number của Excel sang ISO yyyy-mm-dd
function excelSerialToIso(serial: number): string {
  // Excel coi 1900 là năm nhuận, nên cần trừ 25569
  debugger
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400; // giây
  const dateInfo = new Date(utcValue * 1000);

  const year = dateInfo.getUTCFullYear();
  const month = String(dateInfo.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dateInfo.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
