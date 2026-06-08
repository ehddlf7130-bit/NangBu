import { colors, spacing, typography } from '@/constants/theme';
import { getDday, getDdayColor } from '@/lib/expiry';
import { formatExpireDate } from '@/lib/format';
import { STORAGE_LABELS, type Item } from '@/types/item';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 시안 고정 치수 (테마 토큰이 아닌 레이아웃 스펙).
const THUMB_SIZE = 44; // 원형 썸네일 지름
const DOT_SIZE = 8;    // 상태점 지름

// 남은 일수 → "D-21" / "D-DAY" / "D+3"(지남) 표기.
function ddayLabel(dday: number): string {
  if (dday === 0) return 'D-DAY';
  return dday > 0 ? `D-${dday}` : `D+${-dday}`;
}

type Props = {
  item: Item;
  onPress: () => void;
  onLongPress?: () => void;
};

/** 나의 냉장고 목록의 한 행. 좌=원형 썸네일 / 중=이름·D-day·소비기한·보관방식 / 우=상태점. */
export default function FridgeItemRow({ item, onPress, onLongPress }: Props) {
  const dday = item.expire_date ? getDday(item.expire_date) : null;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
    >
      <View style={styles.thumb} />

      <View style={styles.body}>
        <View style={styles.titleLine}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          {dday !== null && <Text style={styles.dday}>{ddayLabel(dday)}</Text>}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {item.expire_date ? `${formatExpireDate(item.expire_date)} 까지 · ` : ''}
          {STORAGE_LABELS[item.storage]}
        </Text>
      </View>

      {dday !== null && (
        <View style={[styles.dot, { backgroundColor: getDdayColor(dday) }]} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.thumbnail,
  },
  body: {
    flex: 1,
    marginLeft: spacing.md,
    gap: spacing.xs,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.heading2,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  dday: {
    ...typography.body,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginLeft: spacing.sm,
  },
});
