import { colors, radius, spacing, typography } from '@/constants/theme';
import { getDday, getDdayColor } from '@/lib/expiry';
import { formatExpireDate } from '@/lib/format';
import { STORAGE_LABELS, type Item } from '@/types/item';
import { StyleSheet, Text, View } from 'react-native';

const IMAGE_HEIGHT = 200; // 시안 고정 치수 (사진 기능 전까지 단색 placeholder)
const STATUS_DOT_SIZE = 10;

// 표준 보관 정보가 단정적으로 들리지 않도록 한 중립 안내 문구.
const NOTICE_TEXT = '표준 보관 정보는 참고용이에요. 식품 상태를 직접 확인해 주세요.';

/** 품목 정보를 읽기 전용으로 표시하는 컴포넌트 (재료 정보 화면 전용). */
export default function ItemDetail({ item }: { item: Item }) {
  const tip = item.storage_tip?.trim();
  const hasTip = !!tip;
  const dday = item.expire_date ? getDday(item.expire_date) : null;

  // 줄바꿈이 있으면 불릿 리스트, 없으면 한 단락.
  const tipLines = hasTip ? tip.split('\n').map((l) => l.trim()).filter(Boolean) : [];
  const asBullets = (tip?.includes('\n') ?? false) && tipLines.length > 1;

  return (
    <View>
      {/* 2. 상단 이미지 자리(단색 placeholder) */}
      <View style={styles.image} />

      <View style={styles.content}>
        {/* 3. 이름 + 보관방식 */}
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.storage}>{STORAGE_LABELS[item.storage]}</Text>
        </View>

        {/* 4. 소비기한 + 상태점 (유통기한 없으면 숨김) */}
        {item.expire_date && dday !== null && (
          <View style={styles.expiryRow}>
            <Text style={styles.expiryText}>
              권장 소비기한 <Text style={styles.expiryDate}>{formatExpireDate(item.expire_date)}</Text> 까지
            </Text>
            <View style={[styles.statusDot, { backgroundColor: getDdayColor(dday) }]} />
          </View>
        )}

        {/* 5. 안내 박스 (보관 정보가 있을 때만) */}
        {hasTip && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{NOTICE_TEXT}</Text>
          </View>
        )}

        {/* 6 + 7. 구분선 + 보관 팁 섹션 (보관 정보가 있을 때만) */}
        {hasTip && (
          <>
            <View style={styles.divider} />
            <Text style={styles.tipTitle}>{STORAGE_LABELS[item.storage]} 보관</Text>
            <View style={styles.tipBox}>
              {asBullets ? (
                tipLines.map((line, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{line}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.bulletText}>{tip}</Text>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: colors.thumbnail,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: { ...typography.heading1, color: colors.textPrimary, flexShrink: 1 },
  storage: { ...typography.body, color: colors.textSecondary },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  expiryText: { ...typography.body, color: colors.textSecondary, flexShrink: 1 },
  expiryDate: { color: colors.textPrimary, fontWeight: typography.heading2.fontWeight },
  statusDot: {
    width: STATUS_DOT_SIZE,
    height: STATUS_DOT_SIZE,
    borderRadius: STATUS_DOT_SIZE / 2,
  },
  noticeBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  noticeText: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  tipTitle: { ...typography.heading2, color: colors.textPrimary },
  tipBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  bulletRow: { flexDirection: 'row', gap: spacing.sm },
  bullet: { ...typography.body, color: colors.textPrimary },
  bulletText: { ...typography.body, color: colors.textPrimary, flex: 1, lineHeight: 21 },
});
