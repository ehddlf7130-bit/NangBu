// 친구가 내 냉장고 품목에 남긴 "한마디"를 보여주는 코멘트 카드 부품(컴포넌트).
// 화면이 아니라 다른 화면이 가져다 쓰는 조각이다. (목록 표시 전용인 CommentList와 달리, 흰 카드 1장 단위)
// 카드 모양: 흰 배경 + 그림자 / 위=메시지, 아래=작성자(초록) / 우상단=삭제(휴지통).
import { colors, spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// ── 시안 고정 치수 / 토큰에 없는 값(플래그) ──
const CARD_RADIUS = 15;        // ⚠️ 토큰 없음 — Figma 15(radius.card는 16). 디자이너 확정 시 통합
const CONTENT_GAP = 10;        // ⚠️ 토큰 없음 — 메시지↔작성자 간격(Figma gap-10, spacing.sm·md 사이값)
const MESSAGE_COLOR = '#1A1C1A'; // ⚠️ 토큰 없음 — textPrimary(#1A1A1A)와 미세 차이. Figma 원색 유지
const ICON_SIZE = 22;          // ⚠️ 토큰 없음 — 휴지통 아이콘 크기(Figma 22)
const MESSAGE_FONT_SIZE = 14;  // ⚠️ 토큰 없음 — typography.body는 15px. Figma 메시지 14px
const MESSAGE_LINE_HEIGHT = 28;// ⚠️ 토큰 없음 — Figma 줄높이 28
const NAME_FONT_SIZE = 12;     // ⚠️ 토큰 없음 — typography.caption은 13px. Figma 작성자 12px
const NAME_LINE_HEIGHT = 22;   // ⚠️ 토큰 없음 — Figma 줄높이 22
// 아이콘 색: Figma는 Grays/Gray2(#AEAEB2). 토큰이 없어 가장 가까운 textSecondary(#8E8E93)로 근사. ⚠️
// 폰트: Figma는 Pretendard(Medium/Regular). 프로젝트에 폰트 로딩이 없어 굵기만 반영. ⚠️

// 이 부품이 바깥(부모 화면)에서 받아오는 값들. 텍스트·동작은 전부 props로 받아 하드코딩하지 않는다.
type Props = {
  username: string;      // 작성자 이름(초록색으로 표시)
  message: string;       // 코멘트 내용
  onPress?: () => void;  // 카드를 눌렀을 때 할 일(상세 등). 없으면 단순 표시용
  onDelete?: () => void; // 우상단 휴지통을 눌렀을 때 할 일(삭제). 없으면 휴지통 자체를 숨김
};

/** 코멘트 한 개를 그리는 흰 카드. 위=메시지 / 아래=작성자(초록) / 우상단=삭제 버튼. */
export default function CommentCard({ username, message, onPress, onDelete }: Props) {
  return (
    // 카드 전체 — onPress가 있으면 탭 가능(Figma의 <a> 대응), 없으면 그냥 표시
    <Pressable style={styles.card} onPress={onPress} disabled={!onPress}>
      {/* 글자 묶음: 메시지(위) + 작성자(아래) */}
      <View style={styles.body}>
        <Text style={styles.message}>{message}</Text>
        <Text style={styles.username}>{username}</Text>
      </View>

      {/* 우상단 삭제 버튼 — onDelete가 있을 때만 표시 */}
      {onDelete && (
        <Pressable
          style={styles.deleteBtn}
          onPress={onDelete}
          hitSlop={spacing.sm}
          accessibilityRole="button"
          accessibilityLabel="코멘트 삭제"
        >
          <Ionicons name="trash-outline" size={ICON_SIZE} color={colors.textSecondary} />
        </Pressable>
      )}
    </Pressable>
  );
}

// 아래는 각 부분의 모양·배치를 정하는 스타일 모음. 위 JSX의 style={styles.이름}과 연결된다.
const styles = StyleSheet.create({
  card: {
    // 흰 카드 틀 — 둥근 모서리 + 은은한 그림자, 안쪽 패딩 16
    backgroundColor: colors.background, // #FFFFFF — colors.background
    borderRadius: CARD_RADIUS,          // ⚠️ 15 (토큰 없음)
    padding: spacing.md,                // 16 — spacing.md
    // 그림자: 색은 colors.thumbnail(#213A24=rgba 33,58,36)과 일치, 나머지는 ⚠️ 토큰 없음
    shadowColor: colors.thumbnail,
    shadowOffset: { width: 0, height: 2 }, // ⚠️
    shadowOpacity: 0.05,                   // ⚠️
    shadowRadius: 4,                       // ⚠️
    elevation: 2,                          // ⚠️ Android 그림자 근사값
  },
  body: {
    // 메시지+작성자를 세로로, 간격 10
    gap: CONTENT_GAP, // ⚠️ 10 (토큰 없음)
  },
  message: {
    // 메시지 글자 — 14px/28, 진한 회색
    fontSize: MESSAGE_FONT_SIZE,    // ⚠️
    lineHeight: MESSAGE_LINE_HEIGHT,// ⚠️
    color: MESSAGE_COLOR,           // ⚠️ #1A1C1A
    fontWeight: '400',
  },
  username: {
    // 작성자 글자 — 12px/22, 초록, 약간 굵게(Medium)
    fontSize: NAME_FONT_SIZE,    // ⚠️
    lineHeight: NAME_LINE_HEIGHT,// ⚠️
    color: colors.primary,       // #469860 — colors.primary
    fontWeight: '500',           // ⚠️ Pretendard Medium 근사
  },
  deleteBtn: {
    // 우상단 휴지통 — 카드 모서리에서 패딩만큼 안쪽에 고정
    position: 'absolute',
    top: spacing.md,   // 16 — spacing.md
    right: spacing.md, // 16 — spacing.md
  },
});
