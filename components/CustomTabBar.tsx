// expo-router의 Tabs에 끼워 쓰는 "커스텀 하단 탭바" 부품(컴포넌트).
// 화면 자체가 아니라, 4개 탭(냉장고/커뮤니티/레시피/마이페이지)을 가로로 그리는 녹색 막대다.
// 라우팅은 expo-router가 넘겨주는 navigation으로 처리하고, 모양만 Figma 시안대로 직접 그린다.
//
// 끼우는 법: app/(main)/(tabs)/_layout.tsx 의
//   <Tabs ... tabBar={(props) => <CustomTabBar {...props} />}>
//
// Figma 시안(node 1:1502): 녹색(#469860) 배경 막대 / 아이콘·라벨 흰색 /
//   활성 탭은 라벨이 Bold, 비활성은 Regular (아이콘은 활성·비활성 동일).
import { colors, spacing } from '@/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── 시안 고정 치수(테마 토큰이 아닌 레이아웃 스펙) ──
const ITEM_HEIGHT = 64; // 탭 1칸 높이 (Figma h-64)
const ICON_SIZE = 24;   // 탭 아이콘 지름 (Figma 24)
const TAB_GAP = 14;     // ⚠️ 토큰 없음 — 탭 사이 간격(Figma gap-14, spacing.sm·md 사이값)
const BOTTOM_PAD = 21;  // ⚠️ 토큰 없음 — 막대 하단 여백(Figma pb-21). SafeArea가 없을 때 최소값으로 사용

// ── 토큰에 없는 값(플래그) ──
const ON_PRIMARY = '#FFFFFF';     // ⚠️ 토큰 없음 — 녹색 배경 위 흰색 글자/아이콘. theme.ts에 onPrimary 토큰 추가 권장
const LABEL_FONT_SIZE = 11;       // ⚠️ 토큰 없음 — typography.caption은 13px. Figma 라벨은 11px
const LABEL_LINE_HEIGHT = 16;     // ⚠️ 토큰 없음 — Figma 줄높이 16px
const ACTIVE_PILL_RADIUS = 10;    // ⚠️ 토큰 없음 — 활성 탭 흰색 박스(알약) 모서리
const ACTIVE_PILL_PAD_H = 16;     // ⚠️ 토큰 없음 — 활성 박스 좌우 안쪽 여백(가로로 넓은 알약)
const ACTIVE_PILL_PAD_V = 4;      // ⚠️ 토큰 없음 — 활성 박스 상하 안쪽 여백
// 폰트: Figma는 Pretendard. 프로젝트에 폰트 로딩이 없어 굵기(Bold/Regular)만 시스템 폰트로 반영. ⚠️

// 각 탭의 아이콘 매핑. route.name(파일 경로 기준)으로 찾는다.
// ⚠️ Figma는 Fluent/Tabler/Boxicons 아이콘을 쓰지만 @expo/vector-icons엔 없고, Figma 원격 SVG는
//    7일 후 만료되므로 가장 가까운 MaterialCommunityIcons로 대체했다(활성·비활성 동일, 흰색 filled).
const TAB_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  index: 'fridge',                        // 냉장고  (Figma: fluent refrigerator)
  'friends/index': 'account-group',       // 커뮤니티 (Figma: fluent people-team)
  'recipes/index': 'format-list-bulleted', // 레시피  (Figma: tabler layout-list)
  'mypage/index': 'account',              // 마이페이지 (Figma: boxicons user)
};

/** expo-router Tabs의 tabBar prop으로 넣는 커스텀 하단 탭바. 4개 탭을 동일 너비로 배치한다. */
type Props = BottomTabBarProps;

export default function CustomTabBar({ state, descriptors, navigation }: Props) {
  const insets = useSafeAreaInsets(); // 홈 인디케이터/노치 영역만큼 아래 여백을 띄우기 위함

  return (
    // 녹색 막대 본체 — 4개 탭을 가로로, 하단은 안전영역(없으면 시안 21px)만큼 여백
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, BOTTOM_PAD) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        // 탭 라벨: _layout.tsx에서 지정한 options.title 우선, 없으면 라우트 이름
        const label = options.title ?? route.name;
        const isFocused = state.index === index; // 지금 보고 있는 탭인지
        const iconName = TAB_ICONS[route.name] ?? 'circle-outline';

        // 탭을 눌렀을 때: 표준 expo-router 탭 동작(이미 활성 탭이면 이동 생략, 기본동작 존중)
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        // 길게 누르기: 접근성/디버그용 표준 이벤트
        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          // 탭 한 칸 — 동일 너비(flex:1), 아이콘 위 / 라벨 아래로 세로 정렬
          <Pressable
            key={route.key}
            style={styles.tab}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
          >
            {/* 아이콘 묶음 — 활성일 때만 흰색 박스(알약)로 감싸고 아이콘은 초록으로 반전 */}
            <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
              <MaterialCommunityIcons name={iconName} size={ICON_SIZE} color={isFocused ? colors.primary : ON_PRIMARY} />
            </View>
            {/* 라벨 — 활성일 때만 Bold, 그 외 Regular (Figma의 유일한 활성 구분) */}
            <Text style={[styles.label, isFocused ? styles.labelActive : styles.labelInactive]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// 아래는 각 부분의 모양·배치를 정하는 스타일 모음. 위 JSX의 style={styles.이름}과 연결된다.
const styles = StyleSheet.create({
  bar: {
    // 녹색 막대 — 탭들을 가로로 14px 간격, 좌우 24px 패딩
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: TAB_GAP,                       // ⚠️ 토큰 없음 (Figma gap-14)
    paddingHorizontal: spacing.lg,      // 24 — spacing.lg
    backgroundColor: colors.primary,    // #469860 — colors.primary (Figma 배경과 정확히 일치)
  },
  tab: {
    // 탭 한 칸 — 4등분 너비, 아이콘+라벨을 세로로(간격 4), 위·아래 패딩 8
    flex: 1,
    height: ITEM_HEIGHT,                // 64 — 시안 고정 치수
    paddingVertical: spacing.sm,        // 8 — spacing.sm
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,                    // 4 — spacing.xs
  },
  iconWrap: {
    // 아이콘 박스 — 비활성은 투명(흰 아이콘만 보임). 활성/비활성 같은 패딩으로 깔아 밀림 방지
    paddingHorizontal: ACTIVE_PILL_PAD_H,
    paddingVertical: ACTIVE_PILL_PAD_V,
    borderRadius: ACTIVE_PILL_RADIUS,
  },
  iconWrapActive: {
    // 활성 탭 — 흰색 채움 박스(알약). 아이콘은 초록으로 반전됨
    backgroundColor: ON_PRIMARY,
  },
  label: {
    // 탭 라벨 공통 — 흰색, 11px/16px, 가운데 정렬 (⚠️ 크기·줄높이 토큰 없음)
    color: ON_PRIMARY,
    fontSize: LABEL_FONT_SIZE,
    lineHeight: LABEL_LINE_HEIGHT,
    textAlign: 'center',
  },
  labelActive: {
    // 활성 탭 라벨 — Bold (Figma: Pretendard Bold). ⚠️ Pretendard 미로딩 → 시스템 굵기로 대체
    fontWeight: '700',
  },
  labelInactive: {
    // 비활성 탭 라벨 — Regular + 흰색(라인 박스로 구분하므로 회색 대신 흰색 유지)
    fontWeight: '400',
  },
});
