// constants/theme.ts
// NangBu 디자인 토큰
// ✅ = Figma에서 확인된 값 / ⚠️ = 추정값(디자이너 검수 필요)

export const colors = {
  // 브랜드
  primary: '#469860',           // 메인 브랜드 그린 — 활성/선택, CTA, 강조 글자·아이콘
  primaryTint: '#E9F3EC',       // 선택된 칩/행 배경 (옅은 그린)
  primaryTintBorder: '#C5E2CF', // 선택된 칩/행 테두리
  thumbnail: '#213A24',         // 다크 그린 — 썸네일/아바타 배경

  // 텍스트
  textPrimary: '#1A1A1A',       // 제목·본문·기본 아이콘
  textSecondary: '#8E8E93',     // 보조·캡션, 비활성 탭, 보조 아이콘
  textTertiary: '#AEAEB2',      // 한 단계 더 약한 텍스트 (신규)
  textDisabled: '#C7C7CC',      // 비활성, placeholder

  // 경계선·면
  border: '#E5E5EA',            // 연한 구분선·테두리
  borderStrong: '#D1D1D6',      // 진한 경계선 (신규)
  surface: '#F2F2F7',           // 카드·입력칸 배경 (F4F6F4 흡수 + F2F2F2 오타 교정)
  background: '#FFFFFF',         // 화면/카드 기본 배경

  // 상태 — 위험(빨강)
  danger: '#E5484D',
  dangerTint: '#FDECEC',
  dangerTintBorder: '#F7C5C7',

  // 상태 — 경고(주황) ★ D-day 중간단계, danger와 절대 통합 금지
  warning: '#FF9500',
  warningTint: '#FFF6E5',
  warningTintBorder: '#FBE2A3',

  // 오버레이
  overlay: 'rgba(0, 0, 0, 0.45)', // 바텀시트 뒷배경 스크림
} as const;

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
