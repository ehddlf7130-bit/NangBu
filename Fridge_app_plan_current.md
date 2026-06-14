# NangBu 냉장고 앱 — 현재 개발 상태 (지침서)

> 이 앱이 **지금 어떤 상태인가**를 한눈에 보여주는 압축 요약. (변경 이력 아님)
> **기준일: 2026-06-15**

---

## 1. 개요

- **한 줄 정의**: 내 냉장고 식재료를 등록·관리하고, 친구 냉장고를 열람·코멘트하는 모바일 앱.
- **핵심 기능**
  - 식재료 등록·관리 (표준 재료 선택 / 직접 입력)
  - 나의 냉장고: 보관방식 필터 · 정렬 · D-day 상태 표시
  - 소비기한 자동 채움 (개인 설정 + 표준 마스터 일수)
  - 친구(커뮤니티): 친구 추가/수락 · 친구 냉장고 열람 · 코멘트
  - 알림: 코멘트·친구수락 (헤더 종 아이콘 진입)
  - 레시피: 직접 작성 + AI 추천(Gemini)
  - 마이페이지: 프로필·공개 토글·기본 소비기한·회원 탈퇴

---

## 2. 기술 스택

| 항목 | 내용 |
|------|------|
| 클라이언트 | Expo (managed) · React Native · TypeScript |
| 라우팅 | Expo Router (파일 경로 = 라우트) |
| 백엔드 | Supabase — PostgreSQL · Auth · RLS · Storage · Edge Functions |
| AI | Google Gemini 2.5 Flash (Edge Function 경유) |
| 세션 저장 | 네이티브=expo-secure-store / 웹=localStorage (`Platform.OS` 분기) |
| 환경변수 | `.env` → `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (service_role 미사용) |

---

## 3. 아키텍처

### 데이터 접근 3경로
| 경로 | 용도 | 예 |
|------|------|----|
| 클라이언트 → RLS 직접 쿼리 | 일반 CRUD | items / friendships / comments / recipes / category_expiry / ingredient_master 조회 |
| 클라이언트 → RPC | 권한 우회 관리 작업 | `delete_own_account()` (SECURITY DEFINER) |
| 클라이언트 → Edge Function → 외부 API | AI 추천 | `recommend-recipe` → Gemini |

### 인증/세션
- `contexts/AuthContext.tsx` — 세션·user 전역 상태 + `signIn`/`signUp`/`signOut` (`useAuth`).
- `app/_layout.tsx` — `AuthProvider` + 세션 감시해 `(auth)`↔`(main)` 자동 전환.
- `app/index.tsx` — 세션 유무로 `(main)` / `(auth)/login` Redirect.

### RLS 요약
| 테이블 | 규칙 |
|--------|------|
| items | 주인=CRUD / 친구는 `fridge_public=true`만 SELECT |
| comments | accepted 친구만 작성, 작성자·주인 SELECT |
| notifications | 본인(recipient) SELECT·UPDATE |
| friendships | 당사자만 SELECT |
| recipes / category_expiry | 본인 CRUD |
| ingredient_master | 인증 사용자 SELECT만 (쓰기 정책 없음) |

---

## 4. 데이터 모델

| 테이블 | 핵심 컬럼 |
|--------|-----------|
| **profiles** | `id(PK=auth.uid)` · `username` · `display_name` · `fridge_public` · `notify_comments` · `notify_expiry` |
| **items** | `id` · `owner_id` · `name` · `category` · `storage(fridge\|freezer\|room)` · `storage_tip` · `expire_date` · `quantity` · `ingredient_id(nullable FK→ingredient_master)` |
| **friendships** | `id` · `requester_id` · `addressee_id` · `status(pending\|accepted)` |
| **comments** | `id` · `item_id` · `author_id` · `content` |
| **notifications** | `id` · `recipient_id` · `type(comment\|friend_accepted)` · `item_id(nullable)` · `comment_id(nullable)` · `actor_id(nullable)` · `is_read` |
| **recipes** | `id` · `owner_id` · `title` · `body` · `source(manual\|ai)` · `ai_meta(jsonb, nullable)` |
| **category_expiry** | `id` · `owner_id` · `category` · `storage` · `default_days` — UNIQUE(owner_id, category, storage) |
| **ingredient_master** | `id` · `name(UNIQUE)` · `category` · `room_days` · `fridge_days` · `freezer_days` · `storage_tip` · `image_path(nullable)` · `created_at` — 읽기 전용 마스터 |

- **items 이미지**: items에 이미지 컬럼 없음. `lib/items.ts`가 `select('*, ingredient_master(image_path)')` 임베드 후 `flattenItem`으로 `item.image_path`에 평탄화 (미연결/이미지 없음=null).
- `ingredient_master.image_path` = Storage 버킷 `ingredient-images` 내 **파일명만**. public URL 변환은 `ingredientImageUrl`.
- `room_days/fridge_days/freezer_days = 0` → 해당 보관방식 비권장.

---

## 5. 화면 구조 (app/ 라우트별)

> 진행 상태: ✅완료 / 🟡진행중 / 보류

### 5-1. 라우팅 골격
| 파일 | 역할 | 상태 |
|------|------|------|
| `app/_layout.tsx` | 루트. AuthProvider + 세션 감시 + 최상위 Stack | ✅ |
| `app/index.tsx` | 세션 유무로 Redirect (UI는 스피너) | ✅ |
| `app/(auth)/_layout.tsx` | 인증 그룹 Stack | ✅ |
| `app/(main)/_layout.tsx` | Stack. `(tabs)`를 첫 화면, 상세 화면을 그 위로 push (스와이프 뒤로가기) | ✅ |
| `app/(main)/(tabs)/_layout.tsx` | 하단 탭바 정의(4탭). 렌더는 `CustomTabBar` | ✅ |

### 5-2. 인증
| 화면 | 파일 | 상태 |
|------|------|------|
| 로그인 | `app/(auth)/login.tsx` | ✅ |
| 회원가입 | `app/(auth)/signup.tsx` | ✅ |

### 5-3. 탭 화면 (4탭, 헤더 우측 `NotificationBell`)
| 탭 | 파일 | 내용 | 상태 |
|----|------|------|------|
| 냉장고 | `app/(main)/(tabs)/index.tsx` | 나의 냉장고 목록 + 보관방식 필터 + 정렬(`SortSheet`) + `FridgeItemRow` | ✅ |
| 커뮤니티 | `app/(main)/(tabs)/friends/index.tsx` | 친구 카드 2열 그리드 + 친구추가 모달 + 받은 요청 수락/거절 | ✅ |
| 레시피 | `app/(main)/(tabs)/recipes/index.tsx` | 나의 레시피 흰 카드 리스트 | ✅ |
| 마이페이지 | `app/(main)/(tabs)/mypage/index.tsx` | 프로필 요약 + 공개 토글 + 메뉴 4개 + 로그아웃 | 🟡 |

### 5-4. 식재료 등록 (`register/`)
| 단계 | 파일 | 내용 | 상태 |
|------|------|------|------|
| ① 카테고리+재료 | `app/(main)/register/ingredient.tsx` | 좌 카테고리 사이드바 + 우 재료 그리드(3열) + 이름 검색 + `직접 입력` 바이패스 | ✅ |
| ② 등록 폼 | `app/(main)/register/new.tsx` | `RegisterItemForm`(create 전용) + `DateWheelPicker` | ✅ |
| (미사용) | `app/(main)/register/category.tsx` | 어디서도 push 안 함 | 보류 |

### 5-5. 식재료 상세·편집
| 화면 | 파일 | 내용 | 상태 |
|------|------|------|------|
| 재료 정보(읽기) | `app/(main)/item/[itemId].tsx` | 소유 여부 분기. 내 재료=`ItemDetail`+편집 / 친구 재료=`ItemDetail`+코멘트 | ✅ |
| 재료 편집 | `app/(main)/fridge/[itemId].tsx` | `ItemForm`(edit) + 삭제 + 코멘트(읽기) | ✅ |

### 5-6. 친구 냉장고
| 화면 | 파일 | 내용 | 상태 |
|------|------|------|------|
| 친구 냉장고(readonly) | `app/(main)/friends/[friendId].tsx` | 친구 프로필 + `FridgeItemRow` 재사용. 비공개면 🔒 안내 | ✅ |

### 5-7. 레시피
| 화면 | 파일 | 내용 | 상태 |
|------|------|------|------|
| 레시피 추가 | `app/(main)/recipes/new.tsx` | `choose`(직접/AI) → `manual` 입력 / `ai`(재료 선택→추천→미리보기→저장) | ✅ |
| 레시피 상세 | `app/(main)/recipes/[recipeId].tsx` | 보기 + 인라인 편집 + 삭제. AI는 시간/난이도/부족재료 표시 | ✅ |

### 5-8. 알림
| 화면 | 파일 | 내용 | 상태 |
|------|------|------|------|
| 알림 목록 | `app/(main)/notifications.tsx` | 탭 제외, 헤더 종으로 진입. `friend_accepted`→`friends/[actor_id]`, 그 외→`item/[item_id]` | ✅ |

### 5-9. 마이페이지 하위 (`(main)` Stack 직속)
| 화면 | 파일 | 내용 | 상태 |
|------|------|------|------|
| 프로필 수정 | `app/(main)/mypage/profile.tsx` | display_name·비밀번호 변경 + 회원 탈퇴 | ✅ |
| 알림 설정 | `app/(main)/mypage/notification-settings.tsx` | 코멘트/소비기한 알림 토글 | ✅ |
| 기본 소비기한 — 카테고리 | `app/(main)/mypage/expiry/category.tsx` | 21개 카테고리 리스트 | ✅ |
| 기본 소비기한 — 상세 | `app/(main)/mypage/expiry/[category].tsx` | 보관방식별 일수 입력/저장/삭제 | ✅ |
| 공지사항 | `app/(main)/mypage/notice.tsx` | 정적 공지 목록 | ✅ |

---

## 6. 핵심 로직 모듈 (`lib/`)

| 파일 | 주요 export |
|------|-------------|
| **expiry.ts** | `getDday` · `getDdayColor`(≤3 danger / ≤14 warning / 그 외 primary) · `DDAY_DANGER_THRESHOLD(3)`·`DDAY_WARNING_THRESHOLD(14)` · `resolveExpiryDays`(① category_expiry → ② master 일수>0 → ③ null) · `fetchCategoryExpiries`·`fetchExpiryDays`·`upsertCategoryExpiry`·`deleteCategoryExpiry`·`addDaysToToday` |
| **account.ts** | `deleteAccount`(`rpc('delete_own_account')`) |
| **items.ts** | `fetchMyItems`·`fetchItem`(image_path 임베드 평탄화)·`createItem`·`updateItem`·`deleteItem`·`flattenItem`·`itemToFormValues`·`extractErrorMessage` |
| **ingredients.ts** | `ingredientImageUrl`(파일명→public URL, 빈값 null) · `fetchIngredientsByCategory`·`searchIngredients`·`fetchIngredientById` · 상수 `INGREDIENT_IMAGES_BUCKET='ingredient-images'` |
| **friends.ts** | `fetchFriends`·`addFriend`·`fetchPendingRequests`·`acceptFriend`·`removeFriend`·`fetchFriendProfile`·`fetchFriendItems` |
| **comments.ts** | `fetchComments`·`createComment` |
| **notifications.ts** | `fetchNotifications`·`hasUnreadNotifications`·`markNotificationRead` |
| **recipes.ts** | `fetchMyRecipes`·`fetchRecipe`·`createRecipe`·`updateRecipe`·`deleteRecipe`·`requestAiRecipe` |
| **profiles.ts** | `fetchMyProfile`·`updateDisplayName`·`updateFridgePublic`·`updateNotifyComments`·`updateNotifyExpiry`·`updatePassword` |
| **format.ts** | `formatDateTime`·`formatExpireDate('YYYY.MM.DD')`·`formatRelativeTime` |
| **supabase.ts** | `supabase` 클라이언트 (세션 저장 Platform 분기) |

---

## 7. 공통 컴포넌트 (`components/`)

| 파일 | 역할 |
|------|------|
| `RegisterItemForm.tsx` | 등록(create) 전용 폼. 필 칩·요약 배지·고정 CTA |
| `ItemForm.tsx` | 편집 공용 폼(create/edit/readonly 지원). 현재 `fridge/[itemId]`(edit)에서 사용 |
| `DateWheelPicker.tsx` | 유통기한 년/월/일 휠 바텀시트 (`YYYY-MM-DD` 반환) |
| `FridgeItemRow.tsx` | 냉장고 목록 한 행. 원형 썸네일(50)·이름·D-day·상태 색점·`›` 셰브론. 냉장고/친구 냉장고 공용 |
| `ItemDetail.tsx` | 재료 정보 읽기 전용. 상단 대표 이미지 히어로(184)·D-day 상태점·보관팁 |
| `SortSheet.tsx` | 정렬 바텀시트(기본/이름/유통기한순). `SortKey`·`SORT_LABELS` export |
| `CustomTabBar.tsx` | 하단 탭바 렌더. 활성=흰 알약 박스+초록 아이콘 |
| `NotificationBell.tsx` | 헤더 우측 종 + 안 읽음 빨간 점 |
| `AddButton.tsx` | 헤더 `＋추가` 버튼 |
| `CommentCardList.tsx` | 코멘트 카드형 목록 (loading/error/빈 처리) |
| `CommentCard.tsx` | 코멘트 1장 흰 카드 |
| `CommentList.tsx` | 구 인라인 회색 목록 (현재 미사용) |

---

## 8. 디자인 토큰 (`constants/theme.ts`)

| 그룹 | 토큰 | 상태 |
|------|------|------|
| **colors — 브랜드** | `primary #469860` · `primaryTint #E9F3EC` · `primaryTintBorder #C5E2CF` · `thumbnail #213A24` | ✅ |
| **colors — 텍스트** | `textPrimary #1A1A1A` · `textSecondary #8E8E93` · `textTertiary #AEAEB2` · `textDisabled #C7C7CC` | ⚠️ 추정 |
| **colors — 경계/면** | `border #E5E5EA` · `borderStrong #D1D1D6` · `surface #F2F2F7` · `background #FFFFFF` | ⚠️ 추정 |
| **colors — 상태** | `danger/dangerTint/dangerTintBorder` · `warning/warningTint/warningTintBorder` · `overlay rgba(0,0,0,.45)` | ⚠️ 추정 |
| **radius** | `pill 9999`(✅) · `card 16`(⚠️) · `sm 8`(⚠️) | 일부 ⚠️ |
| **spacing** | `xs 4 · sm 8 · md 16 · lg 24 · xl 32` | — |
| **typography** | `heading1(22/700)` · `heading2(18/600)` · `body(15/400)` · `caption(13/400)` | ⚠️ 추정 |
| **button** | `height 48` · `radius = radius.pill` | ✅ |

> ⚠️ = theme.ts에서 디자이너 미확정으로 표기된 값. `colors`는 `as const`. 미확정 토큰은 `memory/figma-token-reconcile`에서 추적.

---

## 9. 서버 사이드

> ⚠️ **DB 스키마(테이블/RLS 정책/RPC/트리거)는 이 레포에 없음.** 수동 SQL로 관리 (`supabase_schema.sql` 등). 레포의 `supabase/` 폴더에는 Edge Function 1개와 `config.toml`만 존재.

### Edge Functions
| 함수 | 내용 |
|------|------|
| `recommend-recipe` (`supabase/functions/recommend-recipe/index.ts`) | 냉장고 재료 → Gemini 2.5 Flash → 레시피 1개. JWT 수동 검증(`config.toml` `verify_jwt=false` + 내부 `auth.getUser()`). 입력 `{items:[{name,category,expire_date}]}`, 출력 `{title, body, cook_time_minutes, difficulty, used_ingredients, needed_ingredients[{name,amount}]}`. 타임아웃 30초. `GEMINI_API_KEY`는 secret으로만 보관 |

### RPC (DB 함수, 레포 밖)
| 함수 | 내용 |
|------|------|
| `delete_own_account()` | SECURITY DEFINER. 호출자 profiles 행 삭제 → FK CASCADE로 연관 데이터·인증 계정 정리. `authenticated`에 EXECUTE GRANT |

### 트리거 (DB, 레포 밖)
| 트리거 | 내용 |
|--------|------|
| `handle_new_comment` | 코멘트 insert 시 notifications 생성 (`notify_comments=true`만) |
| `handle_friendship_accepted` | 친구 수락 시 notifications 생성 |

### Storage
| 버킷 | 내용 |
|------|------|
| `ingredient-images` (public) | 표준 재료 대표 이미지. `ingredient_master.image_path`(파일명) ↔ `ingredientImageUrl`로 public URL 변환 |

---

## 10. 미구현/보류

<!-- 사용자가 직접 작성 -->
