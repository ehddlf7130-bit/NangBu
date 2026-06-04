# NangBu 냉장고 앱 — 개발 지침서 (압축판)

> Claude Code용. 이 파일을 기준으로 개발 지시.
> **기준일: 2026-06-04 (친구 수락 알림 완료)**

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
| ⬜ | 회원 탈퇴(Edge Function/RPC 필요) |
| ⬜ | UX/UI 디자인 적용 |
| 보류 | 푸시 알림(Expo Notifications), 사용자 정의 카테고리 |

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

## 5. 화면 구조 (v2 실제)

```
app/
  _layout.tsx          # AuthProvider + AuthRedirect + Stack
  index.tsx            # 세션 → Redirect
  (auth)/              login.tsx / signup.tsx
  (main)/
    _layout.tsx        # 하단 탭: 냉장고/커뮤니티/레시피/알림/마이페이지
    index.tsx          # 나의 냉장고 목록 (첫 화면)
    register/          category.tsx / ingredient.tsx / new.tsx (등록 3단계 흐름)
    item/[itemId].tsx  # 재료 정보 (읽기 전용) — 내 재료=편집버튼, 친구재료=코멘트작성
    fridge/[itemId].tsx # 편집 전용 + 삭제
    friends/           index.tsx / [friendId].tsx (친구 냉장고 readonly)
    recipes/           index.tsx / new.tsx / [recipeId].tsx
    notifications.tsx
    mypage/            index.tsx / profile.tsx / notification-settings.tsx / notice.tsx
                       expiry/ (category.tsx / [category].tsx)

components/  ItemForm.tsx(create|edit|readonly) · ItemDetail.tsx · CommentList.tsx
lib/         supabase · items · profiles · friends · comments · notifications · recipes · expiry · format · ingredients
types/       item · friend · comment · notification · recipe · expiry · ingredient
constants/   categories.ts (단일 출처, 21개)
supabase_schema.sql
```

**핵심 흐름:**
- 진입: 로그인 → 나의 냉장고 목록
- **등록(§13-7 적용):** 냉장고 → 카테고리 선택 → **표준 재료 선택**(`register/ingredient`) → 등록(`register/new`, 이름·보관팁 프리필 + 비권장 보관방식 비활성) / 직접 입력 버튼으로 바이패스 가능
- 내 재료 편집: 목록 → `item/[id]`(정보) → 편집 버튼 → `fridge/[id]`(편집)
- 친구 코멘트: 커뮤니티 → 친구 냉장고 → 재료 → `item/[id]`(코멘트 작성)
- 코멘트 → 알림: insert → `handle_new_comment` 트리거 → notifications 생성(notify_comments=true인 경우만)
- 소비기한 자동채움: `resolveExpiryDays` → ① category_expiry 개인값 → ② ingredient_master 일수(>0) → ③ null(빈칸 유지)

---

## 6. ItemForm 공통 컴포넌트

3가지 모드: `create`(insert) · `edit`(update) · `readonly`(비활성)
- 입력 항목: 이름, 카테고리, 보관방식(냉장/냉동/실온), 보관팁, 유통기한, 수량
- `resolveExpiry` prop: `(category, storage) => Promise<number|null>` — 유통기한 빈칸일 때만 자동채움
- `ingredientDays` prop: `Record<StorageType, number> | null` — 표준 재료 선택 시 일수가 0인 보관방식 칩 비활성(`(비권장)` 표시). null/미지정이면 모든 방식 활성(직접 입력)

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

---

## 10. 정리 대상 (§10-5)

- `components/`의 Expo 스타터 잔존물(external-link, haptic-tab, hello-wave 등) 삭제
- `constants/theme.ts` 삭제
- `console.log` 제거 (AuthContext, index, _layout 등)
- 알림 클릭 이동 경로: `fridge/[id]` → `item/[id]` 변경 검토
