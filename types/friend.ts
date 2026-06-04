export type FriendshipStatus = 'pending' | 'accepted';

// profiles 테이블 행
export interface Profile {
  id: string;
  username: string;
  display_name: string;
  fridge_public: boolean;
  notify_comments: boolean;
  notify_expiry: boolean;
  created_at: string;
}

// 수락된 친구 관계 + 상대방 프로필 (목록 표시용)
export interface Friend {
  friendshipId: string;
  status: FriendshipStatus;
  profile: Profile;
}

// 받은 친구 요청 (pending 상태, addressee가 나인 경우)
export interface PendingRequest {
  friendshipId: string;
  profile: Profile; // 요청을 보낸 사람 (requester)
}
