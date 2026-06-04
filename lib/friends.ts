import { supabase } from './supabase';
import type { Friend, FriendshipStatus, PendingRequest, Profile } from '@/types/friend';
import type { Item } from '@/types/item';

const PROFILE_COLUMNS = 'id, username, display_name, fridge_public, created_at';

/**
 * 수락된(accepted) 친구 목록을 조회한다.
 * friendships는 본인이 requester 또는 addressee인 행만 RLS로 보이므로,
 * 양방향을 모두 받아 "상대방" 프로필을 묶어서 돌려준다.
 * (FK 제약 이름에 의존하지 않도록 friendships → profiles 2단계로 조회)
 */
export async function fetchFriends(userId: string): Promise<Friend[]> {
  const { data: rows, error } = await supabase
    .from('friendships')
    .select('id, status, requester_id, addressee_id, created_at')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  // 각 관계에서 "내가 아닌 쪽"이 친구다.
  const otherIds = rows.map((r) =>
    r.requester_id === userId ? r.addressee_id : r.requester_id,
  );

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .in('id', otherIds);
  if (profileError) throw profileError;

  const profileById = new Map<string, Profile>(
    (profiles ?? []).map((p) => [p.id, p as Profile]),
  );

  return rows
    .map((r): Friend | null => {
      const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id;
      const profile = profileById.get(otherId);
      if (!profile) return null;
      return {
        friendshipId: r.id,
        status: r.status as FriendshipStatus,
        profile,
      };
    })
    .filter((f): f is Friend => f !== null);
}

/**
 * username으로 친구 요청을 보낸다 (pending 상태로 INSERT).
 * 상대방이 수락해야 accepted로 바뀐다.
 */
export async function addFriend(userId: string, username: string): Promise<Profile> {
  const { data: target, error: lookupError } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('username', username)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!target) throw new Error('해당 아이디의 사용자를 찾을 수 없습니다.');
  if (target.id === userId) throw new Error('자기 자신은 친구로 추가할 수 없습니다.');

  const { data: existing, error: existingError } = await supabase
    .from('friendships')
    .select('id, status')
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${target.id}),` +
        `and(requester_id.eq.${target.id},addressee_id.eq.${userId})`,
    )
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    throw new Error(
      (existing as { status: string }).status === 'pending'
        ? '이미 요청을 보냈거나 받은 상대입니다.'
        : '이미 친구입니다.',
    );
  }

  const { error: insertError } = await supabase
    .from('friendships')
    .insert({ requester_id: userId, addressee_id: target.id, status: 'pending' });
  if (insertError) throw insertError;

  return target as Profile;
}

/** 내가 받은 대기 중(pending) 친구 요청 목록 조회 */
export async function fetchPendingRequests(userId: string): Promise<PendingRequest[]> {
  const { data: rows, error } = await supabase
    .from('friendships')
    .select('id, requester_id')
    .eq('addressee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const requesterIds = rows.map((r) => r.requester_id);
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .in('id', requesterIds);
  if (profileError) throw profileError;

  const profileById = new Map<string, Profile>(
    (profiles ?? []).map((p) => [p.id, p as Profile]),
  );

  return rows
    .map((r): PendingRequest | null => {
      const profile = profileById.get(r.requester_id);
      if (!profile) return null;
      return { friendshipId: r.id, profile };
    })
    .filter((r): r is PendingRequest => r !== null);
}

/** 친구 요청을 수락한다 (status: pending → accepted). */
export async function acceptFriend(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId);
  if (error) throw error;
}

/** 친구 관계를 삭제한다 (양방향 당사자 모두 가능, RLS 보장). */
export async function removeFriend(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);
  if (error) throw error;
}

/** 친구의 프로필(이름 + 공개 여부) 조회 */
export async function fetchFriendProfile(friendId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', friendId)
    .single();
  if (error) throw error;
  return data as Profile;
}

/**
 * 친구의 냉장고 품목 조회.
 * RLS(items: select own or friend's public fridge)가 비공개/비친구 냉장고를
 * 자동으로 걸러내므로, 호출 전에 fetchFriendProfile로 fridge_public을 확인해
 * "공개하지 않음" 안내와 "품목 없음"을 구분한다.
 */
export async function fetchFriendItems(friendId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('owner_id', friendId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
