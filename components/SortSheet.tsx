// 정렬 방식을 고르는 "바텀시트"(화면 아래에서 슬며시 올라오는 작은 패널) 부품.
// 냉장고 메인 화면에서 정렬 버튼을 누르면 나타나, 기본순/이름순/유통기한순 중 하나를 고르게 한다.
// 옵션을 고르거나 어두운 배경(스크림)을 누르면 닫힌다.
import { colors, radius, spacing, typography } from '@/constants/theme';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type SortKey = 'default' | 'name' | 'expiry';

// 각 정렬 방식이 화면에 보일 한글 이름. (정렬 버튼 글자에도 이 값이 쓰인다)
export const SORT_LABELS: Record<SortKey, string> = {
  default: '기본순',
  name: '이름순',
  expiry: '유통기한순',
};

const SORT_ORDER: SortKey[] = ['default', 'name', 'expiry']; // 시트에 옵션을 보여줄 순서

// 이 부품이 바깥(부모 화면)에서 받아오는 값들.
type Props = {
  visible: boolean; // 시트를 보여줄지 여부. true면 화면 아래에서 올라온다
  selected: SortKey; // 지금 선택된 정렬 방식(옆에 체크 표시가 붙는다)
  onSelect: (key: SortKey) => void; // 옵션을 골랐을 때 부모에게 알려주는 함수
  onClose: () => void; // 시트를 닫아달라고 부모에게 알려주는 함수
};

/** 하단에서 올라오는 정렬 바텀시트. 옵션 선택 시 콜백 후 닫히고, 스크림 탭으로도 닫힌다. */
export default function SortSheet({ visible, selected, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* 스크림: 탭하면 닫힘 */}
      <Pressable style={styles.scrim} onPress={onClose}>
        {/* 시트 본체: 탭이 스크림으로 전파되지 않도록 onPress를 흡수 */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* 시트 맨 위 가운데의 짧은 손잡이 막대(장식) */}
          <View style={styles.handle} />
          {/* 정렬 옵션들을 한 줄씩 그린다. 지금 선택된 것(active)만 색을 입히고 오른쪽에 ✓ 표시 */}
          {SORT_ORDER.map((key) => {
            const active = key === selected; // 이 옵션이 지금 선택된 정렬인지
            return (
              <TouchableOpacity
                key={key}
                style={styles.option}
                onPress={() => {
                  onSelect(key); // 부모에게 "이걸로 정렬해줘" 알리고
                  onClose();     // 시트를 닫는다
                }}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>
                  {SORT_LABELS[key]}
                </Text>
                {/* 선택된 옵션에만 오른쪽 체크(✓) 표시 */}
                {active && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// 아래는 각 부분의 모양·배치를 정하는 스타일 모음. 위 JSX의 style={styles.이름}과 연결된다.
const styles = StyleSheet.create({
  scrim: { // 시트 뒤를 덮는 반투명 어두운 배경. 시트를 화면 아래쪽에 붙인다
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: { // 실제 시트 패널 — 위 모서리만 둥글고 흰 배경
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  handle: { // 시트 맨 위 가운데 손잡이 막대(장식)
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  option: { // 정렬 옵션 한 줄 — 글자(왼쪽)와 체크(오른쪽)를 양끝으로 배치
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  optionText: { // 옵션 글자(평소)
    ...typography.body,
    color: colors.textPrimary,
  },
  optionTextActive: { // 선택된 옵션 글자(강조 색+굵게)
    color: colors.primary,
    fontWeight: typography.heading2.fontWeight,
  },
  check: { // 선택된 옵션 오른쪽 체크(✓) 표시
    ...typography.body,
    color: colors.primary,
  },
});
