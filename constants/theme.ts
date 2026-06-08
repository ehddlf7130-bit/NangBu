// constants/theme.ts
// NangBu 디자인 토큰
// ✅ = Figma에서 확인된 값 / ⚠️ = 추정값(디자이너 검수 필요)

export const colors = {
  // 브랜드/포인트
  primary: '#469860',        // ✅ 주요 초록 — 활성 버튼, 선택 탭, D-day 뱃지
  accent: '#FF9500',         // ⚠️ 포인트 주황 (iOS Orange 가정) — 알림/상태 점
  thumbnail: '#213A24',      // ✅ 진한 초록 — 썸네일/이미지 플레이스홀더 배경

  // 배경/면
  background: '#FFFFFF',      // ✅ 화면·카드 배경
  surface: '#F2F2F2',        // ⚠️ 카드/입력칸 살짝 어두운 면 (추정)

  // 텍스트
  textPrimary: '#1A1A1A',    // ⚠️ 제목·본문 (거의 검정)
  textSecondary: '#8E8E93',  // ⚠️ 보조·캡션 (추정)
  textDisabled: '#C7C7CC',   // ⚠️ 비활성 텍스트 (추정)

  // 선/비활성
  border: '#E5E5EA',         // ⚠️ 테두리, 구분선 (추정)
  disabled: '#E0E0E0',       // ⚠️ 비활성 버튼 배경 (추정)

  // 상태
  danger: '#E5484D',         // ⚠️ 유통기한 지남, 삭제 (임시)
  warning: '#FF9500',        // ⚠️ 유통기한 임박 — 주황 재사용

  // 틴트 (옅은 강조 배경/테두리) — ⚠️ 추정값, 디자이너 검수 필요
  primaryTint: '#E9F3EC',        // ⚠️ 옅은 그린 — 칩/배지 배경 (구 옅은 파랑 대체)
  primaryTintBorder: '#C5E2CF',  // ⚠️ 옅은 그린 테두리
  dangerTint: '#FDECEC',         // ⚠️ 옅은 빨강 — 위험 배경
  dangerTintBorder: '#F7C5C7',   // ⚠️ 옅은 빨강 테두리
  warningTint: '#FFF6E5',        // ⚠️ 옅은 주황 — 경고 배경
  warningTintBorder: '#FBE2A3',  // ⚠️ 옅은 주황 테두리

  // 기타
  overlay: 'rgba(0,0,0,0.45)', // ⚠️ 바텀시트/모달 배경 스크림 (추정)
};

export const radius = {
  pill: 9999,   // ✅ 버튼 알약형 (327×48)
  card: 16,     // ⚠️ 카드 모서리 (추정)
  sm: 8,        // ⚠️ 작은 요소
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  // ⚠️ 폰트 크기는 추정값 — 디자이너 확정 후 조정
  heading1: { fontSize: 22, fontWeight: '700' as const },
  heading2: { fontSize: 18, fontWeight: '600' as const },
  body:     { fontSize: 15, fontWeight: '400' as const },
  caption:  { fontSize: 13, fontWeight: '400' as const },
};

export const button = {
  height: 48,
  radius: radius.pill,
};
