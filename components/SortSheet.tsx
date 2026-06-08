import { colors, radius, spacing, typography } from '@/constants/theme';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type SortKey = 'default' | 'name' | 'expiry';

export const SORT_LABELS: Record<SortKey, string> = {
  default: '기본순',
  name: '이름순',
  expiry: '유통기한순',
};

const SORT_ORDER: SortKey[] = ['default', 'name', 'expiry'];

type Props = {
  visible: boolean;
  selected: SortKey;
  onSelect: (key: SortKey) => void;
  onClose: () => void;
};

/** 하단에서 올라오는 정렬 바텀시트. 옵션 선택 시 콜백 후 닫히고, 스크림 탭으로도 닫힌다. */
export default function SortSheet({ visible, selected, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* 스크림: 탭하면 닫힘 */}
      <Pressable style={styles.scrim} onPress={onClose}>
        {/* 시트 본체: 탭이 스크림으로 전파되지 않도록 onPress를 흡수 */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          {SORT_ORDER.map((key) => {
            const active = key === selected;
            return (
              <TouchableOpacity
                key={key}
                style={styles.option}
                onPress={() => {
                  onSelect(key);
                  onClose();
                }}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>
                  {SORT_LABELS[key]}
                </Text>
                {active && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  optionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  optionTextActive: {
    color: colors.primary,
    fontWeight: typography.heading2.fontWeight,
  },
  check: {
    ...typography.body,
    color: colors.primary,
  },
});
