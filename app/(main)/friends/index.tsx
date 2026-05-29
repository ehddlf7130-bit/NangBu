import { useAuth } from '@/contexts/AuthContext';
import { addFriend, fetchFriends } from '@/lib/friends';
import { extractErrorMessage } from '@/lib/items';
import type { Friend } from '@/types/friend';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [adding, setAdding] = useState(false);

  const loadFriends = useCallback(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError(null);
    fetchFriends(user.id)
      .then((data) => { if (active) setFriends(data); })
      .catch((e: unknown) => { if (active) setError(extractErrorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  useFocusEffect(loadFriends);

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
      Alert.alert('친구 추가', `${profile.display_name}님을 친구로 추가했어요.`);
      loadFriends();
    } catch (e: unknown) {
      Alert.alert('추가 실패', extractErrorMessage(e));
    } finally {
      setAdding(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>친구</Text>

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
            <Text style={styles.addButtonText}>추가</Text>
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
          contentContainerStyle={friends.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <FriendRow
              friend={item}
              onPress={() =>
                router.push(`/(main)/friends/${item.profile.id}` as never)
              }
            />
          )}
        />
      )}
    </View>
  );
}

function FriendRow({ friend, onPress }: { friend: Friend; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.rowMain}>
        <Text style={styles.rowName}>{friend.profile.display_name}</Text>
        <Text style={styles.rowMeta}>@{friend.profile.username}</Text>
      </View>
      <Text style={styles.rowChevron}>›</Text>
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>👥</Text>
      <Text style={styles.emptyTitle}>아직 친구가 없어요</Text>
      <Text style={styles.emptyDesc}>위에서 친구의 아이디를 입력해 추가해보세요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
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
