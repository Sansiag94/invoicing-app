export function getTodayDateInputValue(baseDate = new Date()): string {
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, "0");
  const day = String(baseDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDefaultDueDate(issueDateValue: string): string {
  if (!issueDateValue) return "";

  const [year, month, day] = issueDateValue.split("-").map(Number);
  if (!year || !month || !day) return "";

  const targetMonthIndex = month;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex = targetMonthIndex % 12;
  const lastDayOfTargetMonth = new Date(targetYear, normalizedMonthIndex + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);

  return `${targetYear}-${String(normalizedMonthIndex + 1).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
}

export function toDateInputValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
