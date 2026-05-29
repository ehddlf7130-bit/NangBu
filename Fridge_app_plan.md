# 냉장고 관리 앱 — 개발 지침서 (Claude Code용)

> 이 문서는 Expo(React Native) 기반 냉장고 관리 앱을 Claude Code로 개발하기 위한 지침서입니다.
> 프로젝트 루트에 두고, Claude Code에게 "이 문서를 기준으로 개발해줘"라고 지시하세요.

---

## 1. 프로젝트 개요

사용자가 자기 냉장고의 식재료를 등록·관리하고, 친구의 냉장고를 들여다보며 각 품목에 코멘트를 남길 수 있는 모바일 앱이다. 친구 기능은 에브리타임의 시간표 공유 방식을 모델로 한다 — 친구 목록에서 이름을 누르면 그 친구의 냉장고 데이터가 열린다.

- **플랫폼**: Expo (React Native), iOS/Android 동시 지원
- **백엔드**: Supabase (PostgreSQL + Auth + Realtime + RLS)
- **개발 범위**: 아래 2장의 MVP 범위만 우선 구현. 2차 기능은 구조만 남겨두고 미구현.

---

## 2. 개발 범위

### 2-1. MVP (1차 — 이번에 구현)
- 회원가입 / 로그인 / 자동 로그인(세션 유지)
- 식품 등록 (카테고리 선택 → 식재료 데이터 입력)
- 나의 냉장고 품목 목록 / 개별 품목 조회 / 편집 / 삭제
- 친구 추가 / 친구 목록
- 친구의 냉장고 보기 (읽기 전용)
- 친구 품목에 코멘트 작성
- 인앱 알림 (코멘트 수신 시 알림창 목록에 표시)

### 2-2. 2차 (구조만, 미구현)
- 푸시 알림 (Expo Notifications)
- AI 챗봇 (보관법/레시피 추천)
- 유통기한 임박 자동 알림
- 사용자 정의 카테고리 (별도 categories 테이블, 5-1 참조)

> **중요**: 1차에서는 푸시 알림과 AI 챗봇을 구현하지 않는다. 화면 메뉴 자리만 두고 "준비 중" 처리.

---

## 3. 기술 스택

| 영역 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | Expo (managed workflow) | `npx create-expo-app` |
| 라우팅 | Expo Router (파일 기반) | 화면 구조와 1:1 매핑 |
| 백엔드 | Supabase | `@supabase/supabase-js` |
| 인증 | Supabase Auth (email/password) | |
| 상태 관리 | React Context + hooks | 규모상 Redux 불필요 |
| 저장(세션) | expo-secure-store | 토큰 보관 |
| 언어 | TypeScript | |

> Supabase URL/anon key는 `.env`에 두고 `app.config.js`의 `extra`로 주입한다. 키를 코드에 하드코딩하지 말 것.

---

## 4. 데이터 모델 (Supabase 테이블)

### profiles
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK, = auth.users.id) | |
| username | text (unique) | 친구 추가 시 검색하는 ID |
| display_name | text | 표시 이름 |
| fridge_public | boolean (default true) | 친구에게 냉장고 공개 여부 |
| created_at | timestamptz | |

### items (냉장고 품목)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| owner_id | uuid (FK → profiles.id) | 품목 주인 |
| name | text | 식재료 이름 |
| category | text | 과일/육류/유제품 등. 자유 문자열이므로 카테고리 추가 시 스키마 변경 불필요 (5-1 참조) |
| storage | text | 'fridge' \| 'freezer' \| 'room' (냉장/냉동/실온) |
| storage_tip | text | 보관법 정보 |
| expire_date | date | 유통기한 |
| quantity | int | 수량 |
| created_at | timestamptz | |

### friendships (친구 관계)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| requester_id | uuid (FK → profiles.id) | 요청한 사람 |
| addressee_id | uuid (FK → profiles.id) | 받은 사람 |
| status | text | 'pending' \| 'accepted' |
| created_at | timestamptz | |

> MVP에서는 친구 추가 시 바로 `accepted`로 넣어도 무방하나, status 컬럼은 미리 둔다(수락 절차는 2차).

### comments (품목 코멘트)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| item_id | uuid (FK → items.id) | 대상 품목 |
| author_id | uuid (FK → profiles.id) | 코멘트 작성자(친구) |
| content | text | 코멘트 내용 |
| created_at | timestamptz | |

### notifications (인앱 알림)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| recipient_id | uuid (FK → profiles.id) | 알림 받는 사람(냉장고 주인) |
| type | text | 'comment' (확장 대비) |
| item_id | uuid (FK → items.id) | 클릭 시 이동할 품목 |
| comment_id | uuid (FK → comments.id) | |
| is_read | boolean (default false) | |
| created_at | timestamptz | |

> 코멘트가 생성되면 DB 트리거 또는 앱 로직으로 `notifications` 행을 함께 생성한다. 트리거 방식을 권장.

### 5-1. 카테고리 관리 방침
`items.category`는 enum이 아니라 자유 `text` 컬럼이다. 따라서 카테고리를 늘려도 DB 스키마는 변경할 필요가 없다. MVP에서는 카테고리 목록을 코드 상수 배열 하나로 관리한다.

```ts
// constants/categories.ts
export const CATEGORIES = ['과일', '육류', '유제품'];
// 이후 항목만 추가: ['과일', '육류', '유제품', '채소', '음료', '냉동식품', ...]
```

카테고리 선택 화면(`register/category.tsx`)은 이 배열을 import해서 렌더링한다. 새 카테고리는 배열에 추가하기만 하면 된다. **사용자가 직접 카테고리를 만드는 기능(사용자 정의 카테고리)은 2차로 미룬다** — 그때는 별도 `categories` 테이블을 도입한다. 처음부터 이 배열을 단일 출처(single source)로 두어 화면 여러 곳에서 하드코딩하지 않도록 한다.

---

## 5. 권한 규칙 (Supabase RLS)

행 단위 보안(RLS)을 반드시 켤 것. 핵심 규칙:

- **items**: 주인은 자기 품목을 모두 CRUD. 친구는 `fridge_public=true`인 주인의 품목을 **읽기만** 가능. 수정·삭제 불가.
- **comments**: 친구 관계(accepted)인 경우에만 작성 가능. 작성자는 자기 코멘트 수정·삭제 가능. 품목 주인도 자기 품목의 코멘트를 볼 수 있음.
- **notifications**: 본인(recipient) 것만 조회·읽음 처리 가능.
- **friendships**: 본인이 당사자인 관계만 조회.

> 이 규칙들 때문에 친구 화면의 입력 폼은 **읽기 전용 모드**로 열려야 한다 (6-3 참조).

---

## 6. 화면 구조 (Expo Router)

> 아래는 **실제 구현 상태**다. ✅ 구현 · ⬜ 미구현. (컴포넌트/상수/라이브러리/타입 디렉터리는 `app/`이 아니라 **프로젝트 루트**에 있다.)

```
app/
  _layout.tsx                # ✅ AuthProvider + 세션 감시(AuthRedirect) + Stack
  index.tsx                  # ✅ 세션 검사 → <Redirect> (main/login)
  (auth)/
    _layout.tsx              # ✅ 인증 그룹 Stack
    login.tsx                # ✅ 로그인
    signup.tsx               # ✅ 회원가입
    find-id.tsx              # ⬜ 미구현 (보류)
    find-password.tsx        # ⬜ 미구현 (보류)
  (main)/
    _layout.tsx              # ✅ 메인 그룹 Stack (헤더 숨김)
    index.tsx                # ✅ 6개 메뉴 그리드 + 로그아웃 버튼
    register/
      category.tsx           # ✅ 카테고리 선택
      new.tsx                # ✅ ItemForm(create) — 식품 등록 입력 (문서에 없던 실제 파일)
    fridge/
      index.tsx              # ✅ 나의 냉장고 품목 목록
      [itemId].tsx           # ✅ 개별 품목 수정(edit) + 코멘트 목록 표시
    friends/
      index.tsx              # ✅ 친구 목록 / 친구 추가
      [friendId].tsx         # ✅ 친구 냉장고(readonly) + 코멘트 작성 모달
    notifications.tsx        # ✅ 알림창
    settings.tsx             # ⬜ 미구현 (냉장고 공개 토글 자리, §10 참조)
    chatbot.tsx              # ⬜ 미구현 (2차 placeholder, §10 참조)

components/                  # (프로젝트 루트)
  ItemForm.tsx               # ✅ create/edit/readonly 3모드 공통 폼 (scrollable 옵션)
  CommentList.tsx            # ✅ 코멘트 목록 표시 공통 컴포넌트
constants/
  categories.ts              # ✅ ['과일','육류','유제품'] (단일 출처, 5-1 참조)
  theme.ts                   # ✅ 색상/폰트 테마 상수 (현재 일부만 사용)
contexts/
  AuthContext.tsx            # ✅ 세션/로그인/로그아웃 컨텍스트
lib/
  supabase.ts                # ✅ Supabase 클라이언트 (SecureStore 세션 저장)
  items.ts                   # ✅ 품목 CRUD + itemToFormValues/extractErrorMessage
  friends.ts                 # ✅ 친구 조회/추가 (fetchFriends/addFriend/...)
  comments.ts                # ✅ 코멘트 조회/작성
  notifications.ts           # ✅ 알림 조회/읽음 처리
  format.ts                  # ✅ 날짜 포맷 유틸 (formatDateTime)
types/
  item.ts / friend.ts / comment.ts / notification.ts   # ✅ 도메인 타입
supabase_schema.sql          # ✅ 테이블 + 인덱스 + RLS + GRANT + 트리거 일괄
```

> 메뉴('설정', 'AI 챗봇')는 `/(main)/settings`·`/(main)/chatbot`으로 링크하지만 해당 화면 파일이 아직 없어 현재 탭하면 이동이 실패한다(§10에서 해결).

### 6-1. 진입 흐름
세션은 `contexts/AuthContext.tsx`가 Supabase `onAuthStateChange`로 관리하고(토큰은 SecureStore에 저장, 네트워크 지연 대비 5초 타임아웃 안전망 포함), `app/_layout.tsx`의 `AuthRedirect`가 세션 유무에 따라 `(auth)` ↔ `(main)`을 자동 전환한다. `app/index.tsx`는 보조 안전망으로 `<Redirect>` 분기를 한 번 더 수행한다.

### 6-2. 식품 등록 흐름
메인 → 식품 등록 → 카테고리 선택(`constants/categories.ts`의 배열을 렌더링) → `ItemForm`(등록 모드) → 저장 시 `items`에 insert → 나의 냉장고 목록으로 복귀.

### 6-3. ItemForm 공통 컴포넌트 (가장 중요)
하나의 폼을 **세 가지 모드**로 재사용한다. props로 `mode`를 받는다.
- `mode="create"`: 빈 폼, 버튼 라벨 "등록", insert 수행
- `mode="edit"`: 기존 데이터 채워서 열림, 버튼 라벨 "수정", update 수행
- `mode="readonly"`: 친구 냉장고에서 품목을 열 때. 모든 입력 비활성화, 등록/수정 버튼 숨김, 대신 코멘트 입력란 표시

> 입력 항목: 이름, 카테고리, 보관 방식(냉장/냉동/실온 택1), 보관법 정보, 유통기한, 수량.

### 6-4. 친구 → 코멘트 → 알림 고리
1. 친구 목록에서 이름 클릭 → `friends/[friendId]` → 그 친구의 `items` 로드(읽기 전용)
2. 품목 선택 → `ItemForm`(readonly) + 코멘트 입력란
3. 코멘트 작성 → `comments` insert → 트리거로 `notifications` insert(recipient = 품목 주인)
4. 주인의 알림창에서 알림 확인 → 클릭 시 `fridge/[itemId]`로 이동

---

## 7. 구현 순서 (권장 마일스톤)

실제 구현 현황은 다음과 같다. **✅ 완료 · 🟡 부분 완료 · ⬜ 미구현**. 주요 파일은 실제 코드 기준.

1. ✅ **프로젝트 셋업** — `package.json`, `app.json`, `lib/supabase.ts`(SecureStore 세션), `app/_layout.tsx`, `.env`(`EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`)
2. ✅ **DB 스키마** — `supabase_schema.sql` (테이블 + 인덱스 + RLS + GRANT + 트리거 일괄)
3. ✅ **인증** — `contexts/AuthContext.tsx`, `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`, `app/index.tsx`, `app/_layout.tsx`(AuthRedirect)
4. ✅ **식품 등록 + 나의 냉장고** — `components/ItemForm.tsx`(create/edit/readonly), `lib/items.ts`, `types/item.ts`, `constants/categories.ts`, `app/(main)/register/category.tsx`, `app/(main)/register/new.tsx`, `app/(main)/fridge/index.tsx`, `app/(main)/fridge/[itemId].tsx`
5. ✅ **친구 기능** — `types/friend.ts`, `lib/friends.ts`, `app/(main)/friends/index.tsx`, `app/(main)/friends/[friendId].tsx`
6. ✅ **코멘트 + 인앱 알림** — `types/comment.ts`, `types/notification.ts`, `lib/comments.ts`, `lib/notifications.ts`, `lib/format.ts`, `components/CommentList.tsx`, `app/(main)/notifications.tsx` (코멘트 작성: `friends/[friendId].tsx`, 코멘트 목록: `fridge/[itemId].tsx`)
7. 🟡 **설정** — 로그아웃 ✅(`app/(main)/index.tsx`의 로그아웃 버튼). 냉장고 공개 토글(`fridge_public`) ⬜ 미구현 → §10
8. ⬜ **마감** — 로딩/에러/빈 상태는 구현된 화면(4~6)에 이미 반영됨. 챗봇 placeholder·설정 화면 미생성, 디버그 로그 정리·전체 마감 점검 남음 → §10

> 각 마일스톤이 끝나면 실제 동작을 확인하고 다음으로 넘어갈 것. 한 번에 전부 만들지 말 것.
> 디버그용 `console.log`가 일부 화면(`fridge/index.tsx`, `contexts/AuthContext.tsx`, `app/index.tsx` 등)에 남아 있다 — 마감 단계 정리 대상.

---

## 8. 놓치기 쉬운 처리 (체크리스트)

> 실제 코드 기준 현황. 미완료 항목은 §10 '남은 작업' 참조.

- [x] 품목 삭제 경로 — `fridge/[itemId].tsx` 상세에서 삭제(확인 Alert)
- [x] 유통기한 표시 — 임박/만료 색상 구분 (`fridge/index.tsx`, `friends/[friendId].tsx`. 자동 알림은 2차)
- [x] 친구 추가 시 자기 자신/중복 추가 방지 — `lib/friends.ts`의 `addFriend`
- [x] 냉장고 비공개(`fridge_public=false`) 친구 → "공개하지 않음" 안내 — `friends/[friendId].tsx`
- [x] 로그아웃 — 구현됨. 단 현재 위치는 **메인 화면**(`(main)/index.tsx`); 설정 화면 생성 시 이동 검토
- [x] 빈 상태 UI (품목/친구/알림 없음) — 각 목록 화면 EmptyState
- [x] 입력 검증 (이름 필수, 수량 0 이상, 유통기한 형식) — `ItemForm`의 `validate()`
- [x] 네트워크 에러 / 로딩 인디케이터 — 각 화면 `ActivityIndicator` + 에러 표시
- [ ] 냉장고 공개 토글 — 미구현 (설정 화면 필요, §10-1)
- [ ] 챗봇 placeholder — 미구현 (§10-2)
- [ ] 디버그 `console.log` 정리 — 일부 화면에 잔존 (§10-2)

---

## 9. 환경 변수 (.env 예시)

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx...
```

> anon key는 공개되어도 RLS로 보호되므로 클라이언트 사용 가능. service_role key는 절대 앱에 넣지 말 것.
>
> **키 이름 안내**: Supabase 대시보드가 키 명칭을 변경했다. 새 이름과 기존 이름의 대응은 다음과 같다.
> - **Publishable key** = 기존 anon key → 앱의 `EXPO_PUBLIC_SUPABASE_ANON_KEY`에 사용 (공개 안전)
> - **Secret key** = 기존 service_role key → 마스터 키, 앱·코드에 절대 넣지 말 것
>
> 앱에는 Publishable key만 사용한다. Project URL은 대시보드 상단 또는 Settings → API에서 확인.

---

## 10. 남은 작업 (미구현 · 보류)

마일스톤 7의 일부와 8 전체가 남아 있다.

### 10-1. 냉장고 공개 토글 (마일스톤 7)
- `app/(main)/settings.tsx` 신규 생성 필요.
- 동작: `profiles.fridge_public`을 토글. 예) `supabase.from('profiles').update({ fridge_public }).eq('id', user.id)`.
- 권한: profiles의 `update own` RLS가 이미 있어 **추가 정책 불필요**.
- 메인 메뉴('설정')는 이미 `/(main)/settings`로 링크하지만 화면 파일이 없어 현재 탭하면 이동이 실패한다 → 화면 생성으로 해결.
- 로그아웃을 이 설정 화면으로 옮길지 함께 결정(현재는 메인 화면에 위치).

### 10-2. 마감 처리 (마일스톤 8)
- **챗봇 placeholder**: `app/(main)/chatbot.tsx` "준비 중" 화면 (메인 메뉴 'AI 챗봇' 링크 대상, 현재 화면 없음).
- **로딩/에러/빈 상태**: 구현된 화면(4~6)에는 이미 반영됨. 신규 화면(설정/챗봇)에도 동일 패턴 적용 + 전체 일관성 점검.
- **디버그 로그 정리**: `fridge/index.tsx`, `contexts/AuthContext.tsx`, `app/index.tsx` 등의 `console.log` 제거.
- **메뉴-라우트 정합성**: 위 미생성 화면 때문에 메인 메뉴 일부가 동작하지 않음 → 화면 생성으로 정리.

---

## 11. 배운 점 / 트러블슈팅

### 11-1. RLS만으로는 부족 — 테이블 GRANT를 반드시 함께 부여
- **증상**: RLS 정책을 모두 켰는데도 쿼리 시 `permission denied for table ...` 오류.
- **원인**: PostgreSQL에서 **RLS(행 단위 보안)** 와 **GRANT(테이블 단위 접근 권한)** 는 별개 레이어다. RLS는 "어떤 행이 보이는가"를, GRANT는 "테이블에 접근할 수 있는가"를 결정한다. GRANT가 없으면 RLS를 평가하기도 전에 거부된다.
- **해결**: 스키마에서 RLS와 함께 GRANT를 부여한다 (`supabase_schema.sql` §7).
  ```sql
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles      TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.items         TO authenticated;
  -- friendships / comments / notifications 도 동일하게 부여
  ```
- **교훈**: Supabase에서 테이블을 만들 때는 ① RLS ENABLE ② 정책 작성 ③ **GRANT 부여** 를 항상 세트로 처리한다.

### 11-2. PostgREST 임베드 — 동일 테이블을 두 번 참조하면 모호
- `friendships`는 `profiles`를 `requester_id`·`addressee_id`로 **두 번** 참조한다. 이때 `select('..., profiles(...)')` 임베드는 모호해져 실패하거나 FK 이름 힌트가 필요하다.
- **해결**: `lib/friends.ts`는 FK 이름에 의존하지 않도록 `friendships` 조회 → 상대방 id 수집 → `profiles`를 `.in()`으로 2단계 조회한다.
- 단일 FK(`comments.author_id → profiles` 등)는 모호하지 않으므로 임베드를 그대로 사용한다(`lib/comments.ts`, `lib/notifications.ts`).

### 11-3. 모달 + 키보드 (KeyboardAvoidingView)
- iOS `presentationStyle="pageSheet"` 모달에서는 `KeyboardAvoidingView`가 키보드 높이를 잘못 계산해 입력창이 가려진다.
- **해결**: 풀스크린 모달로 전환 + `behavior`(iOS `padding`/Android `height`) + 입력바를 스크롤 영역의 형제로 고정 + 배경 탭으로 키보드 닫기 (`friends/[friendId].tsx`).

### 11-4. ItemForm 재사용 시 중첩 스크롤
- `ItemForm`은 내부가 `ScrollView`라, 코멘트 목록과 함께 쌓으면 스크롤이 충돌한다.
- **해결**: `scrollable` prop(기본 true)을 추가해, 코멘트와 함께 쓸 때는 바깥 스크롤에 얹도록 분리한다 (`components/ItemForm.tsx`).

### 11-5. 알림은 앱이 아니라 DB 트리거가 생성
- 코멘트 insert 시 `notifications`는 앱이 만들지 않고 `handle_new_comment` 트리거(SECURITY DEFINER)가 생성한다. 앱은 알림을 **읽기/읽음 처리만** 한다(`lib/notifications.ts`).

### 11-6. 세션 유지
- `lib/supabase.ts`의 SecureStore 어댑터로 토큰을 저장하고, `AuthContext`가 `onAuthStateChange`로 세션을 추적한다(네트워크 지연 대비 5초 타임아웃 안전망 포함).

---

## 12. 향후 확장 아이디어

### 12-1. 친구 수락 알림 (스키마 수정 필요)
현재 친구 추가는 바로 `accepted`로 처리된다(요청/수락 플로우 미사용). 수락 알림을 도입하려면 `notifications` 스키마를 손봐야 한다.
- **`type` CHECK 제약 확장**: 현재 `CHECK (type IN ('comment'))` → `'friend_accept'`(또는 `'friend_request'`) 추가.
- **`item_id` / `comment_id` NOT NULL → NULL 허용**: 코멘트와 무관한 알림은 이 두 컬럼이 없으므로 NULL을 허용하도록 변경.
- friendships의 status가 `accepted`로 바뀔 때 requester에게 알림을 생성하는 트리거/로직 추가.

### 12-2. 사용자 정의 카테고리
- 현재 `constants/categories.ts` 코드 상수(단일 출처). 2차에서 별도 `categories` 테이블 도입(§5-1).

### 12-3. 푸시 알림
- Expo Notifications + 디바이스 토큰 저장. `notifications` 행 생성 시 푸시 발송 연동.

### 12-4. AI 챗봇
- 보관법/레시피 추천. `chatbot.tsx` placeholder → 실제 모델 연동.

### 12-5. UX/UI 디자인 적용
- 현재는 기능 위주의 기본 스타일. 디자인 시스템/테마(`constants/theme.ts` 활용), 다크 모드, 아이콘·일러스트, 전환 애니메이션 등 시각적 완성도 향상.