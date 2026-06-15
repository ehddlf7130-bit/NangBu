// 재료 한 개의 상세 정보 화면. 냉장고/친구 목록에서 재료 한 줄을 누르면 들어온다.
// 주소(URL)의 itemId로 어떤 재료인지 알아내 서버에서 그 재료를 불러온다.
// 같은 화면이지만 내 재료면 '편집' 버튼(OwnerView), 친구 재료면 코멘트 작성칸(FriendView)을 보여준다.
import { colors, radius, spacing, typography } from '@/constants/theme';
import CommentCardList from '@/components/CommentCardList';
import ItemDetail from '@/components/ItemDetail';
import { useAuth } from '@/contexts/AuthContext';
import { createComment, fetchComments } from '@/lib/comments';
import { extractErrorMessage, fetchItem } from '@/lib/items';
import type { Comment } from '@/types/comment';
import type { Item } from '@/types/item';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const BACK_ICON_SIZE = 26;
const MEMO_BAR_RADIUS = 12; // ⚠️ 토큰 없음 — Figma 12 (radius.sm=8·card=16 사이). 디자이너 확정 시 통합
const MEMO_PLUS_SIZE = 20;  // ⚠️ 토큰 없음 — '＋ 메모'의 '＋' 글자 크기(Figma 20)

// 재료 정보(읽기 전용) 화면.
// 내 재료로 진입 → '편집' 버튼(편집 화면으로 이동).
// 친구 재료로 진입 → 코멘트 목록 + 작성.
export default function ItemInfoScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>(); // 주소에 담겨온 재료 id — 어떤 재료를 보여줄지 결정
  const { user } = useAuth(); // 지금 로그인한 사용자 (이 재료가 내 것인지 판단할 때 사용)
  // state = "화면이 기억하는 값". 바뀌면 화면이 다시 그려진다.
  const [item, setItem] = useState<Item | null>(null); // 불러온 재료 정보. 아직 없으면 null
  const [loading, setLoading] = useState(true); // 불러오는 중인지. true면 로딩 동그라미를 보여준다
  const [error, setError] = useState<string | null>(null); // 실패 메시지. 있으면 에러 문구를 보여준다

  useEffect(() => {
    if (!itemId) return;
    let active = true;
    setLoading(true);
    setError(null);
    fetchItem(itemId)
      .then((data) => { if (active) setItem(data); })
      .catch((e: unknown) => { if (active) setError(extractErrorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [itemId]);

  // 불러오는 동안에는 화면 가운데 로딩 동그라미만 보여준다.
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // 실패했거나 재료를 못 찾으면 에러 문구만 보여준다.
  if (error || !item) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? '품목을 찾을 수 없습니다.'}</Text>
      </View>
    );
  }

  const isOwner = item.owner_id === user?.id; // 이 재료가 내 것인지(주인=나). 화면을 둘 중 무엇으로 보여줄지 가른다

  return (
    <View style={styles.container}>
      {/* 1. 헤더: 뒤로가기만 (제목 없음) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={BACK_ICON_SIZE} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* 내 재료 → 편집뷰(편집 버튼), 친구 재료 → 코멘트 작성뷰 */}
      {isOwner ? (
        <OwnerView item={item} />
      ) : (
        <FriendView item={item} userId={user?.id ?? null} />
      )}
    </View>
  );
}

/** 내 재료일 때 보여주는 화면: 재료 정보 + '편집' 버튼 + 코멘트 목록(읽기 전용, 작성칸 없음). */
function OwnerView({ item }: { item: Item }) {
  const [comments, setComments] = useState<Comment[]>([]); // 이 재료에 달린 코멘트 목록
  const [commentLoading, setCommentLoading] = useState(true); // 코멘트 불러오는 중인지
  const [commentError, setCommentError] = useState<string | null>(null); // 코멘트 불러오기 실패 메시지

  useEffect(() => {
    let active = true;
    setCommentLoading(true);
    setCommentError(null);
    fetchComments(item.id)
      .then((c) => { if (active) setComments(c); })
      .catch((e: unknown) => { if (active) setCommentError(extractErrorMessage(e)); })
      .finally(() => { if (active) setCommentLoading(false); });
    return () => { active = false; };
  }, [item.id]);

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── 재료 정보 ── */}
      <ItemDetail item={item} />
      {/* ── 편집 버튼 (편집 화면으로 이동) ── */}
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => router.push(`/(main)/fridge/${item.id}` as never)}
      >
        <Text style={styles.editText}>편집</Text>
      </TouchableOpacity>
      {/* ── 메모(코멘트) 목록 (읽기 전용) ── */}
      <View style={styles.memoDivider} />
      <View style={styles.commentSection}>
        <Text style={styles.commentTitle}>메모</Text>
        <CommentCardList comments={comments} loading={commentLoading} error={commentError} />
      </View>
    </ScrollView>
  );
}

/** 친구 재료일 때 보여주는 화면: 재료 정보 + 코멘트 목록 + 아래 입력칸으로 코멘트 작성 가능. */
function FriendView({ item, userId }: { item: Item; userId: string | null }) {
  const [comments, setComments] = useState<Comment[]>([]); // 이 재료에 달린 코멘트 목록
  const [commentLoading, setCommentLoading] = useState(true); // 코멘트 불러오는 중인지
  const [commentError, setCommentError] = useState<string | null>(null); // 코멘트 불러오기 실패 메시지
  const [text, setText] = useState(''); // 입력칸에 지금 적고 있는 글자. 비어 있으면 '작성' 버튼이 눌리지 않는다
  const [posting, setPosting] = useState(false); // 코멘트 전송 중인지. true면 버튼이 로딩 표시로 바뀌고 잠긴다

  useEffect(() => {
    let active = true;
    setCommentLoading(true);
    setCommentError(null);
    fetchComments(item.id)
      .then((c) => { if (active) setComments(c); })
      .catch((e: unknown) => { if (active) setCommentError(extractErrorMessage(e)); })
      .finally(() => { if (active) setCommentLoading(false); });
    return () => { active = false; };
  }, [item.id]);

  async function handlePost() {
    if (!userId) return;
    const content = text.trim();
    if (!content) return;
    setPosting(true);
    try {
      await createComment(item.id, userId, content);
      setText('');
      setComments(await fetchComments(item.id));
    } catch (e: unknown) {
      Alert.alert('작성 실패', extractErrorMessage(e));
    } finally {
      setPosting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.body}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* ── 재료 정보 ── */}
        <ItemDetail item={item} />
        {/* ── 메모(코멘트) 목록 ── */}
        <View style={styles.memoDivider} />
        <View style={styles.commentSection}>
          <Text style={styles.commentTitle}>메모</Text>
          <CommentCardList comments={comments} loading={commentLoading} error={commentError} />
        </View>
      </ScrollView>

      {/* ── 하단 '새 메모 추가' 입력 바 (입력칸 + ＋메모 버튼) ── */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.memoInput}
          value={text}
          onChangeText={setText}
          placeholder="새 메모 추가"
          placeholderTextColor={colors.textTertiary}
          editable={!posting}
          multiline
        />
        {/* '＋ 메모' 버튼: 전송 중이거나 입력칸이 비면 흐려지고 눌리지 않는다 */}
        <TouchableOpacity
          style={[styles.memoButton, (posting || !text.trim()) && styles.memoButtonDisabled]}
          onPress={handlePost}
          disabled={posting || !text.trim()}
        >
          {/* 전송 중이면 로딩 동그라미, 아니면 '＋ 메모' 글자 */}
          {posting ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.memoLabel}>
              <Text style={styles.memoPlus}>＋</Text> 메모
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// 아래는 각 부분의 모양·배치를 정하는 스타일 모음. 위 JSX의 style={styles.이름}과 연결된다.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, // 화면 전체를 감싸는 바깥 틀(배경색)
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, // 로딩 동그라미·에러 문구를 화면 한가운데 놓는 틀
  header: { // 맨 위 헤더 줄(뒤로가기 화살표만 들어있음)의 여백
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  body: { flex: 1 }, // 헤더 아래 본문 영역(스크롤되는 부분)을 화면 가득 채움
  bodyContent: { paddingBottom: spacing.lg }, // 스크롤 본문 맨 아래 여백
  editButton: { // 내 재료일 때 보이는 '편집' 버튼 모양(파란 박스)
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  editText: { ...typography.body, color: colors.background, fontWeight: typography.heading1.fontWeight }, // '편집' 버튼 안 글자(흰색·굵게)
  memoDivider: { height: 2, backgroundColor: colors.primary, marginTop: spacing.md }, // 재료 정보와 '메모' 섹션을 가르는 시안의 초록 강조선(풀블리드)
  commentSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm }, // '메모' 제목 + 메모 목록을 묶는 영역
  commentTitle: { ...typography.heading2, color: colors.textPrimary }, // '메모' 소제목 글자
  inputBar: { // 친구 재료일 때 화면 맨 아래 고정되는 '새 메모 추가' 바(입력칸 + ＋메모 버튼). 시안: 초록 테두리 박스
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: MEMO_BAR_RADIUS,
    backgroundColor: colors.background,
  },
  memoInput: { // 메모를 적는 입력칸(바 내부, 자체 테두리 없음)
    flex: 1,
    maxHeight: 80,
    paddingVertical: 0,
    ...typography.body,
    color: colors.textPrimary,
  },
  memoButton: { flexDirection: 'row', alignItems: 'center' }, // 오른쪽 '＋ 메모' 버튼(초록 글자)
  memoButtonDisabled: { opacity: 0.4 }, // 비활성(전송 중·입력칸 빔)일 때 흐리게
  memoLabel: { ...typography.body, color: colors.primary, fontWeight: '700' }, // '메모' 글자(초록·굵게)
  memoPlus: { fontSize: MEMO_PLUS_SIZE, color: colors.primary, fontWeight: '700' }, // '＋' 기호(조금 큼)
  errorText: { ...typography.body, color: colors.danger }, // 에러 메시지 글자(빨간색)
});
