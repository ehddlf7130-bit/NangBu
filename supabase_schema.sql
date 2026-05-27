-- ================================================================
-- NangBu 냉장고 관리 앱 — Supabase Schema
-- Supabase SQL Editor에 전체를 붙여넣고 한 번에 실행하세요.
-- ================================================================


-- ================================================================
-- 1. 테이블 생성
-- ================================================================

-- profiles: auth.users와 1:1 대응. 회원가입 트리거(섹션 3)가 자동 생성.
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      text        UNIQUE NOT NULL,
  display_name  text        NOT NULL,
  fridge_public boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- items: 냉장고 품목
CREATE TABLE IF NOT EXISTS public.items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  category    text        NOT NULL,
  storage     text        NOT NULL CHECK (storage IN ('fridge', 'freezer', 'room')),
  storage_tip text,
  expire_date date,
  quantity    int         NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- friendships: 친구 관계. (requester, addressee) 쌍은 유일.
CREATE TABLE IF NOT EXISTS public.friendships (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

-- comments: 친구 품목에 다는 코멘트
CREATE TABLE IF NOT EXISTS public.comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    uuid        NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  author_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- notifications: 인앱 알림 (코멘트 수신 시 트리거가 자동 생성)
CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         text        NOT NULL DEFAULT 'comment' CHECK (type IN ('comment')),
  item_id      uuid        NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  comment_id   uuid        NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  is_read      boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);


-- ================================================================
-- 2. 인덱스 (조회 성능)
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_items_owner_id         ON public.items (owner_id);
CREATE INDEX IF NOT EXISTS idx_friendships_requester  ON public.friendships (requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee  ON public.friendships (addressee_id);
CREATE INDEX IF NOT EXISTS idx_comments_item_id       ON public.comments (item_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id     ON public.comments (author_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications (recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read  ON public.notifications (recipient_id, is_read);


-- ================================================================
-- 3. 트리거: 회원가입 시 profiles 자동 생성
--    회원가입 때 raw_user_meta_data에 username, display_name을 담아 보내면 여기서 꺼내 씁니다.
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ================================================================
-- 4. 트리거: 코멘트 삽입 → notifications 자동 생성
--    SECURITY DEFINER이므로 RLS를 우회해 알림 행을 직접 삽입합니다.
--    자신의 품목에 단 코멘트는 알림을 생성하지 않습니다.
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT owner_id INTO v_owner_id
  FROM public.items
  WHERE id = NEW.item_id;

  IF v_owner_id IS NOT NULL AND v_owner_id <> NEW.author_id THEN
    INSERT INTO public.notifications (recipient_id, type, item_id, comment_id)
    VALUES (v_owner_id, 'comment', NEW.item_id, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_created ON public.comments;
CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment();


-- ================================================================
-- 5. RLS 활성화
-- ================================================================

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- 6. RLS 정책
-- ================================================================

-- ----------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------

-- 인증된 사용자라면 누구나 검색 가능 (친구 추가 시 username 검색에 필요)
CREATE POLICY "profiles: authenticated can read all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 자신의 프로필만 생성 가능 (회원가입 트리거가 SECURITY DEFINER로 처리하므로
--  일반적으로 앱에서 직접 INSERT하지 않지만, 정책은 열어둡니다)
CREATE POLICY "profiles: insert own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- 자신의 프로필만 수정 가능
CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ----------------------------------------------------------------
-- items
-- ----------------------------------------------------------------

-- 자신의 품목 + 수락된 친구 중 fridge_public=true인 사람의 품목
CREATE POLICY "items: select own or friend's public fridge"
  ON public.items FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.friendships f
      JOIN public.profiles p ON p.id = items.owner_id
      WHERE f.status = 'accepted'
        AND p.fridge_public = true
        AND (
          (f.requester_id = auth.uid() AND f.addressee_id = items.owner_id)
          OR
          (f.addressee_id = auth.uid() AND f.requester_id = items.owner_id)
        )
    )
  );

-- 자신의 품목만 등록
CREATE POLICY "items: insert own"
  ON public.items FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- 자신의 품목만 수정
CREATE POLICY "items: update own"
  ON public.items FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 자신의 품목만 삭제
CREATE POLICY "items: delete own"
  ON public.items FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());


-- ----------------------------------------------------------------
-- friendships
-- ----------------------------------------------------------------

-- 본인이 requester 또는 addressee인 관계만 조회
CREATE POLICY "friendships: select own"
  ON public.friendships FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- 자신이 요청자(requester)인 친구 요청만 생성
-- (requester_id <> addressee_id 중복 방지는 테이블 CHECK로 처리)
CREATE POLICY "friendships: insert as requester"
  ON public.friendships FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- 수락 대상자(addressee)만 status를 변경할 수 있음 (pending → accepted)
CREATE POLICY "friendships: update as addressee"
  ON public.friendships FOR UPDATE
  TO authenticated
  USING (addressee_id = auth.uid())
  WITH CHECK (addressee_id = auth.uid());

-- 본인이 당사자이면 관계 삭제 가능 (친구 끊기)
CREATE POLICY "friendships: delete own"
  ON public.friendships FOR DELETE
  TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());


-- ----------------------------------------------------------------
-- comments
-- ----------------------------------------------------------------

-- 작성자 본인 | 품목 주인 | 해당 품목을 볼 수 있는 친구
CREATE POLICY "comments: select by author, item owner, or friend"
  ON public.comments FOR SELECT
  TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = comments.item_id AND i.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.friendships f
      JOIN public.items i ON i.id = comments.item_id
      JOIN public.profiles p ON p.id = i.owner_id
      WHERE f.status = 'accepted'
        AND p.fridge_public = true
        AND (
          (f.requester_id = auth.uid() AND f.addressee_id = i.owner_id)
          OR
          (f.addressee_id = auth.uid() AND f.requester_id = i.owner_id)
        )
    )
  );

-- 수락된 친구이고 냉장고가 공개 상태인 품목에만 코멘트 작성 가능
CREATE POLICY "comments: insert as accepted friend"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.friendships f
      JOIN public.items i ON i.id = comments.item_id
      JOIN public.profiles p ON p.id = i.owner_id
      WHERE f.status = 'accepted'
        AND p.fridge_public = true
        AND (
          (f.requester_id = auth.uid() AND f.addressee_id = i.owner_id)
          OR
          (f.addressee_id = auth.uid() AND f.requester_id = i.owner_id)
        )
    )
  );

-- 작성자만 자기 코멘트 수정
CREATE POLICY "comments: update own"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- 작성자만 자기 코멘트 삭제
CREATE POLICY "comments: delete own"
  ON public.comments FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());


-- ----------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------
-- INSERT는 SECURITY DEFINER 트리거가 담당하므로 앱 레벨 정책 불필요.

-- 수신자만 자신의 알림 조회
CREATE POLICY "notifications: select own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

-- 수신자만 읽음 처리 가능 (is_read = true)
CREATE POLICY "notifications: update own (mark as read)"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());


-- ================================================================
-- 7. 역할별 테이블 접근 권한 (GRANT)
--    RLS는 "어떤 행"을 허용할지 제어하고,
--    GRANT는 "테이블 자체"에 접근할 수 있는지 제어한다.
--    GRANT 없이 RLS만 있으면 "permission denied for table" 오류 발생.
-- ================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
