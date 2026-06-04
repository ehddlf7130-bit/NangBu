import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { addFriend, acceptFriend, fetchFriends, fetchPendingRequests, removeFriend } from '@/lib/friends';
import { extractErrorMessage } from '@/lib/items';
import type { Friend, PendingRequest } from '@/types/friend';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
      <Text style={styles.sectionTitle}>친구 목록</Text>
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>친구</Text>
        <NotificationBell />
      </View>

      <View style={styles.addBox}>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="친구 아이디(username) 입력"
          placeholderTextColor="#bbb"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!adding}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addButton, adding && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={adding}
        >
          {adding ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addButtonText}>요청</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(f) => f.friendshipId}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={
            friends.length === 0 && pendingRequests.length === 0
              ? styles.emptyContainer
              : styles.list
          }
          ListEmptyComponent={pendingRequests.length === 0 ? <EmptyState /> : null}
          renderItem={({ item }) => (
            <FriendRow
              friend={item}
              removing={removingId === item.friendshipId}
              onPress={() => router.push(`/(main)/friends/${item.profile.id}` as never)}
              onLongPress={() => handleRemove(item)}
            />
          )}
        />
      )}
    </View>
  );
}

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
            <ActivityIndicator size="small" color="#fff" />
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

function FriendRow({
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
      style={[styles.row, removing && styles.rowRemoving]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      disabled={removing}
    >
      <View style={styles.rowMain}>
        <Text style={styles.rowName}>{friend.profile.display_name}</Text>
        <Text style={styles.rowMeta}>@{friend.profile.username}</Text>
      </View>
      {removing ? (
        <ActivityIndicator size="small" color="#ef4444" />
      ) : (
        <Text style={styles.rowChevron}>›</Text>
      )}
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>👥</Text>
      <Text style={styles.emptyTitle}>아직 친구가 없어요</Text>
      <Text style={styles.emptyDesc}>위에서 친구의 아이디를 입력해 요청을 보내보세요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },
  addBox: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#fff',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  addButtonDisabled: { opacity: 0.6 },
  addButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  emptyContainer: { flex: 1 },
  section: { gap: 10, marginBottom: 4 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 0.3,
    marginTop: 4,
    marginBottom: 2,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  requestActions: { flexDirection: 'row', gap: 8 },
  acceptButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 52,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  actionDisabled: { opacity: 0.5 },
  acceptText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  rejectText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rowRemoving: { opacity: 0.5 },
  rowMain: { gap: 4, flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600', color: '#111' },
  rowMeta: { fontSize: 13, color: '#888' },
  rowChevron: { fontSize: 22, color: '#cbd5e1', marginLeft: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 40 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptyDesc: { fontSize: 14, color: '#888', textAlign: 'center' },
  errorText: { color: '#ef4444', fontSize: 15 },
});
