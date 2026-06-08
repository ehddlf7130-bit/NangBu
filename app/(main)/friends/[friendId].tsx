import { colors } from '@/constants/theme';
import { fetchFriendItems, fetchFriendProfile } from '@/lib/friends';
import { extractErrorMessage } from '@/lib/items';
import type { Profile } from '@/types/friend';
import { STORAGE_LABELS, type Item } from '@/types/item';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function FriendFridgeScreen() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!friendId) return;
      let active = true;
      setLoading(true);
      setError(null);
      (async () => {
        try {
          const p = await fetchFriendProfile(friendId);
          if (!active) return;
          setProfile(p);
          // 비공개 냉장고는 RLS가 어차피 막지만, "공개하지 않음"과
          // "품목 없음"을 구분하려고 공개일 때만 품목을 불러온다.
          setItems(p.fridge_public ? await fetchFriendItems(friendId) : []);
        } catch (e: unknown) {
          if (active) setError(extractErrorMessage(e));
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [friendId]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? '친구를 찾을 수 없습니다.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{profile.display_name}님의 냉장고</Text>
        <Text style={styles.subtitle}>@{profile.username}</Text>
      </View>

      {!profile.fridge_public ? (
        <PrivateState />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <ItemRow item={item} onPress={() => router.push(`/(main)/item/${item.id}` as never)} />
          )}
        />
      )}
    </View>
  );
}

function ItemRow({ item, onPress }: { item: Item; onPress: () => void }) {
  const isExpired = item.expire_date ? new Date(item.expire_date) < new Date() : false;
  const isSoon = !isExpired && item.expire_date
    ? (new Date(item.expire_date).getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000
    : false;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.rowMain}>
        <Text style={styles.rowName}>{item.name}</Text>
        <Text style={styles.rowMeta}>
          {item.category}  ·  {STORAGE_LABELS[item.storage]}  ·  {item.quantity}개
        </Text>
      </View>
      {item.expire_date && (
        <Text style={[styles.expireText, isExpired && styles.expired, isSoon && styles.soon]}>
          {isExpired ? '만료' : isSoon ? '임박' : item.expire_date}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function PrivateState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🔒</Text>
      <Text style={styles.emptyTitle}>공개하지 않음</Text>
      <Text style={styles.emptyDesc}>이 친구는 냉장고를 공개하지 않았어요.</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🧊</Text>
      <Text style={styles.emptyTitle}>냉장고가 비어있어요</Text>
      <Text style={styles.emptyDesc}>아직 등록된 품목이 없어요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 12, gap: 4 },
  backText: { fontSize: 15, color: colors.primary, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  emptyContainer: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowMain: { gap: 4, flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  rowMeta: { fontSize: 13, color: colors.textSecondary },
  expireText: { fontSize: 13, color: colors.textSecondary, marginLeft: 8 },
  expired: { color: colors.danger, fontWeight: '600' },
  soon: { color: colors.warning, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  errorText: { color: colors.danger, fontSize: 15 },
});
