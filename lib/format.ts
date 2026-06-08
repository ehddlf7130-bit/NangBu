/** ISO 문자열을 "YYYY.MM.DD HH:mm" 형식으로 변환 (코멘트/알림 표시 공통). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 소비기한('YYYY-MM-DD' 또는 ISO)을 "YYYY.MM.DD" 문자열로 변환. */
export function formatExpireDate(date: string): string {
  const [y, m, d] = date.split('T')[0].split('-');
  if (!y || !m || !d) return '';
  return `${y}.${m}.${d}`;
}

/** ISO 시각을 "방금 전 / N분 전 / N시간 전 / N일 전 ..." 상대 표기로 변환 (알림 목록용). */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const diffSec = Math.floor((Date.now() - then) / 1000);
  if (diffSec < 60) return '방금 전';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  if (day < 30) return `${Math.floor(day / 7)}주 전`;
  if (day < 365) return `${Math.floor(day / 30)}개월 전`;
  return `${Math.floor(day / 365)}년 전`;
}
