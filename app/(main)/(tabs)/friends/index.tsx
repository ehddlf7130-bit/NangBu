// 커뮤니티(친구) 화면. 친구를 "냉장고 카드" 2열 그리드로 보여준다(Figma node 1:534).
// 헤더의 친구추가(사람+) 아이콘을 누르면 "친구 추가" 모달(node 1:671)이 뜬다.
// 디자인에 없는 상태(받은 요청 섹션/빈 상태/로딩/에러)는 삭제하지 않고 새 톤으로 유지한다.
import { button, colors, radius, spacing, typography } from '@/constants/theme';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { addFriend, acceptFriend, fetchFriends, fetchPendingRequests, removeFriend } from '@/lib/friends';
import { extractErrorMessage } from '@/lib/items';
import type { Friend, PendingRequest } from '@/types/friend';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ── 시안 고정 치수 / 토큰에 없는 값(플래그) ──
const LOGO_SIZE = 20;        // ⚠️ 토큰 없음 — 헤더 Logo (Figma SemiBold 20)
const ADD_ICON_SIZE = 26;    // 헤더 친구추가(사람+) 아이콘
const SEARCH_ICON_SIZE = 16; // 모달 돋보기 아이콘 (Figma 15)
const CARD_GAP = 10;         // ⚠️ 토큰 없음 — 카드 내부 세로 간격 (Figma gap-10)
const CARD_MIN_HEIGHT = 105; // ⚠️ 토큰 없음 — 카드 높이 (Figma 105)
const CARD_TITLE_SIZE = 16;  // ⚠️ 토큰 없음 — 카드 제목 (Figma 16, typography엔 16 없음)
const MODAL_TITLE_SIZE = 16; // ⚠️ 토큰 없음 — 모달 제목 (Figma 16)
// 카드 그림자: 색은 colors.thumbnail(#213A24=rgba 33,58,36)과 일치, 나머지(offset/opacity/radius)는 ⚠️ 토큰 없음

export default function FriendsScreen() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false); // '친구 추가' 모달 표시 여부(표현용 state)

  const loadAll = useCallback(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([fetchFriends(user.id), fetchPendingRequests(user.id)])
      .then(([f, p]) => {
        if (!active) return;
        setFriends(f);
        setPendingRequests(p);
      })
      .catch((e: unknown) => { if (active) setError(extractErrorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  useFocusEffect(loadAll);

  async function handleAdd() {
    if (!user) return;
    const target = username.trim();
    if (!target) {
      Alert.alert('알림', '추가할 친구의 아이디를 입력해주세요.');
      return;
    }
    setAdding(true);
    try {
      const profile = await addFriend(user.id, target);
      setUsername('');
      setAddModalVisible(false);
      Alert.alert('친구 요청', `${profile.display_name}님에게 친구 요청을 보냈어요.`);
    } catch (e: unknown) {
      Alert.alert('요청 실패', extractErrorMessage(e));
    } finally {
      setAdding(false);
    }
  }

  async function handleAccept(req: PendingRequest) {
    setAcceptingId(req.friendshipId);
    try {
      await acceptFriend(req.friendshipId);
      setPendingRequests((prev) => prev.filter((r) => r.friendshipId !== req.friendshipId));
      // 수락 후 친구 목록 갱신
      if (user) {
        fetchFriends(user.id).then(setFriends).catch(() => {});
      }
    } catch (e: unknown) {
      Alert.alert('수락 실패', extractErrorMessage(e));
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleReject(req: PendingRequest) {
    Alert.alert(
      '요청 거절',
      `${req.profile.display_name}님의 친구 요청을 거절할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '거절',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(req.friendshipId);
              setPendingRequests((prev) => prev.filter((r) => r.friendshipId !== req.friendshipId));
            } catch (e: unknown) {
              Alert.alert('거절 실패', extractErrorMessage(e));
            }
          },
        },
      ],
    );
  }

  function handleRemove(friend: Friend) {
    Alert.alert(
      '친구 삭제',
      `${friend.profile.display_name}님을 친구 목록에서 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(friend.friendshipId);
            try {
              await removeFriend(friend.friendshipId);
              setFriends((prev) => prev.filter((f) => f.friendshipId !== friend.friendshipId));
            } catch (e: unknown) {
              Alert.alert('삭제 실패', extractErrorMessage(e));
            } finally {
              setRemovingId(null);
            }
          },
        },
      ],
    );
  }

  // 받은 친구 요청 섹션 — 디자인엔 없지만 유지(카드 그리드 위, 중립 카드 톤). 요청이 있을 때만 표시.
  const ListHeader = pendingRequests.length > 0 ? (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>받은 친구 요청 {pendingRequests.length}</Text>
      {pendingRequests.map((req) => (
        <RequestRow
          key={req.friendshipId}
          request={req}
          accepting={acceptingId === req.friendshipId}
          onAccept={() => handleAccept(req)}
          onReject={() => handleReject(req)}
        />
      ))}
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      {/* 1. 헤더: 좌측 Logo / 우측 알림종 + 친구추가 아이콘 */}
      <View style={styles.header}>
        <Text style={styles.logo}>Pantree</Text>
        <View style={styles.headerActions}>
          <NotificationBell />
          <TouchableOpacity
            onPress={() => setAddModalVisible(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="친구 추가"
          >
            <Ionicons name="person-add-outline" size={ADD_ICON_SIZE} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. 화면 제목 */}
      <Text style={styles.title}>커뮤니티</Text>

      {/* 3. 본문: 로딩 / 에러 / 친구 카드 그리드 */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(f) => f.friendshipId}
          numColumns={2}
          ListHeaderComponent={ListHeader}
          columnWrapperStyle={styles.column}
          contentContainerStyle={
            friends.length === 0 && pendingRequests.length === 0
              ? styles.emptyContainer
              : styles.list
          }
          ListEmptyComponent={pendingRequests.length === 0 ? <EmptyState /> : null}
          renderItem={({ item }) => (
            <FriendCard
              friend={item}
              removing={removingId === item.friendshipId}
              onPress={() => router.push(`/(main)/friends/${item.profile.id}` as never)}
              onLongPress={() => handleRemove(item)}
            />
          )}
        />
      )}

      {/* 4. 친구 추가 모달 (헤더 아이콘으로 염) */}
      <AddFriendModal
        visible={addModalVisible}
        username={username}
        adding={adding}
        onChangeUsername={setUsername}
        onClose={() => setAddModalVisible(false)}
        onSubmit={handleAdd}
      />
    </View>
  );
}

/** 받은 친구 요청 한 줄 — 이름/아이디 + 수락·거절. (디자인 외 유지 요소, 중립 카드 톤) */
function RequestRow({
  request,
  accepting,
  onAccept,
  onReject,
}: {
  request: PendingRequest;
  accepting: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <View style={styles.requestRow}>
      <View style={styles.rowMain}>
        <Text style={styles.rowName}>{request.profile.display_name}</Text>
        <Text style={styles.rowMeta}>@{request.profile.username}</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.acceptButton, accepting && styles.actionDisabled]}
          onPress={onAccept}
          disabled={accepting}
        >
          {accepting ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={styles.acceptText}>수락</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rejectButton, accepting && styles.actionDisabled]}
          onPress={onReject}
          disabled={accepting}
        >
          <Text style={styles.rejectText}>거절</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** 친구 1명을 그리는 "냉장고 카드". 제목=이름 / 아래=@아이디. 탭=상세, 롱프레스=삭제. */
function FriendCard({
  friend,
  removing,
  onPress,
  onLongPress,
}: {
  friend: Friend;
  removing: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, removing && styles.cardRemoving]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      disabled={removing}
      activeOpacity={0.8}
    >
      <Text style={styles.cardTitle} numberOfLines={1}>{friend.profile.display_name}</Text>
      {removing ? (
        <ActivityIndicator size="small" color={colors.danger} />
      ) : (
        <Text style={styles.cardMeta} numberOfLines={1}>@{friend.profile.username}</Text>
      )}
    </TouchableOpacity>
  );
}

/** 친구 추가 모달 — 스크림 + 흰 카드 + 돋보기 입력 + '추가하기' 알약 버튼 (Figma node 1:671). */
function AddFriendModal({
  visible,
  username,
  adding,
  onChangeUsername,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  username: string;
  adding: boolean;
  onChangeUsername: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const canSubmit = !!username.trim() && !adding; // 입력 있고 전송 중 아닐 때만 활성
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* 어두운 스크림 — 누르면 닫힘 */}
      <Pressable style={styles.scrim} onPress={onClose}>
        {/* 카드 본체 — 자체 Pressable이 터치를 잡아 스크림(바깥) 닫힘으로 전파되지 않게 한다 */}
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <Text style={styles.modalTitle}>친구 추가</Text>
          <View style={styles.modalInputRow}>
            <Ionicons name="search" size={SEARCH_ICON_SIZE} color={colors.textDisabled} />
            <TextInput
              style={styles.modalInput}
              value={username}
              onChangeText={onChangeUsername}
              placeholder="아이디를 입력하세요"
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!adding}
              onSubmitEditing={onSubmit}
              returnKeyType="done"
            />
          </View>
          <TouchableOpacity
            style={[styles.addButton, !canSubmit && styles.addButtonDisabled]}
            onPress={onSubmit}
            disabled={!canSubmit}
          >
            {adding ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.addButtonText, !canSubmit && styles.addButtonTextDisabled]}>추가하기</Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** 친구가 없을 때 안내. (디자인 외 유지 요소) */
function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>👥</Text>
      <Text style={styles.emptyTitle}>아직 친구가 없어요</Text>
      <Text style={styles.emptyDesc}>오른쪽 위 + 버튼으로 친구를 추가해 보세요.</Text>
    </View>
  );
}

// 아래는 각 부분의 모양·배치. 색·간격·radius는 constants/theme.ts 토큰 기준(⚠️=토큰 없는 시안 고정값).
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface }, // 화면 배경(옅은 회색면) — F4F6F4 흡수된 surface
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { // 상단 헤더(Logo ↔ 알림종+친구추가)
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, // 24
    paddingTop: spacing.xl,        // 32
    paddingBottom: spacing.sm,     // 8
  },
  logo: { fontSize: LOGO_SIZE, fontWeight: '700', color: colors.thumbnail }, // 좌측 'Logo' (다크 그린)
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, // 종 + 친구추가 묶음
  title: { ...typography.heading1, color: colors.textPrimary, paddingHorizontal: spacing.lg, marginBottom: spacing.md }, // '커뮤니티' 제목

  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: CARD_GAP }, // 그리드 바깥 여백 + 줄 간격
  column: { gap: spacing.md }, // 한 줄 안 두 카드 사이 가로 간격(16)
  emptyContainer: { flexGrow: 1 }, // 빈 상태일 때 가운데 정렬되도록

  card: { // 친구 = 냉장고 카드(흰 카드 + 은은한 그림자)
    flex: 1,
    minHeight: CARD_MIN_HEIGHT,     // ⚠️ 105
    backgroundColor: colors.background, // 흰색 카드
    borderRadius: radius.card,      // 16
    padding: spacing.md,            // 16
    gap: CARD_GAP,                  // ⚠️ 10
    justifyContent: 'center',
    // 그림자: 색은 colors.thumbnail, 나머지 ⚠️ 토큰 없음(Figma 0/4/6, 0.05)
    shadowColor: colors.thumbnail,
    shadowOffset: { width: 0, height: 4 }, // ⚠️
    shadowOpacity: 0.05,                   // ⚠️
    shadowRadius: 6,                       // ⚠️
    elevation: 2,                          // ⚠️ Android 그림자 근사값
  },
  cardRemoving: { opacity: 0.5 }, // 삭제 중 흐리게
  cardTitle: { fontSize: CARD_TITLE_SIZE, fontWeight: '700', color: colors.textSecondary }, // 카드 제목(이름) — 시안대로 회색 굵게
  cardMeta: { ...typography.caption, color: colors.textSecondary }, // 카드 보조줄(@아이디)

  // 받은 친구 요청 섹션 (디자인 외 유지)
  section: { gap: CARD_GAP, marginBottom: spacing.sm },
  sectionTitle: { ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.background, // 중립 카드 톤(경고색 제거)
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestActions: { flexDirection: 'row', gap: spacing.sm },
  acceptButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minWidth: 52,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  actionDisabled: { opacity: 0.5 },
  acceptText: { ...typography.caption, color: colors.background, fontWeight: '600' },
  rejectText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  rowMain: { gap: spacing.xs, flex: 1 },
  rowName: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  rowMeta: { ...typography.caption, color: colors.textSecondary },

  // 친구 추가 모달
  scrim: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modalCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.lg,
    // 그림자(Figma 0/4/2, 0.25) ⚠️
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, // ⚠️
    shadowOpacity: 0.25,                   // ⚠️
    shadowRadius: 2,                       // ⚠️
    elevation: 4,                          // ⚠️
  },
  modalTitle: { fontSize: MODAL_TITLE_SIZE, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalInput: { flex: 1, ...typography.body, color: colors.textPrimary, paddingVertical: 0 },
  addButton: { // '추가하기' 알약 버튼 — 입력 있을 때 primary, 없으면 회색(비활성)
    height: button.height,         // 48
    borderRadius: button.radius,   // pill
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  addButtonDisabled: { backgroundColor: colors.border }, // 비활성: 회색 채움(Figma #E5E5EA)
  addButtonText: { ...typography.body, fontWeight: '700', color: colors.background },
  addButtonTextDisabled: { color: colors.textSecondary }, // 비활성 글자색

  // 빈 상태 (디자인 외 유지)
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: CARD_GAP, paddingTop: 40 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...typography.heading2, color: colors.textPrimary },
  emptyDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  errorText: { ...typography.body, color: colors.danger },
});
