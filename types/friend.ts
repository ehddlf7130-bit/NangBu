export type FriendshipStatus = 'pending' | 'accepted';

// profiles 테이블 행
export interface Profile {
  id: string;
  username: string;
  display_name: string;
  fridge_public: boolean;
  created_at: string;
}

// 수락된 친구 관계 + 상대방 프로필 (목록 표시용)
export interface Friend {
  friendshipId: string;
  status: FriendshipStatus;
  profile: Profile; // 나의 상대방(친구) 프로필
}
