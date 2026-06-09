// "+" 모양의 추가(add) 버튼 부품(컴포넌트). 화면이 아니라 다른 화면이 가져다 쓰는 조각이다.
// Figma 시안(node 1:235, ic:baseline-plus): 44×44 영역의 검정 플러스 아이콘. 배경/테두리는 없다.
// 누르면 onPress 실행 — 보통 재료/레시피 등을 새로 추가할 때 쓴다.
import { colors } from '@/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

// 시안 고정 치수(테마 토큰이 아닌 레이아웃 스펙).
const PLUS_SIZE = 44; // 버튼(터치 영역) 한 변 — Figma 44, iOS 표준 터치 크기와도 일치

// 이 부품이 바깥(부모 화면)에서 받아오는 값들. 바뀔 수 있는 값은 전부 props로 받는다.
type Props = {
  onPress: () => void;          // 눌렀을 때 할 일(추가 동작)
  size?: number;                // 버튼 한 변 크기. 기본 44(Figma)
  color?: string;               // 플러스 아이콘 색. 기본 textPrimary(검정 계열)
  accessibilityLabel?: string;  // 스크린리더용 설명. 기본 '추가'
};

/** "+" 추가 버튼. 정사각 터치 영역 가운데에 플러스 아이콘을 그린다. */
export default function AddButton({
  onPress,
  size = PLUS_SIZE,
  color = colors.textPrimary,
  accessibilityLabel = '추가',
}: Props) {
  return (
    // 정사각 버튼 — 아이콘을 가운데 정렬. 누르면 살짝 흐려져 눌린 느낌을 준다.
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.button, { width: size, height: size }, pressed && styles.pressed]}
    >
      {/* 플러스 아이콘 — Figma는 ic:baseline-plus. @expo/vector-icons엔 없어 MaterialCommunityIcons 'plus'로 대체 */}
      <MaterialCommunityIcons name="plus" size={size} color={color} />
    </Pressable>
  );
}

// 아래는 각 부분의 모양·배치를 정하는 스타일 모음. 위 JSX의 style={styles.이름}과 연결된다.
const styles = StyleSheet.create({
  button: {
    // 정사각 터치 영역 — 아이콘을 정중앙에
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    // 눌렸을 때 살짝 흐리게
    opacity: 0.6,
  },
});
