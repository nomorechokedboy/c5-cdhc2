// Chuẩn hóa ngày về ISO yyyy-mm-dd
export function toIsoDate(value: string): string {
  if (!value) return '';

  const trimmed = value.trim();

  // Nếu đã là ISO yyyy-mm-dd thì giữ nguyên
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Nếu là dd/mm/yyyy thì convert sang yyyy-mm-dd
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    return `${year}-${month}-${day}`;
  }

  // Fallback: trả về như cũ
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
