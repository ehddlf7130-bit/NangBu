# NangBu 냉장고 앱 — 개발 지침서 (압축판)

> Claude Code용. 이 파일을 기준으로 개발 지시.
> **기준일: 2026-06-14 (UX/UI 3차: 냉장고 행·친구 카드 통일 + 등록 화면 Figma+휠 피커 + 레시피 목록/작성 Figma·토큰화 / 2차: 토큰 정비 + 탭바 활성표시 + 커뮤니티 화면 Figma 적용 / 1차: 라우팅 재편·냉장고 필터·정렬·등록 통합)**

---

## 1. 프로젝트 개요

- 내 냉장고 식재료 등록·관리 + 친구 냉장고 열람·코멘트 모바일 앱
- **스택**: Expo (managed) · TypeScript · Supabase (PostgreSQL + Auth + RLS) · Expo Router
- **세션 저장**: 네이티브=expo-secure-store / 웹=localStorage (Platform 분기)
- **환경변수**: `.env` → `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (service_role은 절대 앱에 넣지 말 것)

---

## 2. 구현 현황

| 상태 | 항목 |
|------|------|
| ✅ | 인증, 식품 등록·나의 냉장고, 친구, 코멘트·알림, 마이페이지, 레시피(수동), 소비기한 개인화(category_expiry), 레시피 AI 추천(Gemini) |
| ✅ | **식재료 표준 데이터 도입(§13-7) 전체 완료** — 앱 코드·ingredient_master 테이블·504행·items.ingredient_id 추적 |
| ✅ | **친구 수락 알림** — notifications.actor_id·type 확장 + handle_friendship_accepted 트리거 |
| ✅ | **레시피 AI 추천(§13-5)** — Edge Function(recommend-recipe) + Gemini 2.5 Flash |
| ✅ | **알림 진입점 종 아이콘화(§14)** — 하단 탭에서 알림 제거(4탭), 각 화면 헤더 우측 `NotificationBell`(안 읽음 빨간 점) |
| ✅ | **회원 탈퇴(§15)** — DB RPC `delete_own_account()`(SECURITY DEFINER) + FK CASCADE. 프로필 수정 화면에 배치 |
| ✅ | **디자인 토큰 시스템 도입** — `constants/theme.ts`에 `colors`/`radius`/`spacing`/`typography`/`button` 토큰 정의. 전 화면이 하드코딩 색 대신 토큰 참조. Expo 스타터 컴포넌트 전부 삭제(§10) |
| ✅ | **라우팅 재편(§16)** — `(main)/_layout.tsx`=Stack, 탭은 `(main)/(tabs)/_layout.tsx`로 분리. 상세 화면이 탭 위로 push되어 iOS 스와이프 뒤로가기 동작 |
| ✅ | **냉장고 화면 개편(§17)** — 보관방식 필터 탭(전체/냉장/냉동/실온) + 정렬 바텀시트(기본/이름/유통기한순) + `FridgeItemRow`(썸네일·D-day·상태점) |
| ✅ | **등록 화면 통합(§18)** — `register/ingredient.tsx`가 카테고리 사이드바 + 재료 그리드 + 이름 검색을 한 화면으로 통합. `register/category.tsx`는 미사용(고아) |
| ✅ | **디자인 2차(§19)** — `theme.ts colors` 재정비(textTertiary·borderStrong 신규 / surface #F2F2F7 교정 / accent·disabled 삭제 / `as const`), `CustomTabBar` 활성표시=흰 알약 박스, `friends/index` 커뮤니티 화면 Figma 적용(카드 그리드 + 친구추가 모달) |
| ✅ | **디자인 3차(§20)** — 냉장고 행(`FridgeItemRow`) 시안 교체(썸네일 50·색점 인라인·`›` 셰브론) + 친구 냉장고가 동일 행 재사용 / 등록 폼을 `ItemForm`에서 분리한 **`RegisterItemForm`** 전용 폼으로 Figma 적용(필 칩·배지·고정 CTA) + **유통기한 휠 피커(`DateWheelPicker`)** + 보관방식 변경 시 유통기한 재계산 버그 수정 / 레시피 목록·작성 화면 Figma 적용+토큰화 |
| 🟡 | **UX/UI 디자인 적용** — 토큰화·주요 화면 레이아웃 적용 진행 중. 남은 일: ⚠️ 추정 토큰값(텍스트/보더/틴트/타이포)·시안 고정값(라운드/그림자/폰트크기) 디자이너 확정값으로 교체, 나머지 화면(item·fridge·mypage 등) Figma 적용, 썸네일 실제 이미지, mypage 등 raw 숫자 화면 토큰화 |
| 보류 | 푸시 알림(Expo Notifications), 사용자 정의 카테고리, 식재료 사진(현재 단색 placeholder) |

---

## 3. 데이터 모델

### 기존 테이블 (✅ 구현)

**profiles**: `id(PK=auth.uid)` · `username` · `display_name` · `fridge_public(bool)` · `notify_comments(bool)` · `notify_expiry(bool)`

**items**: `id` · `owner_id(FK)` · `name` · `category(text)` · `storage(fridge|freezer|room)` · `storage_tip` · `expire_date` · `quantity` · `ingredient_id(nullable FK → ingredient_master.id)`

**friendships**: `id` · `requester_id` · `addressee_id` · `status(pending|accepted)`

**comments**: `id` · `item_id(FK)` · `author_id(FK)` · `content`

**notifications**: `id` · `recipient_id` · `type(comment|friend_accepted)` · `item_id(nullable)` · `comment_id(nullable)` · `actor_id(nullable FK→profiles)` · `is_read(bool)`

**recipes**: `id` · `owner_id` · `title` · `body` · `source(manual|ai)`

**category_expiry**: `id` · `owner_id` · `category` · `storage` · `default_days` — UNIQUE(owner_id, category, storage)

### v3 신규 (✅ ingredient_master — 테이블·504행 적재 완료)

`id` · `name(UNIQUE)` · `category` · `room_days` · `fridge_days` · `freezer_days` · `storage_tip` · `created_at` — **읽기 전용 마스터**(앱에서 수정 불가, 적재는 SQL Editor/service role)
- `room_days/fridge_days/freezer_days = 0` → 해당 보관방식 비권장
- 앱 타입: `types/ingredient.ts` (`IngredientMaster`, `masterDaysFor`)

---

## 4. RLS 규칙

- **items**: 주인=CRUD / 친구는 `fridge_public=true`인 것만 SELECT
- **comments**: accepted 친구만 작성, 작성자·주인 SELECT
- **notifications**: 본인(recipient) SELECT·UPDATE만
- **friendships**: 당사자인 것만 SELECT
- **recipes / category_expiry**: 본인 CRUD
- **ingredient_master**: 인증 사용자 SELECT만 (쓰기 정책 없음)

> ⚠️ 테이블 추가 시 **RLS ENABLE + 정책(DROP IF EXISTS → CREATE) + GRANT** 항상 세트. GRANT 누락 시 `permission denied` 발생.

---

## 5. 화면 구조 — 파일 ↔ 화면 매핑 (실제 코드 기준, UX/UI 작업용)

> 아래 표가 **단일 출처**. 어떤 화면을 만질지 정할 때 이 표에서 파일을 찾는다. (Expo Router = 파일 경로가 곧 라우트)

### 5-1. 라우팅 골격 (화면 아님 / 건드릴 일 적음)

> ⚠️ **§16 라우팅 재편**: 탭이 `(main)/_layout.tsx`에서 `(main)/(tabs)/_layout.tsx`로 내려갔다. `(main)/_layout`은 이제 Stack이고, 탭 묶음(`(tabs)`)을 첫 화면으로 두고 상세 화면들을 그 위로 push → iOS 스와이프 뒤로가기 동작.

| 파일 | 역할 |
|------|------|
| `app/_layout.tsx` | 루트. `AuthProvider` + `AuthRedirect`(세션 감시해 (auth)↔(main) 자동 전환) + 최상위 Stack. `console.log` 잔존(§10-5) |
| `app/index.tsx` | 세션 유무에 따라 `(main)`/`(auth)/login`으로 `Redirect`만 함. UI는 로딩 스피너뿐. `console.log` 잔존 |
| `app/(auth)/_layout.tsx` | 인증 그룹 Stack |
| `app/(main)/_layout.tsx` | **Stack**(탭 아님). `(tabs)`를 첫 화면으로, 상세 화면(item/fridge/register/friends/recipes/notifications/mypage)을 그 위로 push. `gestureEnabled:true`로 스와이프 뒤로가기 |
| `app/(main)/(tabs)/_layout.tsx` | **하단 탭바 정의**(4탭). 탭=냉장고/커뮤니티/레시피/마이페이지. 실제 탭바 그리기는 `components/CustomTabBar.tsx`(§19). **활성 탭=아이콘을 흰 알약 박스로 감싸고 아이콘만 `primary`로 반전 / 비활성=흰 아이콘·흰 라벨** |

### 5-2. 인증 화면

| 화면 | 파일 |
|------|------|
| 로그인 | `app/(auth)/login.tsx` — 이메일/비번 입력, `useAuth().signIn` |
| 회원가입 | `app/(auth)/signup.tsx` — 이메일/비번/username/display_name, `signUp` |

### 5-3. 탭 화면 (하단 탭으로 직접 진입, 각 화면 헤더 우측에 `NotificationBell`)

> 파일이 모두 `(main)/(tabs)/` 아래로 이동했다(§16).

| 탭 | 파일 | 화면 내용 |
|----|------|-----------|
| 🧊 냉장고 | `app/(main)/(tabs)/index.tsx` | **첫 화면=나의 냉장고 목록**(FlatList). 로고("냉부")+종+`＋추가` 헤더 → **보관방식 필터 탭(전체/냉장/냉동/실온)** → **개수 + 정렬 버튼(`SortSheet`)** → `FridgeItemRow` 목록(§17). 행 탭→`item/[id]`, 길게눌러 삭제, 빈 상태(필터별 문구 분기) |
| 👥 커뮤니티 | `app/(main)/(tabs)/friends/index.tsx` | **Figma 적용(§19)**: 헤더(좌 `Logo` / 우 종+친구추가 아이콘) + "커뮤니티" 제목 + **친구=흰 카드 2열 그리드**(제목=이름·아래=@아이디, 멤버수 미표시). 친구추가=헤더 아이콘→**모달**(검색입력+"추가하기"). **받은 요청 수락/거절**(그리드 위 섹션)·빈/로딩/에러 유지. 카드 탭→`friends/[friendId]`, 길게눌러 삭제 |
| 🍳 레시피 | `app/(main)/(tabs)/recipes/index.tsx` | **Figma 적용·토큰화(§20)**: 헤더(좌 `냉부` 로고·`thumbnail` 색 / 우 종+`＋추가`) + 가운데 "나의 레시피" 제목 + **레시피=흰 카드**(제목+`body` 2줄 미리보기; 부제·재료 필드 없어 body로 매핑). 배경=`surface`, 카드=`background`+그림자. 카드 탭→`recipes/[recipeId]`. source 뱃지 미표시(시안·코드 모두 없음) |
| 👤 마이페이지 | `app/(main)/(tabs)/mypage/index.tsx` | 프로필 요약 + **냉장고 공개 토글** + 메뉴 4개(프로필수정/알림설정/기본소비기한/공지) + 로그아웃 |

> 마이페이지 하위 화면(`mypage/profile`, `notification-settings`, `expiry/*`, `notice`)과 알림(`notifications`)은 탭이 아닌 **`(main)` Stack 직속**이라 `(tabs)` 밖에 있다(§5-8·5-9). 탭 화면에서 `router.push`로 진입.

### 5-4. 식재료 등록 흐름 (2단계, `register/` — §18로 통합됨)

> 냉장고 `＋추가` → **`register/ingredient`로 직행**(과거의 별도 카테고리 단계 없음).

| 단계 | 파일 | 내용 |
|------|------|------|
| ① 카테고리+재료 | `app/(main)/register/ingredient.tsx` | **좌 카테고리 사이드바 + 우 재료 그리드(3열 썸네일)** 한 화면. 상단 이름 **검색**(디바운스, 전체 마스터 대상). 재료 탭→③. **`+ 직접 입력`**으로 ③ 바이패스 가능 |
| ② 등록 폼 | `app/(main)/register/new.tsx` | **`RegisterItemForm`(create 전용, §20)** — `ItemForm` 공유를 끊고 분리. Figma 하이브리드(이름=대형 인라인 입력·필 칩·초록 요약 배지·고정 CTA "확인"). 표준 재료로 왔으면 이름·보관팁 프리필 + 권장 보관방식 기본선택 + 비권장 칩 비활성. **유통기한=우상단 배지 탭→`DateWheelPicker`(년/월/일 휠)**, 자동채움(`resolveExpiry`) + 보관방식 변경 시 재계산(단 휠로 직접 고른 값은 보존). `items.ingredient_id` 저장. 섹션 순서: 카테고리→보관방식→수량→보관법 |
| (미사용) | `app/(main)/register/category.tsx` | **고아 파일** — §18 통합 후 어디서도 `push`하지 않음. 정리 대상(§10) |

### 5-5. 식재료 상세·편집 (`item/`, `fridge/`)

| 화면 | 파일 | 내용 |
|------|------|------|
| 재료 정보(읽기 전용) | `app/(main)/item/[itemId].tsx` | **소유 여부로 분기**: 내 재료=`ItemDetail`+`편집`버튼+코멘트(읽기) / 친구 재료=`ItemDetail`+코멘트 목록·작성. 냉장고/친구 냉장고/알림에서 모두 여기로 진입. `ItemDetail`은 상단 단색 이미지 placeholder + 이름·보관방식 + 권장 소비기한·D-day 상태점 + 보관팁(불릿) + 중립 안내문구 |
| 재료 편집 | `app/(main)/fridge/[itemId].tsx` | `ItemForm`(edit) + 삭제 + 코멘트(읽기). `item/[id]`의 편집 버튼에서만 진입 |

### 5-6. 친구 냉장고 (`friends/[friendId]`)

| 화면 | 파일 | 내용 |
|------|------|------|
| 친구 냉장고(readonly) | `app/(main)/friends/[friendId].tsx` | 친구 프로필 + 품목 목록. **메인 냉장고와 동일한 `FridgeItemRow` 재사용(§20)**(인라인 행 제거). 비공개면 🔒 안내. 행 탭→`item/[id]`(코멘트 작성·삭제 longPress 없음) |

### 5-7. 레시피 상세·추가 (`recipes/`)

| 화면 | 파일 | 내용 |
|------|------|------|
| 레시피 추가 | `app/(main)/recipes/new.tsx` | 모드 분기 화면. **Figma 적용(§20)**: `choose`=가운데 제목 + 흰 카드 2장(직접작성/AI추천, 그림자) → `manual`=고정 헤더(뒤로)+이름·조리법 입력(초록 2px 테두리)+하단 고정 CTA "추가하기" / `ai`(냉장고 재료 선택→추천→미리보기→저장, **본문·로직 불변**) |
| 레시피 상세 | `app/(main)/recipes/[recipeId].tsx` | 보기 + 인라인 편집(제목/본문) + 삭제 |

### 5-8. 알림 (`notifications`)

| 화면 | 파일 | 내용 |
|------|------|------|
| 알림 목록 | `app/(main)/notifications.tsx` | 탭에서 제외(`href:null`), **각 화면 헤더 종 아이콘(`NotificationBell`)으로만 진입**. 항목 탭 시 읽음 처리 후 이동: `friend_accepted`→`friends/[actor_id]`, 그 외(코멘트)→`item/[item_id]` |

### 5-9. 마이페이지 하위 화면 (`mypage/`)

| 화면 | 파일 | 내용 |
|------|------|------|
| 프로필 수정 | `app/(main)/mypage/profile.tsx` | display_name·비밀번호 변경 + **회원 탈퇴 버튼(§15)** |
| 알림 설정 | `app/(main)/mypage/notification-settings.tsx` | 코멘트 알림/소비기한 알림 토글(profiles 플래그) |
| 기본 소비기한 — 카테고리 | `app/(main)/mypage/expiry/category.tsx` | 21개 카테고리 리스트 → `expiry/[category]` |
| 기본 소비기한 — 상세 | `app/(main)/mypage/expiry/[category].tsx` | 보관방식별 일수 입력/저장/삭제(`category_expiry` upsert) |
| 공지사항 | `app/(main)/mypage/notice.tsx` | 정적 공지 목록(아직 하드코딩 배열) |

### 5-10. 화면이 아닌 코드 (공통 컴포넌트·로직·토큰)

```
components/
  ItemForm.tsx        # 편집 공용 폼(create|edit|readonly 지원). **현재 fridge/[itemId](edit)에서만 사용** — 등록(create)은 §20에서 RegisterItemForm으로 분리됨. §6 참고
  RegisterItemForm.tsx# ★등록(create) 전용 폼(§20). Figma 하이브리드 — 대형 이름 입력·필 칩·초록 요약 배지·고정 CTA. 입력 필드/로직은 ItemForm create와 동치
  DateWheelPicker.tsx # ★유통기한 휠 피커 바텀시트(§20). 년/월/일 3컬럼, RN ScrollView snapToInterval+가운데 강조 밴드+페이드(새 패키지 없음). 'YYYY-MM-DD' 반환
  ItemDetail.tsx      # 재료 정보 읽기 전용 표시(이미지 placeholder·D-day 상태점·보관팁·안내문구)
  FridgeItemRow.tsx   # ★냉장고 목록 한 행(§17·§20). 원형 썸네일(50)·이름·D-day(bold)·임박 색점(이름 옆 인라인)·"날짜까지-보관"·우측 `›` 셰브론. 냉장고/친구 냉장고 공용
  SortSheet.tsx       # ★하단 정렬 바텀시트(기본/이름/유통기한순). SortKey·SORT_LABELS export. §17
  CustomTabBar.tsx    # ★하단 탭바 실제 렌더(§19). 활성=흰 알약 박스+초록 아이콘 / 비활성=흰 아이콘·라벨
  AddButton.tsx       # 헤더 '＋추가' 버튼(냉장고·레시피)
  CommentCardList.tsx # ★코멘트 카드형 목록(CommentCard 사용, loading/error/빈 처리). item/fridge 상세에서 사용
  CommentCard.tsx     # 코멘트 1장 흰 카드(이름·내용·삭제버튼)
  CommentList.tsx     # 구 코멘트 목록(인라인 회색). 현재 미사용(고아) — §10 정리 대상
  NotificationBell.tsx# 헤더 우측 종+빨간점. 색은 theme 토큰 참조, 누르면 알림 화면
contexts/AuthContext.tsx   # 세션·user 전역 상태 + signIn/signUp/signOut (useAuth). console.log 잔존
hooks/use-color-scheme.ts(.web.ts)  # 라이트/다크 감지(현재 거의 미사용)
lib/    supabase · items · profiles · friends · comments · notifications · recipes · expiry · format · ingredients · account
        - expiry.ts:    resolveExpiryDays 체인 + getDday/getDdayColor(D-day 상태색) + DDAY_*_THRESHOLD(3/14)
        - format.ts:    formatDateTime · formatExpireDate('YYYY.MM.DD') · formatRelativeTime('N분 전')
        - ingredients.ts: fetchIngredientsByCategory · fetchIngredientById · searchIngredients(이름 검색)
types/  item · friend · comment · notification · recipe · expiry · ingredient
constants/  categories.ts(21개 단일 출처) · theme.ts(★디자인 토큰: colors/radius/spacing/typography/button)
supabase_schema.sql
```

**UX/UI 작업 시 진입점:** 색·간격·라운드·타이포는 전부 `constants/theme.ts` 토큰을 거친다(현재 일부 ⚠️ 추정값). `colors`(§19 재정비, `as const`)에는 브랜드(primary/primaryTint/primaryTintBorder/thumbnail) + 텍스트(textPrimary/textSecondary/**textTertiary**#AEAEB2/textDisabled) + 경계선·면(border/**borderStrong**#D1D1D6/surface#F2F2F7/background) + 상태(danger/dangerTint·Border, warning/warningTint·Border) + overlay가 있다. ~~accent·disabled~~는 §19에서 삭제됨. 화면별 레이아웃/스타일은 각 화면 파일 하단의 `StyleSheet.create`에 있다(**mypage 등 일부 화면은 아직 raw 숫자·fontSize가 섞여 토큰화 여지 있음**; index/notifications/item/ingredient/friends는 토큰화됨).

**핵심 흐름 (요약):**
- 진입: 로그인 → 나의 냉장고 목록(`(main)/(tabs)/index`)
- 등록(§18): `register/ingredient`(카테고리 사이드바+재료 그리드+검색 / `+직접 입력` 바이패스) → `register/new`
- 내 재료 편집: 목록 → `item/[id]`(정보) → 편집 버튼 → `fridge/[id]`(편집)
- 친구 코멘트: 커뮤니티 → `friends/[friendId]`(친구 냉장고) → 품목 → `item/[id]`(코멘트 작성)
- 코멘트 → 알림: insert → `handle_new_comment` 트리거 → notifications 생성(notify_comments=true만)
- 알림 진입: 어느 탭 화면이든 헤더 종(`NotificationBell`) → `notifications` → 항목 탭 시 `item/[id]` 또는 `friends/[actor_id]`
- 소비기한 자동채움: `resolveExpiryDays` → ① category_expiry 개인값 → ② ingredient_master 일수(>0) → ③ null(빈칸 유지)

---

## 6. ItemForm 공통 컴포넌트

3가지 모드: `create`(insert) · `edit`(update) · `readonly`(비활성)
- 입력 항목: 이름, 카테고리, 보관방식(냉장/냉동/실온), 보관팁, 유통기한, 수량
- `resolveExpiry` prop: `(category, storage) => Promise<number|null>` — 유통기한 빈칸일 때만 자동채움
- `ingredientDays` prop: `Record<StorageType, number> | null` — 표준 재료 선택 시 일수가 0인 보관방식 칩 비활성(`(비권장)` 표시). null/미지정이면 모든 방식 활성(직접 입력)
- ⚠️ **§20 이후 `create`(등록)는 `RegisterItemForm`으로 분리**됨 → `register/new`는 ItemForm을 쓰지 않는다. ItemForm은 현재 `fridge/[itemId]`(edit)에서만 사용. RegisterItemForm은 위 prop(`resolveExpiry`/`ingredientDays`)·검증·자동채움 로직을 동일하게 유지하므로 등록 로직 변경 시 **두 곳을 함께** 확인할 것

---

## 7. §13-7 식재료 표준 데이터 — 완료 현황

앱 코드 + DB 적재 완료. 남은 것은 의도적으로 보류한 `items.ingredient_id`뿐.

1. ✅ `constants/categories.ts` → 21개로 교체 완료
2. ✅ `types/ingredient.ts` (`IngredientMaster`, `masterDaysFor`) 완료
3. ✅ `lib/ingredients.ts` (`fetchIngredientsByCategory`, `fetchIngredientById`) 완료
4. ✅ `lib/expiry.ts` `resolveExpiryDays` 우선순위 체인 완료
5. ✅ `register/ingredient.tsx` 표준 재료 선택 화면 완료
6. ✅ `register/new.tsx` ingredientId 파라미터·프리필·비권장 보관방식 처리 완료
7. ✅ `ItemForm` `ingredientDays` prop 완료
8. ✅ **`ingredient_master` 테이블 생성** (RLS ENABLE + SELECT 정책 + GRANT authenticated) — DB 적재 완료
9. ✅ **시드 데이터 적재** (504행) — DB 적재 완료
10. ✅ `items.ingredient_id` 저장 — 표준 재료 선택 시 마스터 id 저장, 직접 입력 시 null

**카테고리 21개 (categories.ts 실제값 = ingredient_master.category distinct와 일치 확인됨)**:
채소류·과일류·육류 및 가공육·수산물·우유/음료·치즈류·알류·버터류·백미/잡곡·콩류·견과류·가루류·조리반찬·통조림·냉동식품·가공식품·제과/제빵·면류·떡류·소스/양념·음료/주류

---

## 8. §13-5 레시피 AI 추천 — 구현 완료

**아키텍처**: 클라이언트 → Supabase Edge Function(`recommend-recipe`) → Google Gemini API. API 키는 클라이언트에 노출하지 않고 Edge Function의 secret으로만 보관.

**AI 모델**: Google Gemini 2.5 Flash (무료 티어)
- endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- `generationConfig.responseMimeType="application/json"`으로 JSON 출력 강제
- 무료 티어 한도: 하루 250회. 무료 티어는 입력/출력이 모델 학습에 사용될 수 있음

**Edge Function** (`supabase/functions/recommend-recipe/index.ts`)
- JWT 수동 검증(config.toml `verify_jwt=false` + 함수 내부 `supabase.auth.getUser()`). CORS preflight(OPTIONS)는 토큰이 없어서 이 패턴이 필요함
- 입력: `{ items: [{ name, category, expire_date }] }`
- 서버에서 오늘 날짜를 계산해 프롬프트에 전달, 유통기한 임박 재료 우선 활용 지시
- 출력: `{ title, body, used_ingredients[] }`
- 타임아웃 15초(AbortController). 실패/파싱오류 시 500 + 메시지. API 키는 로그에 남기지 않음

**클라이언트**
- `lib/recipes.ts`: `requestAiRecipe(items)` — `supabase.functions.invoke('recommend-recipe')`로 호출(JWT 자동 첨부). `createRecipe(userId, values, source='manual')`로 확장, `source='ai'` 지원
- `types/recipe.ts`: `AiRecipeResult { title, body, used_ingredients[] }`
- `app/(main)/recipes/new.tsx`: 모드 분기(직접 작성 / AI 추천). AI 추천 흐름: 냉장고 재료 fetch(임박 순 정렬, 기본 선택) → 추천받기 → 미리보기 → 저장(source='ai') / 다시 추천

---

## 8-1. §14 알림 진입점 — 종 아이콘 + 빨간 점 (구현 완료)

하단 탭의 "알림"을 제거하고 각 메인 화면 헤더 우측의 종 아이콘으로 진입하도록 변경.

- **탭 제거**: `app/(main)/_layout.tsx`에서 notifications를 탭 목록 밖 `href:null` 그룹으로 이동(4탭). 화면 파일·라우팅은 그대로 유지 → `router.push('/(main)/notifications')`로 접근.
- **재사용 컴포넌트**: `components/NotificationBell.tsx` — `Ionicons notifications-outline` + 절대 위치 빨간 점. 누르면 알림 화면 이동. 색·크기는 파일 상단 상수(`BELL_COLOR`=기본 텍스트, `BADGE_COLOR`=danger, `BELL_SIZE`/`BADGE_SIZE`)로 모아 둠 → 디자인 토큰 정해지면 이곳만 교체(`// TODO: theme.*`).
- **안 읽음 조회**: `lib/notifications.ts`에 `hasUnreadNotifications(userId)` 추가 — `recipient_id=본인 & is_read=false` count 쿼리(`head:true`, 개수 미반환). 컴포넌트는 supabase 직접 쿼리 없이 lib 경유.
- **갱신**: 컴포넌트의 `useFocusEffect`로 화면 포커스마다 재조회. 알림 화면에서 개별 항목 탭 시 `markNotificationRead` → 돌아오면 점 사라짐. 개수 없이 있음/없음만 표시.
- **헤더 배치**: 냉장고·레시피는 기존 `＋ 추가` 옆 `headerActions` row에 추가, 헤더가 없던 커뮤니티·마이페이지는 제목+종을 `header` row(`space-between`)로 감쌈. 웹/iOS/안드로이드 공통 동작 확인.

---

## 8-2. §15 회원 탈퇴 — DB RPC 방식 (구현 완료)

**최종 아키텍처**: 클라이언트 → Supabase **RPC `delete_own_account()`**. (Edge Function 방식으로 먼저 구현했으나 service_role 키 주입/권한 문제로 RPC로 전환. delete-account 함수·config 항목은 제거됨.)

- **DB 함수**: `public.delete_own_account()` — `SECURITY DEFINER`. 내부에서 `auth.uid()`로 호출자 본인 식별 → `profiles` 행 1개 삭제. 나머지는 FK가 처리.
- **CASCADE 전제**: `profiles.id`를 기준으로 items/comments/friendships/recipes/category_expiry/notifications가 전부 `ON DELETE CASCADE`. `profiles.id → auth.users`도 CASCADE → profiles 한 행 삭제로 public 데이터 + 인증 계정까지 정리(개별 삭제 코드 불필요).
- **권한**: `authenticated` 역할에 `EXECUTE` GRANT 필요. SECURITY DEFINER라 RLS를 우회해 삭제 수행.
- **클라이언트** `lib/account.ts`: `deleteAccount()` — `supabase.rpc('delete_own_account')` 호출(JWT 자동 첨부), `error`면 throw. void 반환이라 데이터 체크 없음.
- **UI** `app/(main)/mypage/profile.tsx`(프로필 수정 화면 하단에 배치): 파괴적 동작 스타일 버튼 → 확인 다이얼로그(§9 분기: 웹 `window.confirm` / 네이티브 `Alert.alert` 취소·탈퇴 destructive) → 진행 중 버튼 비활성+로딩 → 성공 시 `await supabase.auth.signOut().catch(() => {})`로 로컬 세션만 비우고 `router.replace('/(auth)/login')`. 실패 시 웹/네이티브 분기 에러 표시(내부 상세 비노출).

---

## 8-3. §16 라우팅 재편 — Stack + 탭 분리 (구현 완료)

상세 화면에서 **iOS 엣지 스와이프 뒤로가기**가 동작하도록 라우팅 구조를 한 단계 중첩으로 바꿈.

- **이전**: `(main)/_layout.tsx`가 곧 탭바였고 상세 화면을 `href:null`로 탭에서 숨겼음 → 상세 화면이 탭의 형제라 스와이프 pop이 자연스럽지 않았음.
- **현재**: `(main)/_layout.tsx`=**Stack**(`headerShown:false`, `gestureEnabled:true`). 탭 묶음은 `(main)/(tabs)/_layout.tsx`로 내려가 Stack의 첫 화면이 됨. 상세 화면(item/fridge/register/friends/recipes/notifications/mypage)은 그 위로 push되어 스와이프/시스템 뒤로가기로 pop.
- **파일 이동**: 4개 탭 화면이 `(main)/(tabs)/`로 이동(`index`, `friends/index`, `recipes/index`, `mypage/index`). 나머지는 `(main)` 직속 유지. **Expo Router는 그룹 폴더 `(tabs)`를 URL에 포함하지 않으므로 `router.push` 경로 문자열은 그대로**(예: `/(main)/item/[id]`).

---

## 8-4. §17 냉장고 화면 개편 — 필터·정렬·행 컴포넌트 (구현 완료)

`(main)/(tabs)/index.tsx`를 단순 FlatList에서 시안 기반 레이아웃으로 개편.

- **헤더**: 로고("냉부") + `NotificationBell` + `＋추가`(→ `register/ingredient` 직행).
- **보관방식 필터 탭**: 전체/냉장/냉동/실온. `storage` 값으로 클라이언트 필터(밑줄 활성 표시).
- **정렬**: 개수("N개의 재료") 옆 버튼 → `SortSheet`(하단 바텀시트). `기본순`(불러온 순)/`이름순`(`localeCompare 'ko'`)/`유통기한순`(날짜 없는 항목은 뒤로). 필터→정렬 순으로 `useMemo` 적용.
- **행**: `FridgeItemRow` — 원형 썸네일(단색) + 이름 + D-day 뱃지(`D-21`/`D-DAY`/`D+3`) + "소비기한 까지 · 보관방식" + 우측 상태점. 길게눌러 삭제(`delayLongPress=400`).
- **D-day 상태색**: `lib/expiry.ts`의 `getDday`(자정 기준 일수) + `getDdayColor`(≤3 danger / ≤14 warning / 그 외 primary). 임계값은 `DDAY_DANGER_THRESHOLD`/`DDAY_WARNING_THRESHOLD` 상수.
- **빈 상태**: 필터 적용 여부에 따라 문구 분기.

---

## 8-5. §18 등록 화면 통합 (구현 완료)

과거 `register/category`(카테고리) → `register/ingredient`(재료) **2단계를 한 화면으로 통합**.

- **`register/ingredient.tsx`**: 좌측 카테고리 사이드바(21개) + 우측 재료 그리드(3열 썸네일). 상단 검색창에 이름 입력 시 카테고리 무시하고 **전체 마스터에서 `searchIngredients`**(250ms 디바운스). `+ 직접 입력`으로 ③(폼) 바이패스.
- **진입점 변경**: 냉장고 `＋추가`가 `register/ingredient`로 직행(카테고리 단계 제거).
- **`register/category.tsx`는 고아**가 됨(§10 정리 대상). 단, **마이페이지 기본 소비기한의 `mypage/expiry/category.tsx`는 별개 파일**이며 계속 사용됨(혼동 주의).
- `lib/ingredients.ts`에 `searchIngredients(keyword)` 추가.

---

## 8-6. §19 디자인 2차 — 토큰 정비 · 탭바 · 커뮤니티 Figma 적용 (구현 완료)

theme 토큰을 재정비하고, 탭바·커뮤니티 화면을 Figma 시안대로 교체.

- **`theme.ts colors` 재정비**:
  - 신규: `textTertiary(#AEAEB2)`(textSecondary보다 약한 텍스트), `borderStrong(#D1D1D6)`(진한 경계선) — 아직 미사용, 정의만.
  - 교정: `surface` `#F2F2F2 → #F2F2F7`(오타 교정 + 구 시안 `#F4F6F4` 흡수).
  - 삭제: `accent`·`disabled`(전 코드 참조 0건 확인 후 제거).
  - `as const` 부여(리터럴 타입). 사용 중 토큰(primary/primaryTint(+Border)/danger계열/warning계열/overlay/thumbnail 등)은 값 그대로 유지 → 참조 안 깨짐(tsc 통과).
  - ⚠️ 시안 고정값·추정 토큰은 `memory/figma-token-reconcile`에서 추적.
- **`components/CustomTabBar.tsx` 활성표시 변경**: 활성 탭 = 아이콘을 **흰 알약 박스**(`background` 채움, radius)로 감싸고 아이콘만 `colors.primary`(초록)로 반전 / 비활성 = 박스 투명·흰 아이콘·흰 라벨. 활성/비활성 동일 패딩으로 1px 밀림 방지. (기존 "활성 흰색·비활성 회색"에서 변경.)
- **커뮤니티 `friends/index.tsx` Figma 적용**(node 1:534=화면, 1:671=친구추가 모달):
  - 헤더: 좌 `Logo`(`thumbnail` 색) / 우 `NotificationBell` + 친구추가 아이콘(`person-add-outline`). 제목 "친구" → **"커뮤니티"**.
  - 본문: **친구 1명 = 흰 카드, 2열 그리드**(제목=`display_name`, 아래=`@username`, **멤버수 미표시**). 배경=`surface`, 카드=`background`+그림자.
  - 친구추가: 헤더 아이콘 → **모달**(스크림=`overlay` + 돋보기 입력 + "추가하기" 알약; 입력 있으면 `primary`, 없으면 `border` 회색 비활성). 표시용 state `addModalVisible` 추가, `handleAdd` 로직은 유지.
  - 데이터 호출(`fetchFriends`/`fetchPendingRequests`)·수락/거절/삭제 핸들러·기존 state·네비 **전부 유지**. 디자인 외 요소(받은 요청 섹션=그리드 위·경고색→중립 카드 톤 / 빈·로딩·에러)는 **삭제 없이 새 톤으로 유지**.
  - 시안 고정값(카드 높이 105·내부 gap 10·제목/Logo 폰트 16·20·그림자)은 `⚠️` 주석 상수로 표기.
- **코멘트 컴포넌트 관계 정리**: 상세 화면(item/fridge)이 `CommentCardList`(카드형, `CommentCard` 사용)를 쓴다. 구 `CommentList`(인라인 회색 목록)는 **현재 미사용(고아)** → §10 정리 대상.

---

## 9. 주요 트러블슈팅 요약

| 이슈 | 해결 |
|------|------|
| `permission denied` | RLS + GRANT 세트 누락. GRANT 추가 후 대시보드 Policies 확인 |
| RLS 정책 0개 = 전체 차단 | 정책은 `DROP POLICY IF EXISTS` 후 CREATE. 적용 후 눈으로 확인 |
| friendships 임베드 모호 | 2단계 조회(friendships → id 수집 → profiles `.in()`) |
| iOS 모달 키보드 가림 | 풀스크린 모달 + KeyboardAvoidingView behavior 분기 |
| ItemForm 중첩 스크롤 | `scrollable` prop으로 외부 스크롤에 위임 |
| 알림은 앱이 아닌 트리거 생성 | `handle_new_comment`(SECURITY DEFINER) 트리거가 notifications insert |
| 웹 SecureStore 에러 | `Platform.OS === 'web'`이면 storage=undefined(supabase-js 기본 localStorage 사용) |
| 웹 Alert.alert no-op | 웹=`window.confirm/alert`, 네이티브=`Alert` 분기 |
| Edge Function이 secret을 못 읽음(GEMINI_API_KEY undefined) | secret 이름이 코드의 `Deno.env.get()` 문자열과 글자까지 정확히 일치해야 함. 환경변수는 대문자_언더스코어 규칙(공백/소문자 금지). 예: `"Gemini API Key"`(X) → `"GEMINI_API_KEY"`(O) |
| secret 추가/수정 후 함수가 옛 값을 씀 | secret 변경 후 `functions deploy`로 재배포 필요 |
| supabase CLI가 TransportError로 secret set/login 실패 | 네트워크(방화벽/프록시) 문제. secret은 대시보드 Edge Functions > Secrets에서 직접 등록 가능. 배포가 막히면 VPN 끄기 / 핫스팟 전환 |
| Gemini API 호출 타임아웃 | 레시피 생성은 응답이 길어 10초가 빠듯. 15초 권장 |
| 앱에서 "Edge Function returned a non-2xx status code"만 뜨고 원인 불명 | 대시보드 Edge Functions > Logs에서 함수의 `console.error` 메시지로 실제 원인 확인 |
| Edge Function에서 `permission denied for table profiles` | service_role 키가 런타임에 미주입/빈 값이면 익명 권한으로 동작해 RLS에 막힘. service_role이 꼭 필요한 관리 작업(타 유저 행 삭제 등)은 **SECURITY DEFINER DB 함수 + RPC**가 키 주입 의존이 없어 더 단순(§15에서 이 방식 채택) |

---

## 10. 정리 대상 (§10-5)

- ~~`components/`의 Expo 스타터 잔존물(external-link, haptic-tab, hello-wave, parallax-scroll-view, themed-text, themed-view, ui/collapsible, ui/icon-symbol 등) 삭제~~ → **완료.** `hooks/use-theme-color.ts`도 삭제됨
- ~~`constants/theme.ts` 삭제~~ → **무효.** theme.ts는 삭제 대신 **디자인 토큰 정식 도입처**가 됨(colors/radius/spacing/typography/button). `NotificationBell`의 임시 상수도 토큰 참조로 전환 완료. 남은 일은 ⚠️ 추정값을 디자이너 확정값으로 교체하는 것
- `console.log` 제거 — **아직 남아 있음**: `app/_layout.tsx`, `app/index.tsx`, `contexts/AuthContext.tsx` 3곳
- `app/(main)/register/category.tsx` — §18 통합 후 **미사용(고아) 파일.** 삭제 검토(현재 어디서도 push 안 함)
- `components/CommentList.tsx` — §19 이후 **미사용(고아).** `CommentCardList`(카드형)가 대체. 삭제 검토
- ~~알림 클릭 이동 경로: `fridge/[id]` → `item/[id]` 변경 검토~~ → **완료.** `notifications.tsx`가 코멘트 알림은 `item/[id]`, 친구수락 알림은 `friends/[actor_id]`로 이동
- `hooks/use-color-scheme` : 다크모드 미사용이면 정리 검토(아직 남음)

---

## 8-7. §20 디자인 3차 — 냉장고 행·친구 카드 통일 · 등록 폼 분리+휠 피커 · 레시피 화면 Figma (구현 완료)

추가 화면들을 Figma 시안대로 교체하고, 등록 흐름을 전용 폼으로 분리했다.

- **냉장고 행 `FridgeItemRow` 시안 교체**: 원형 썸네일 44→**50**, 상태 색점 8→**10**, 색점을 우측 끝에서 **이름·D-day 옆 인라인**으로 이동, 우측 끝에 **`›` 셰브론**(`Ionicons chevron-forward`, 상세 이동 어포던스) 추가, 아랫줄 메타를 `"날짜 까지 · 보관"` → **`"날짜까지-보관"`**, D-day 라벨 **bold**. 메인 냉장고(`(tabs)/index`)의 카운트 문구도 `"N개의 재료"` → **`"N가지 재료"`**, 정렬 버튼 `"기본순 ▾"` → **`"기본순"`**(회색), 로고 색을 **다크 그린**(`thumbnail`)으로.
- **친구 냉장고가 동일 행 재사용**: `friends/[friendId].tsx`의 인라인 `ItemRow`(카테고리·수량·만료/임박 텍스트)를 제거하고 **`FridgeItemRow`를 import**해 메인과 시각 통일. 데이터 호출(`fetchFriendItems`·`fridge_public`), 헤더(친구명/@아이디), 카드 탭→`item/[id]`(코멘트 흐름), 빈/비공개 문구는 **전부 보존**. 삭제 longPress는 전달 안 함(남의 냉장고). 카테고리·수량 노출은 행 통일로 사라짐(의도).
- **등록 폼 분리 `RegisterItemForm`**: `register/new`가 공유 `ItemForm` 대신 전용 폼 사용(create만 새 디자인, edit/readonly 무영향). Figma 하이브리드 = 시안 비주얼(필 칩·초록 요약 배지·구분선·고정 CTA "확인") + **편집 입력 필드 전부 유지**(이름=보더리스 대형 입력, 보관법·유통기한 포함)로 §7-10 직접입력 바이패스 등 로직 7종 보존. 보관방식 칩 선택색은 시안대로 **진회색(`textSecondary`)/흰 글씨**(앱 기본 그린 선택과 다름 — reconcile 대상).
- **유통기한 휠 피커 `DateWheelPicker`**: 텍스트 입력 → **년/월/일 휠 바텀시트**로 교체. 우상단 **요약 배지 탭**으로 열림(보관방식은 칩에서, 휠은 **날짜만** 수정). 빈값이면 휠 초기값=오늘, **확인 시에만** 기록(미설정이면 빈값 유지→insert null). 새 패키지 없이 RN `ScrollView snapToInterval` + `Animated` opacity 페이드 + 가운데 강조 밴드로 구현. 저장 포맷 `YYYY-MM-DD` 유지.
- **유통기한 재계산 버그 수정 + 섹션 순서**: 보관방식 변경 시 유통기한이 갱신 안 되던 버그(자동채움이 `expire_date` 있으면 건너뛰던 가드가 원인) 수정 — 가드 제거 후 **`manualExpiry` 플래그**로 게이트(자동채움값은 보관방식 변경 시 재계산, 휠로 직접 고른 값은 보존). 폼 섹션 순서 **수량↔보관방식 교체** → 카테고리→보관방식→수량→보관법.
- **레시피 목록 `recipes/index` Figma+토큰화**: 헤더(좌 `냉부` 로고 / 우 종+`＋추가`) + 가운데 "나의 레시피" + **흰 카드 리스트**(제목 + `body` 2줄; `Recipe`에 부제·재료 필드가 없어 body로 매핑, 허위 "재료:" 라벨 미생성). 화면 배경=`surface`, 카드=`background`+다크그린 그림자. fetch·네비·빈/로딩/에러 보존, source 뱃지 미표시.
- **레시피 작성 `recipes/new` Figma**: `choose`=가운데 제목 + 흰 카드 2장(직접작성=`create-outline`/AI추천=`robot-outline` 아이콘, 그림자). `manual`=고정 헤더(뒤로 화살표 + "직접 추가") + 이름·조리법 입력(초록 2px 테두리) + 하단 고정 CTA "추가하기"(pill). **AI 추천 본문(재료선택·추천·미리보기)·로직·전용 스타일은 불변** — manual CTA는 별도 `cta` 스타일을 신설해 AI 버튼 공유 스타일 미변경. 모드 분기·저장(`createRecipe` manual/ai)·검증·네비·뒤로가기 보존.
- **CTA radius 정합**: 등록·레시피작성 CTA를 Figma `rounded-100`=`button.radius`(=`radius.pill`)로 통일(기존 9999/16/8 혼재 해소). ⚠️ **입력박스 radius 12는 토큰 부재** → 최근접 `radius.card(16)` 사용 + reconcile 시 `radius.md=12` 신설 검토. 타이포 일부 크기(16·18·14 등) 정확 토큰 부재 → 최근접 사용, `memory/figma-token-reconcile` 추적.
