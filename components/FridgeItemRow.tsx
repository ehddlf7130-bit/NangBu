// 냉장고 목록에서 "재료 한 줄"을 그리는 부품(컴포넌트). 화면이 아니라 다른 화면이 가져다 쓰는 조각이다.
// 냉장고 메인 화면이 재료 개수만큼 이 부품을 반복해서 목록을 만든다.
// 한 줄 모양: 왼쪽 원형 썸네일 / 가운데 이름·D-day·임박도 색점 + 소비기한·보관방식 / 오른쪽 셰브론.
import { colors, spacing, typography } from '@/constants/theme';
import { getDday, getDdayColor } from '@/lib/expiry';
import { formatExpireDate } from '@/lib/format';
import { STORAGE_LABELS, type Item } from '@/types/item';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 시안 고정 치수 (테마 토큰이 아닌 레이아웃 스펙).
const THUMB_SIZE = 50; // 원형 썸네일 지름
const DOT_SIZE = 10;   // 상태점 지름

// 남은 일수 → "D-21" / "D-DAY" / "D+3"(지남) 표기.
function ddayLabel(dday: number): string {
  if (dday === 0) return 'D-DAY';
  return dday > 0 ? `D-${dday}` : `D+${-dday}`;
}

// 이 부품이 바깥(부모 화면)에서 받아오는 값들.
type Props = {
  item: Item; // 보여줄 재료 한 개의 정보(이름·보관방식·유통기한 등)
  onPress: () => void; // 줄을 한 번 눌렀을 때 할 일(상세 화면으로 이동)
  onLongPress?: () => void; // 줄을 길게 눌렀을 때 할 일(삭제). 없을 수도 있음(?)
};

/** 나의 냉장고 목록의 한 행. 좌=원형 썸네일 / 중=이름·D-day·소비기한·보관방식 / 우=상태점. */
export default function FridgeItemRow({ item, onPress, onLongPress }: Props) {
  const dday = item.expire_date ? getDday(item.expire_date) : null; // 남은 일수. 유통기한이 없으면 null(=D-day와 색점 숨김)

  return (
    // 줄 전체가 버튼 — 누르면 onPress, 0.4초 이상 누르면 onLongPress 실행
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
    >
      {/* 좌: 원형 썸네일 */}
      <View style={styles.thumb} />

      {/* 중: 이름 + D-day + 임박도 색점 / 소비기한·보관방식 */}
      <View style={styles.body}>
        <View style={styles.titleLine}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          {/* 유통기한 있을 때만 D-day 라벨 + 임박도 색점 */}
          {dday !== null && (
            <>
              <Text style={styles.dday}>{ddayLabel(dday)}</Text>
              <View style={[styles.dot, { backgroundColor: getDdayColor(dday) }]} />
            </>
          )}
        </View>
        {/* 아랫줄: 유통기한이 있으면 'OO까지-', 그 뒤에 항상 보관방식(냉장/냉동/실온) */}
        <Text style={styles.meta} numberOfLines={1}>
          {item.expire_date ? `${formatExpireDate(item.expire_date)}까지-` : ''}
          {STORAGE_LABELS[item.storage]}
        </Text>
      </View>

      {/* 우: 상세 이동 셰브론 */}
      <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

// 아래는 각 부분의 모양·배치를 정하는 스타일 모음. 위 JSX의 style={styles.이름}과 연결된다.
const styles = StyleSheet.create({
  row: { // 줄 전체 틀 — 좌/중/우를 가로로 두고 아래에 얇은 구분선
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  thumb: { // 왼쪽 원형 썸네일(지금은 단색 자리)
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.thumbnail,
  },
  body: { // 가운데 글자 묶음(이름줄 + 소비기한·보관방식줄). 남는 가로폭을 모두 차지
    flex: 1,
    marginLeft: spacing.md,
    gap: spacing.xs,
  },
  titleLine: { // 이름줄 — 이름과 D-day 라벨을 가로로 나란히
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: { // 재료 이름 글자(굵게)
    ...typography.heading2,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  dday: { // 이름 옆 D-day 라벨 글자(예: 'D-3'). 시안 기준 굵게
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  meta: { // 아랫줄 소비기한·보관방식 글자(흐린 색)
    ...typography.caption,
    color: colors.textSecondary,
  },
  dot: { // 이름·D-day 옆 임박도 색점(유통기한이 가까울수록 경고색)
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
