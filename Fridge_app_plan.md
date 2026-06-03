# 냉장고 관리 앱 — 개발 지침서 (Claude Code용)

> 이 문서는 Expo(React Native) 기반 냉장고 관리 앱을 Claude Code로 개발하기 위한 지침서입니다.
> 프로젝트 루트에 두고, Claude Code에게 "이 문서를 기준으로 개발해줘"라고 지시하세요.

> ## ⚠️ 문서 버전 안내 (필독)
> **2026-06-01 기준 — v2 개편이 대부분 구현 완료되었다.** 이 문서는 실제 코드 상태에 맞춰 최신화되었다.
>
> v2 핵심 변화와 구현 현황:
> 1. ✅ **메인 화면(6개 메뉴 그리드) 폐지** → **나의 냉장고 목록**이 앱의 기본(첫) 화면. 하단 탭(냉장고/커뮤니티/레시피/알림/마이페이지)으로 재구성 (§13-1).
> 2. ✅ 메뉴 재구성: **AI 챗봇·설정 삭제**, **재료 정보·레시피·마이페이지 신설**. (알림·커뮤니티(=친구)는 유지)
> 3. ✅ **재료 정보 화면 신설**(`item/[itemId]`): 냉장고/친구 냉장고에서 품목을 누르면 열리는 **읽기 전용 상세 화면**(별도 `ItemDetail` 컴포넌트). 내 재료는 편집 버튼·코멘트 목록, 친구 재료는 코멘트 작성 (§13-2).
> 4. ✅ **레시피 기능**: 저장한 레시피 목록 + 상세(인라인 편집) + 직접 추가 (§13-4). ⬜ AI 추천은 미구현 (§13-5).
> 5. ✅ **마이페이지 신설**: 프로필 수정(비밀번호·회원명), 알림 설정, 기본 소비기한 설정(보관방식별), 공지사항, 냉장고 공개 토글, 로그아웃 (§13-3, §13-6). ⬜ 회원 탈퇴는 미구현(서버 함수 필요).
>
> **남은 작업**: 식재료 표준 데이터 도입(§13-7, **신규 대형 변경**), 레시피 AI 추천(§13-5), 회원 탈퇴, 친구 수락 알림(§12-1), UX/UI 디자인 적용. → **§10 참조**.
> 구현 단계별 상세와 완료 표기는 **§13**, 실제 화면-파일 대응은 **§6** 참조.
>
> ### 🆕 v3 예정 — 식재료 표준 데이터(ingredient master) 도입 (미구현, §13-7)
> 약 504개 식재료의 표준 보관 정보를 DB **마스터 테이블**(`ingredient_master`)로 앱이 기본 제공한다(사용자 수정 불가). 이에 따라:
> 1. **식품 등록 흐름 변경**: 카테고리 선택 → **표준 재료 선택** → 보관방식 선택 → **유통기한 자동 표시(오늘 + 해당 보관 일수, 수정 가능)**. 목록에 없으면 '직접 입력' 경로로 기존처럼 수동 등록.
> 2. **카테고리 ~21개로 재구성**: 데이터 권위가 `ingredient_master.category`로 이동. `constants/categories.ts`는 21개 **정렬 단일 출처**로 유지(마스터와 정합성 계약).
> 3. **`category_expiry`(§13-6) 역할 재정의**: 폐지하지 않고 **개인 조정값으로 마스터보다 우선 적용**(개인값 우선). 상세 우선순위는 §4-2·§13-7.
> 상세는 §4-3(테이블/RLS/적재)·§4-1(카테고리)·§6-2·§6-3·§13-7.

---

## 1. 프로젝트 개요

사용자가 자기 냉장고의 식재료를 등록·관리하고, 친구(커뮤니티)의 냉장고를 들여다보며 각 재료에 코멘트를 남길 수 있는 모바일 앱이다. 친구 기능은 에브리타임의 시간표 공유 방식을 모델로 한다 — 친구 목록에서 이름을 누르면 그 친구의 냉장고 데이터가 열린다. v2에서는 내 냉장고 데이터를 기반으로 AI가 레시피를 추천하는 기능과, 카테고리별 기본 소비기한 개인화 설정이 추가된다.

- **플랫폼**: Expo (React Native), iOS/Android 동시 지원
- **백엔드**: Supabase (PostgreSQL + Auth + Realtime + RLS)
- **개발 범위**: MVP 1차는 §2에 따라 구현 완료. 다음 단계는 §13의 v2 개편 계획을 순서대로 진행.

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

### 2-2. 2차 / v2 개편 (대부분 구현 완료)
팀 플로우차트 개편(v2)에 따라 진행했다. 상세·완료 표기는 **§13**.
- ✅ 메인 화면 폐지 → 나의 냉장고 목록을 첫 화면으로 (§13-1)
- ✅ 재료 정보(읽기 전용) 화면 분리 (§13-2)
- ✅ 마이페이지(프로필 수정·알림 설정·기본 소비기한 설정·공지사항) 신설 (§13-3) — 단 회원 탈퇴 ⬜
- ✅ 레시피 기능: 저장/조회 (§13-4) — AI 추천 ⬜ (§13-5)
- ✅ 보관방식별 기본 소비기한 개인화 (§13-6)

남은 작업 (→ §10):
- ⬜ **식재료 표준 데이터 도입 (§13-7) — 대형 변경**: `ingredient_master` 테이블, 카테고리 ~21개 재구성, 등록 흐름(카테고리→표준 재료→보관방식→유통기한 자동) 변경, `category_expiry` 역할 재정의(개인값 우선)
- ⬜ 레시피 AI 추천 (§13-5)
- ⬜ 회원 탈퇴 (서버 함수/RPC 필요)
- ⬜ 친구 수락 알림 (notifications 스키마 수정 필요, §12-1)
- ⬜ UX/UI 디자인 적용 (§12-5)

여전히 보류(별도 트랙):
- 푸시 알림 (Expo Notifications)
- 사용자 정의 카테고리 (별도 categories 테이블, §4-1)

> **삭제됨**: 기존 2차 후보였던 'AI 챗봇'은 v2에서 **레시피 AI 추천**으로 대체되었다. 기존 '설정' 화면은 마이페이지로 흡수되었다.

---

## 3. 기술 스택

| 영역 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | Expo (managed workflow) | `npx create-expo-app` |
| 라우팅 | Expo Router (파일 기반) | 화면 구조와 1:1 매핑 |
| 백엔드 | Supabase | `@supabase/supabase-js` |
| 인증 | Supabase Auth (email/password) | |
| 상태 관리 | React Context + hooks | 규모상 Redux 불필요 |
| 저장(세션) | expo-secure-store (네이티브) / localStorage (웹) | 토큰 보관. 웹은 SecureStore 미지원이라 Platform 분기 (§11-8) |
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
| fridge_public | boolean (default true) | 친구에게 냉장고 공개 여부 (마이페이지 토글) |
| notify_comments | boolean (default true) | 코멘트 알림 수신 여부. `handle_new_comment` 트리거가 확인 (§13-3) |
| notify_expiry | boolean (default true) | 소비기한 임박 알림 수신 여부 (저장만, 수신 동작은 미구현) |
| created_at | timestamptz | |

### items (냉장고 품목)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| owner_id | uuid (FK → profiles.id) | 품목 주인 |
| name | text | 식재료 이름 |
| category | text | 과일/육류/유제품 등. 자유 문자열이므로 카테고리 추가 시 스키마 변경 불필요 (4-1 참조) |
| storage | text | 'fridge' \| 'freezer' \| 'room' (냉장/냉동/실온) |
| storage_tip | text | 보관법 정보 |
| expire_date | date | 유통기한 |
| quantity | int | 수량 |
| ingredient_id | uuid (FK → ingredient_master.id, nullable) | **v3 제안(선택 사항)**: 표준 목록에서 고른 재료면 연결, '직접 입력'이면 NULL. 마스터 연결 추적용 (§13-7). 미채택 시 추가하지 않아도 무방 |
| created_at | timestamptz | |

> **v3 제안(선택)**: `ingredient_id`는 어떤 표준 재료에서 등록됐는지 추적하려는 용도다. `name`/`category`/`storage`/`storage_tip`/`expire_date`만으로도 등록은 동작하므로 **필수는 아니다**(§13-7에서 도입 여부 결정). 도입 시에도 nullable로 두어 '직접 입력' 품목과 기존 데이터를 깨지 않는다.

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

### 4-1. 카테고리 관리 방침
`items.category`는 enum이 아니라 자유 `text` 컬럼이다. 따라서 카테고리를 늘려도 DB 스키마는 변경할 필요가 없다. MVP에서는 카테고리 목록을 코드 상수 배열 하나로 관리한다.

```ts
// constants/categories.ts
export const CATEGORIES = ['과일', '육류', '유제품'];
// 이후 항목만 추가: ['과일', '육류', '유제품', '채소', '음료', '냉동식품', ...]
```

카테고리 선택 화면(`register/category.tsx`)은 이 배열을 import해서 렌더링한다. 새 카테고리는 배열에 추가하기만 하면 된다. **사용자가 직접 카테고리를 만드는 기능(사용자 정의 카테고리)은 2차로 미룬다** — 그때는 별도 `categories` 테이블을 도입한다. 처음부터 이 배열을 단일 출처(single source)로 두어 화면 여러 곳에서 하드코딩하지 않도록 한다.

#### 4-1-a. v3 카테고리 재구성 (식재료 표준 데이터 도입, §13-7) — ⬜ 예정

식재료 표준 데이터(`ingredient_master`, §4-3)가 들어오면 **카테고리의 데이터 권위는 `ingredient_master.category`로 이동**한다. 카테고리는 마스터 데이터에 들어있는 값으로 정해진다(약 **21개**). 구성:

- **대분류 유지(6)**: 채소류 · 과일류 · 육류 및 가공육 · 수산물 · 소스·양념 · 음료·주류
- **유제품 세분화(4)**: 우유·음료 · 치즈류 · 알류 · 버터류
- **곡류 세분화(4)**: 쌀·잡곡 · 콩류 · 견과류 · 가루류
- **조리/가공 세분화(7)**: 조리반찬 · 냉동식품 · 제과·제빵 · 면류 · 떡류 · 통조림 · 가공식품

**`constants/categories.ts`와의 관계 (확정)**: 기존 3개(`['과일','육류','유제품']`)를 위 **21개 순서 배열**로 교체한다. 이 배열은 폐지하지 않고 **카테고리 그리드의 표시 순서를 정하는 정적 단일 출처(SSOT)** 로 남긴다. 동적 `SELECT DISTINCT category`로 매번 도출하지 않는 이유는 ① 카테고리 순서를 의도대로 고정하고(대분류→세분화), ② 등록 첫 화면에서 DB 왕복 없이 즉시 렌더링하기 위함이다.

> **정합성 계약(중요)**: `constants/categories.ts`의 값들은 `ingredient_master.category`의 distinct 값 집합과 **정확히 일치**해야 한다(문자열 표기까지 동일). 둘이 어긋나면 어떤 카테고리는 재료 목록이 비거나(상수엔 있는데 마스터엔 없음), 어떤 재료는 선택 화면에 안 보인다(마스터엔 있는데 상수엔 없음). 마스터 데이터 적재(§13-7)와 상수 배열을 같은 PR/커밋에서 함께 갱신할 것.

### 4-2. v2 신규 테이블 (구현됨)

v2에서 추가한 테이블이다. **`supabase_schema.sql`에 RLS + GRANT 세트로 구현 완료**(§11-1 교훈, 정책은 `DROP POLICY IF EXISTS` 후 생성 — §11-7).

#### recipes (저장한 레시피) — ✅ 구현됨 (§13-4)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| owner_id | uuid (FK → profiles.id) | 레시피 소유자 |
| title | text (NOT NULL) | 레시피 이름 |
| body | text (NOT NULL, default '') | 레시피 상세 설명(조리법 등) |
| source | text | 'manual' \| 'ai' (CHECK). 현재는 모두 'manual' |
| created_at | timestamptz | |

> RLS: 본인(owner_id = auth.uid())만 CRUD. 친구 공유는 v2 범위 밖(추후 검토).
> AI 추천 레시피도 사용자가 "저장"하면 이 테이블에 `source='ai'`로 들어간다(§13-5, 미구현). 저장 전 미리보기는 DB에 넣지 않는다.

#### category_expiry (카테고리×보관방식별 기본 소비기한 — 개인화) — ✅ 구현됨 (§13-6)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| owner_id | uuid (FK → profiles.id) | 설정 주인 |
| category | text | 카테고리명 (constants/categories.ts 값) |
| storage | text | 'fridge' \| 'freezer' \| 'room' (CHECK). 보관방식별로 기한을 따로 둔다 |
| default_days | int (CHECK >= 0) | (카테고리+보관방식) 조합의 기본 소비기한(일) |
| created_at | timestamptz | |
| (owner_id, category, storage) | UNIQUE | 사용자×카테고리×보관방식 1행 |

> **단순 버전과의 차이**: 카테고리당 값 하나가 아니라 **(카테고리 + 보관방식) 조합마다** 값을 둔다. 예) 과일+냉장=7일, 과일+냉동=30일, 과일+실온=3일.
> 동작: 마이페이지 → 기본 소비기한 설정 → 카테고리 선택 → 한 화면에서 냉장/냉동/실온 일수를 각각 저장. 이후 식품 등록 시 **카테고리와 보관방식이 둘 다 정해지면** 해당 조합 값으로 유통기한을 `오늘 + default_days`로 자동 채운다(유통기한이 **빈칸일 때만** 채움, 사용자가 수정 가능 — §13-6).
> RLS: 본인 것만 CRUD.
>
> **v3 역할 재정의 (§13-7, 예정 — 확정)**: 식재료 표준 데이터(`ingredient_master`)가 들어와도 `category_expiry`는 **폐지하지 않는다**. 대신 **개인 조정값으로 마스터 표준값보다 우선 적용**한다(개인값 우선). 즉 사용자가 어떤 (카테고리×보관방식)에 직접 정한 값이 있으면, 그 카테고리의 표준 재료를 골라도 **마스터 일수가 아니라 사용자의 개인 일수**로 유통기한을 채운다. 근거: 개인 설정은 사용자의 명시적 의도(자기 보관 습관)를 반영하므로 일반 표준값을 덮어쓰는 게 자연스럽다. 마스터는 개인 설정이 없는 경우의 합리적 기본값으로 작동한다. 전체 자동 채움 우선순위는 §13-7 참조.

### 4-3. v3 신규 테이블 (예정) — ingredient_master (식재료 표준 데이터, §13-7)

앱이 기본 제공하는 **마스터 데이터**다. 약 **504개** 식재료의 표준 보관 정보를 담는다. **사용자는 수정하지 않는다(읽기 전용).** 데이터 적재는 SQL Editor(또는 service role)로 수행하므로 RLS를 우회한다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| name | text (NOT NULL) | 식재료명 |
| category | text (NOT NULL) | 카테고리(§4-1-a의 21개 중 하나). `constants/categories.ts`와 정합성 일치 |
| room_days | int (NOT NULL, default 0, CHECK ≥ 0) | 실온 보관 권장 일수 |
| fridge_days | int (NOT NULL, default 0, CHECK ≥ 0) | 냉장 보관 권장 일수 |
| freezer_days | int (NOT NULL, default 0, CHECK ≥ 0) | 냉동 보관 권장 일수 |
| storage_tip | text | 맞춤 보관 팁 |
| created_at | timestamptz (default now()) | |
| (name) | UNIQUE | 자연키(재실행 적재 시 충돌 대상). 동일 이름이 카테고리별로 존재하면 `UNIQUE(name, category)`로 전환 |

> **보관 일수 0의 의미**: `*_days = 0`이면 **해당 보관방식은 권장하지 않음**을 뜻한다(보관 0일 ≠ "오늘까지"). 등록 화면에서 그 보관방식 버튼은 비활성/비권장 표시하고, 자동 유통기한 계산에서 제외한다.

제안 스키마(실제 SQL은 §13-7에서 `supabase_schema.sql`에 추가 — RLS + GRANT 세트, §11-1·§11-7):

```sql
CREATE TABLE IF NOT EXISTS public.ingredient_master (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  category     text        NOT NULL,
  room_days    int         NOT NULL DEFAULT 0 CHECK (room_days    >= 0),  -- 실온(일), 0=비권장
  fridge_days  int         NOT NULL DEFAULT 0 CHECK (fridge_days  >= 0),  -- 냉장(일), 0=비권장
  freezer_days int         NOT NULL DEFAULT 0 CHECK (freezer_days >= 0),  -- 냉동(일), 0=비권장
  storage_tip  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);
CREATE INDEX IF NOT EXISTS idx_ingredient_master_category ON public.ingredient_master (category);

ALTER TABLE public.ingredient_master ENABLE ROW LEVEL SECURITY;

-- 읽기 전용 마스터: 인증 사용자는 모두 조회 가능, 쓰기 정책은 두지 않는다
DROP POLICY IF EXISTS "ingredient_master: read all" ON public.ingredient_master;
CREATE POLICY "ingredient_master: read all"
  ON public.ingredient_master FOR SELECT TO authenticated
  USING (true);

-- 조회 권한만 부여(INSERT/UPDATE/DELETE 미부여). 적재는 SQL Editor/service role이 RLS 우회.
GRANT SELECT ON public.ingredient_master TO authenticated;
```

> RLS: 인증 사용자는 **SELECT만** 가능. INSERT/UPDATE/DELETE 정책·GRANT를 두지 않아 앱에서 마스터를 변경할 수 없다. (필요 시 비로그인 노출도 허용하려면 `anon`에도 `GRANT SELECT` 추가 가능 — 기본은 authenticated만.)

---

## 5. 권한 규칙 (Supabase RLS)

행 단위 보안(RLS)을 반드시 켤 것. 핵심 규칙:

- **items**: 주인은 자기 품목을 모두 CRUD. 친구는 `fridge_public=true`인 주인의 품목을 **읽기만** 가능. 수정·삭제 불가.
- **comments**: 친구 관계(accepted)인 경우에만 작성 가능. 작성자는 자기 코멘트 수정·삭제 가능. 품목 주인도 자기 품목의 코멘트를 볼 수 있음.
- **notifications**: 본인(recipient) 것만 조회·읽음 처리 가능.
- **friendships**: 본인이 당사자인 관계만 조회.
- **recipes**: 본인(owner_id = auth.uid())만 CRUD. (v2)
- **category_expiry**: 본인 것만 CRUD. (v2)
- **ingredient_master**: 인증 사용자 **읽기 전용**(SELECT만). 쓰기 정책·GRANT 없음 — 앱에서 마스터 변경 불가. 적재는 SQL Editor/service role. (v3 예정, §13-7)

> 이 규칙들 때문에 친구 화면의 입력 폼은 **읽기 전용 모드**로 열려야 한다 (6-3 참조).

---

## 6. 화면 구조 (Expo Router)

> ### 실제 구조 (v2 구현 완료, 2026-06-01 기준) — ✅ 구현 · ⬜ 미구현.
> v2 개편이 반영된 **현재 실제 화면-파일 대응**이다. (컴포넌트/상수/라이브러리/타입 디렉터리는 `app/`이 아니라 **프로젝트 루트**에 있다.)

```
app/
  _layout.tsx                # ✅ AuthProvider + 세션 감시(AuthRedirect) + Stack
  index.tsx                  # ✅ 세션 검사 → <Redirect> ((main)/login)
  (auth)/
    _layout.tsx              # ✅ 인증 그룹 Stack
    login.tsx                # ✅ 로그인
    signup.tsx               # ✅ 회원가입
  (main)/
    _layout.tsx              # ✅ 하단 탭(Tabs): 냉장고 / 커뮤니티 / 레시피 / 알림 / 마이페이지
                             #    (탭 외 화면은 href:null 숨김 라우트로 등록)
    index.tsx                # ✅ '냉장고' 탭 = 나의 냉장고 목록 (첫 화면). ＋추가 버튼 + 행별 삭제
    register/
      category.tsx           # ✅ 카테고리 선택
      new.tsx                # ✅ ItemForm(create) — 식품 등록. category_expiry 자동 채움 연동
    item/
      [itemId].tsx           # ✅ 재료 정보(읽기 전용). 내 재료=편집 버튼+코멘트 목록 / 친구 재료=코멘트 작성
    fridge/
      [itemId].tsx           # ✅ 품목 편집(edit) 전용 + 삭제 + 코멘트 목록 (재료 정보에서 진입)
    friends/                 # (폴더명 friends 유지, 탭 라벨만 '커뮤니티')
      index.tsx              # ✅ 친구 목록 / 친구 추가
      [friendId].tsx         # ✅ 친구 냉장고(readonly). 재료 클릭 → item/[itemId]
    recipes/
      index.tsx              # ✅ '레시피' 탭 = 저장한 레시피 목록 + ＋추가
      new.tsx                # ✅ 레시피 직접 입력(저장, source='manual')
      [recipeId].tsx         # ✅ 레시피 상세 + 인라인 수정 + 삭제
    notifications.tsx        # ✅ '알림' 탭 = 알림창 (클릭 → fridge/[itemId])
    mypage/
      index.tsx              # ✅ '마이페이지' 탭. 프로필 요약 + 냉장고 공개 토글 + 메뉴 + 로그아웃
      profile.tsx            # ✅ 회원명 수정 / 비밀번호 변경 (회원 탈퇴 ⬜ '준비 중')
      notification-settings.tsx  # ✅ 코멘트 알림(동작) / 소비기한 알림(저장만) 토글
      notice.tsx             # ✅ 공지사항 (정적/하드코딩)
      expiry/
        category.tsx         # ✅ 기본 소비기한 - 카테고리 선택
        [category].tsx       # ✅ 보관방식(냉장/냉동/실온)별 일수 입력·저장

components/                  # (프로젝트 루트)
  ItemForm.tsx               # ✅ create/edit/readonly 3모드 공통 폼 (scrollable, resolveExpiry 옵션)
  ItemDetail.tsx             # ✅ 재료 정보 읽기 전용 표시 컴포넌트 (§13-2)
  CommentList.tsx            # ✅ 코멘트 목록 표시 공통 컴포넌트
  (external-link/haptic-tab/hello-wave/parallax-scroll-view/themed-text/themed-view/ui/*)
                             # ⚠️ Expo 스타터 잔존물 — 앱에서 미사용, 정리 대상 (§10)
constants/
  categories.ts              # ✅ ['과일','육류','유제품'] (단일 출처)
  theme.ts                   # ⚠️ 스타터 잔존(collapsible만 참조) — 거의 미사용, 정리 대상
contexts/
  AuthContext.tsx            # ✅ 세션/로그인/로그아웃 컨텍스트
lib/
  supabase.ts                # ✅ Supabase 클라이언트 (네이티브 SecureStore / 웹 localStorage)
  items.ts                   # ✅ 품목 CRUD + itemToFormValues/extractErrorMessage
  profiles.ts                # ✅ 내 프로필 조회/수정(회원명·공개·알림설정)·비밀번호 변경
  friends.ts                 # ✅ 친구 조회/추가
  comments.ts                # ✅ 코멘트 조회/작성
  notifications.ts           # ✅ 알림 조회/읽음 처리
  recipes.ts                 # ✅ 레시피 CRUD
  expiry.ts                  # ✅ category_expiry CRUD + addDaysToToday (자동 채움)
  format.ts                  # ✅ 날짜 포맷 유틸 (formatDateTime)
types/
  item.ts / friend.ts / comment.ts / notification.ts / recipe.ts / expiry.ts   # ✅ 도메인 타입
supabase_schema.sql          # ✅ 테이블 + 인덱스 + RLS + 정책 + GRANT + 트리거 일괄
```

> **정리 완료**: 예전 메인 그리드(`(main)/index.tsx`는 냉장고 목록으로 교체됨), `settings.tsx`, `chatbot.tsx`, `fridge/index.tsx`, `find-id/find-password.tsx`는 **실제로 존재하지 않는다**(삭제/미생성).
> **정리 대상**: `components/`의 Expo 스타터 컴포넌트 일습과 `constants/theme.ts`는 앱 화면에서 import되지 않는다(§10-2).

### 6-1. 진입 흐름
세션은 `contexts/AuthContext.tsx`가 Supabase `onAuthStateChange`로 관리하고(토큰은 네이티브 SecureStore·웹 localStorage에 저장, 네트워크 지연 대비 5초 타임아웃 안전망 포함 — §11-8), `app/_layout.tsx`의 `AuthRedirect`가 세션 유무에 따라 `(auth)` ↔ `(main)`을 자동 전환한다. `app/index.tsx`는 보조 안전망으로 `<Redirect>` 분기를 한 번 더 수행한다. 로그인하면 `(main)`의 첫 화면인 **나의 냉장고 목록**(`(main)/index.tsx`)으로 진입한다.

### 6-2. 식품 등록 흐름
**현재(구현됨)**: 메인 → 식품 등록 → 카테고리 선택(`constants/categories.ts`의 배열을 렌더링) → `ItemForm`(등록 모드, 이름·유통기한 직접 입력) → 저장 시 `items`에 insert → 나의 냉장고 목록으로 복귀.

**v3 변경(예정, §13-7)**: 카테고리 선택 → **표준 재료 선택**(해당 카테고리의 `ingredient_master` 목록) → **보관방식 선택**(일수가 0인 방식은 비권장/비활성) → **유통기한 자동 표시**(`오늘 + 해당 보관 일수`, 수정 가능) → 저장. 표준 재료를 고르면 `name`·`storage_tip`·유통기한이 자동 채워진다.
- **목록에 없는 재료** → 화면의 **'직접 입력'** 진입점으로 기존처럼 이름·유통기한 수동 등록(이때 자동 유통기한은 `category_expiry`가 있으면 그 값으로 — §13-7 우선순위).
- 새 단계 화면(예: `register/ingredient.tsx`)이 추가된다. 구체 단계는 §13-7.

### 6-3. ItemForm 공통 컴포넌트 (가장 중요)
하나의 폼을 **세 가지 모드**로 재사용한다. props로 `mode`를 받는다.
- `mode="create"`: 빈 폼, 버튼 라벨 "등록", insert 수행
- `mode="edit"`: 기존 데이터 채워서 열림, 버튼 라벨 "수정", update 수행
- `mode="readonly"`: 입력 비활성화, 등록/수정 버튼 숨김 (현재는 주로 별도 `ItemDetail` 컴포넌트가 읽기 표시를 담당)

> 입력 항목: 이름, 카테고리, 보관 방식(냉장/냉동/실온 택1), 보관법 정보, 유통기한, 수량.
> **v2 추가**: `resolveExpiry?` prop — 등록(create) 시 카테고리·보관방식이 둘 다 정해지면 `category_expiry`를 조회해 유통기한이 **빈칸일 때만** `오늘+default_days`로 자동 채운다(§13-6). 편집 화면엔 전달하지 않는다.
> **v3 변경(예정, §13-7)**: 표준 재료를 골라 들어오면 `name`·`storage_tip`이 마스터 값으로 프리필되고, `resolveExpiry`가 **우선순위 체인(개인값 우선)**으로 유통기한을 채운다 — ① `category_expiry`에 (카테고리×보관방식) 개인값이 있으면 그 값, ② 없으면 `ingredient_master`의 (재료×보관방식) 표준 일수, ③ 둘 다 없으면 빈칸. 항상 **빈칸일 때만** 채워 사용자 입력은 덮어쓰지 않는다. '직접 입력' 경로는 ①·③만 적용(마스터 없음).

### 6-4. 친구 → 코멘트 → 알림 고리 (v2 반영)
1. 커뮤니티(친구) 목록에서 이름 클릭 → `friends/[friendId]` → 그 친구의 `items` 로드(읽기 전용)
2. 품목 선택 → **`item/[itemId]`(재료 정보)** 로 이동 → 친구 재료이므로 `ItemDetail` + 코멘트 목록/작성란 표시
3. 코멘트 작성 → `comments` insert → `handle_new_comment` 트리거가 `notifications` insert (recipient = 품목 주인, 단 주인의 `notify_comments=true`일 때만 — §13-3)
4. 주인의 알림창에서 알림 확인 → 클릭 시 `fridge/[itemId]`(편집 화면, 코멘트 목록 포함)로 이동
   - *참고*: 알림은 현재 편집 화면으로 이동한다. 재료 정보(`item/[itemId]`)로 이동하도록 바꾸는 것은 후속 개선 항목.

### 6-5. v2 개편 후 화면 구조 (✅ 구현 완료 — 실제 구조는 §6 상단 트리 참조)

> 아래는 개편 **당시의 설계안**(역사 보존용)이다. **실제 구현된 최종 구조와 화면-파일 대응은 §6 상단의 "실제 구조" 트리를 보라.**
> 확정 사항: 재료 정보 표시는 **별도 `ItemDetail` 컴포넌트**로 결정, `friends/` 디렉터리는 **이름 유지**(탭 라벨만 '커뮤니티'), 네비게이션은 **하단 탭(Tabs)** 채택.

➕ 신규 · 🔧 기존 수정 · ❌ 삭제.

```
app/
  _layout.tsx                # 🔧 유지 (AuthProvider + AuthRedirect)
  index.tsx                  # 🔧 세션 검사 → (main)은 이제 '나의 냉장고 목록'이 첫 화면
  (auth)/                    # 🔧 유지 (login, signup)
  (main)/
    _layout.tsx              # 🔧 하단 탭/네비 재구성: 냉장고 / 커뮤니티 / 레시피 / 알림 / 마이페이지
    index.tsx                # 🔧 ❌기존 '6개 메뉴 그리드' 폐지 → '나의 냉장고 목록'을 기본 화면으로
                             #    (기존 fridge/index.tsx 내용을 여기로 옮기거나, index가 fridge를 가리키게)
    register/
      category.tsx           # 🔧 유지 (카테고리 선택)
      new.tsx                # 🔧 유지 (ItemForm create) — v2: category_expiry 있으면 유통기한 자동 채움
    item/
      [itemId].tsx           # ➕ '재료 정보' 읽기 전용 상세 화면 (신규, 기존 fridge/[itemId]와 별도)
                             #    내 재료: 정보 표시 + '수정' 버튼 → 편집 화면으로
                             #    친구 재료: 정보 표시 + 코멘트 작성/목록
    fridge/
      [itemId].tsx           # 🔧 '편집' 전용으로 역할 축소 (ItemForm edit). 재료 정보에서 진입
    community/               # 🔧 기존 friends/ 의 새 이름 (기능 동일)
      index.tsx              # 🔧 친구 목록 / 친구 추가
      [friendId].tsx         # 🔧 친구 냉장고 보기. 재료 클릭 → item/[itemId] (재료 정보)로 이동(코멘트)
    recipes/
      index.tsx              # ➕ 레시피 메인: 저장한 레시피 목록
      [recipeId].tsx         # ➕ 레시피 상세 정보
      new.tsx                # ➕ 레시피 추가 (AI 추천 — 최종 단계, §13-5)
    notifications.tsx        # 🔧 유지 (알림창)
    mypage/
      index.tsx              # ➕ 마이페이지 진입점 (프로필수정/알림설정/기본소비기한/공지사항)
      profile.tsx            # ➕ 프로필 수정 (비밀번호 변경 / 회원명 수정 / 회원 탈퇴)
      notification-settings.tsx  # ➕ 알림 종류 켜기/끄기
      expiry/
        category.tsx         # ➕ 기본 소비기한 설정 - 카테고리 선택
        [category].tsx       # ➕ 소비기한 개인화 설정 창 (category_expiry 저장)
      notice.tsx             # ➕ 공지사항
    settings.tsx             # ❌ 삭제 (냉장고 공개 토글은 마이페이지로 흡수)
    chatbot.tsx              # ❌ 삭제 (AI는 레시피 추천으로 대체)

components/
  ItemForm.tsx               # 🔧 유지 (create/edit/readonly). readonly는 재료정보 화면에서 활용 가능
  ItemDetail.tsx             # ➕ (선택) 재료 정보 표시용 읽기 컴포넌트 — ItemForm readonly로 대체 가능, §13-2에서 결정
  CommentList.tsx            # 🔧 유지
constants/
  categories.ts              # 🔧 유지
lib/
  items.ts / friends.ts → community 관련  # 🔧 friends.ts 유지(이름만 community로 정리할지 §13-2 결정)
  comments.ts / notifications.ts          # 🔧 유지
  recipes.ts                 # ➕ 레시피 CRUD + AI 추천 호출
  expiry.ts                  # ➕ category_expiry CRUD + 등록 시 유통기한 자동계산
types/
  recipe.ts / expiry.ts      # ➕ 신규 도메인 타입
```

**핵심 흐름 변화 (v2):**
- 진입: 로그인 → (메인 그리드 없이) **나의 냉장고 목록**이 바로 첫 화면.
- 내 재료 보기: 냉장고 목록 → 재료 클릭 → **재료 정보(읽기)** → '수정' 누르면 → 편집(ItemForm edit) → 저장 → 목록 복귀.
- 등록: (냉장고 목록의 추가 버튼) → 카테고리 선택 → ItemForm create → 저장. *category_expiry가 설정돼 있으면 유통기한 자동 채움.*
- 친구(커뮤니티): 커뮤니티 → 친구 목록/추가 → 친구 클릭 → 친구 냉장고 → 친구 재료 클릭 → **재료 정보(읽기) + 코멘트 작성**.
- 코멘트 → 알림: (기존과 동일) 코멘트 insert → 트리거가 notifications 생성 → 알림창에서 확인 → 해당 재료 정보로 이동.
- 레시피: 레시피 메인(저장 목록) → 상세 정보 / 추가(AI). 추가는 내 냉장고(items) 기반 AI 추천 → 저장 시 recipes에 `source='ai'`.
- 마이페이지: 프로필 수정(비번/회원명/탈퇴) · 알림 설정 · 기본 소비기한 설정(카테고리 → 개인화 창) · 공지사항.

---

## 7. 구현 순서 (권장 마일스톤)

실제 구현 현황은 다음과 같다. **✅ 완료 · 🟡 부분 완료 · ⬜ 미구현**. 주요 파일은 실제 코드 기준.

1. ✅ **프로젝트 셋업** — `package.json`, `app.json`, `lib/supabase.ts`(SecureStore 세션), `app/_layout.tsx`, `.env`(`EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`)
2. ✅ **DB 스키마** — `supabase_schema.sql` (테이블 + 인덱스 + RLS + GRANT + 트리거 일괄)
3. ✅ **인증** — `contexts/AuthContext.tsx`, `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`, `app/index.tsx`, `app/_layout.tsx`(AuthRedirect)
4. ✅ **식품 등록 + 나의 냉장고** — `components/ItemForm.tsx`(create/edit/readonly), `lib/items.ts`, `types/item.ts`, `constants/categories.ts`, `app/(main)/register/category.tsx`, `app/(main)/register/new.tsx`, `app/(main)/index.tsx`(냉장고 목록, v2에서 `fridge/index.tsx`에서 이전), `app/(main)/fridge/[itemId].tsx`(편집)
5. ✅ **친구 기능** — `types/friend.ts`, `lib/friends.ts`, `app/(main)/friends/index.tsx`, `app/(main)/friends/[friendId].tsx`
6. ✅ **코멘트 + 인앱 알림** — `types/comment.ts`, `types/notification.ts`, `lib/comments.ts`, `lib/notifications.ts`, `lib/format.ts`, `components/CommentList.tsx`, `app/(main)/notifications.tsx` (v2: 코멘트 작성은 `item/[itemId].tsx`(친구 재료), 코멘트 목록은 `item/[itemId].tsx`·`fridge/[itemId].tsx`)
7. ✅ **설정(마이페이지로 흡수)** — 로그아웃 ✅(마이페이지로 이동). 냉장고 공개 토글(`fridge_public`) ✅(마이페이지 메인). 별도 `settings.tsx`는 만들지 않고 마이페이지로 통합 (§13-3).
8. **v2 개편 (§13)** — 13-1·13-2·13-3·13-4·13-6 ✅ 완료. 13-5(레시피 AI) ⬜. 상세·파일은 §13.

> 각 마일스톤이 끝나면 실제 동작을 확인하고 다음으로 넘어갈 것. 한 번에 전부 만들지 말 것.
> 마감 점검(잔존 디버그 `console.log` 정리, Expo 스타터 컴포넌트 정리 등)은 §10-2 참조.

---

## 8. 놓치기 쉬운 처리 (체크리스트)

> 실제 코드 기준 현황. 미완료 항목은 §10 '남은 작업' 참조.

- [x] 품목 삭제 경로 — 냉장고 목록(`(main)/index.tsx`) 행별 삭제 + 편집 화면(`fridge/[itemId].tsx`) 삭제. 웹은 `window.confirm`, 네이티브는 `Alert` (§11-8)
- [x] 유통기한 표시 — 임박/만료 색상 구분 (`(main)/index.tsx`, `friends/[friendId].tsx`. 자동 알림은 2차)
- [x] 친구 추가 시 자기 자신/중복 추가 방지 — `lib/friends.ts`의 `addFriend`
- [x] 냉장고 비공개(`fridge_public=false`) 친구 → "공개하지 않음" 안내 — `friends/[friendId].tsx`
- [x] 로그아웃 — **마이페이지**(`mypage/index.tsx`)로 이동 완료
- [x] 냉장고 공개 토글(`fridge_public`) — 마이페이지 메인에 구현
- [x] 빈 상태 UI (품목/친구/알림/레시피 없음) — 각 목록 화면 EmptyState
- [x] 입력 검증 (이름 필수, 수량 0 이상, 유통기한 형식) — `ItemForm`의 `validate()`
- [x] 네트워크 에러 / 로딩 인디케이터 — 각 화면 `ActivityIndicator` + 에러 표시
- [ ] 회원 탈퇴 — 미구현 (서버 함수 필요, §10)
- [ ] 디버그 `console.log` 정리 / Expo 스타터 컴포넌트 정리 — 일부 잔존 (§10-2)

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

v2 개편의 대부분(§13-1·2·3·4·6)은 완료되었다. 남은 항목은 다음과 같다.

> **🆕 신규 대형 변경 — 식재료 표준 데이터(§13-7)**: `ingredient_master` 테이블 도입(~504행, 읽기 전용 마스터), 카테고리 ~21개 재구성, 등록 흐름 변경(카테고리→표준 재료→보관방식→유통기한 자동), `category_expiry` 역할 재정의(개인값 우선). 단계별 상세는 **§13-7**, 테이블/RLS/적재는 **§4-3**.

### 10-1. 레시피 AI 추천 (§13-5) — ⬜ 핵심 남은 기능
- `recipes/new.tsx`에 'AI 추천' 경로 추가: 내 `items`(냉장고 데이터)를 입력으로 외부 AI API 호출 → 미리보기 → 저장 시 `recipes`에 `source='ai'`로 insert.
- API 키는 클라이언트 노출 금지 → Supabase Edge Function 등 서버 경유 권장. 비용·지연·실패 폴백 고려.

### 10-2. 회원 탈퇴 (마이페이지) — ⬜
- `mypage/profile.tsx`에 자리만 있고 "준비 중" 상태.
- Supabase는 클라이언트에서 자기 계정 삭제가 제한적 → **Edge Function/RPC(SECURITY DEFINER)로 `auth.admin.deleteUser`** 호출 필요. 착수 시 서버 함수부터 설계.

### 10-3. 친구 수락 알림 (§12-1) — ⬜
- 현재 친구 추가는 바로 `accepted`. 수락 알림 도입 시 `notifications` 스키마 수정 필요(아래 §12-1 참조).

### 10-4. UX/UI 디자인 적용 (§12-5) — ⬜
- 현재는 기능 위주 기본 스타일. 디자인 시스템/테마, 아이콘, 다크 모드, 전환 등 시각적 완성도 향상.

### 10-5. 마감/정리
- **Expo 스타터 잔존 정리**: `components/`의 `external-link, haptic-tab, hello-wave, parallax-scroll-view, themed-text, themed-view, ui/collapsible, ui/icon-symbol(.ios)` 및 `constants/theme.ts`는 앱에서 미사용 → 삭제 검토.
- **디버그 로그 정리**: `contexts/AuthContext.tsx`, `app/index.tsx`, `app/_layout.tsx` 등의 `console.log` 제거.
- **알림 → 재료 정보 이동(선택)**: 알림 클릭 시 현재 `fridge/[itemId]`(편집)로 이동 → `item/[itemId]`(재료 정보)로 바꿀지 검토 (§6-4).
- **편집 화면 삭제 확인 웹 대응(선택)**: `fridge/[itemId].tsx`의 삭제는 아직 `Alert` 기반이라 웹에서 확인창이 안 뜬다 → `window.confirm` 분기 적용 검토 (§11-8).

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
- `lib/supabase.ts`의 저장소 어댑터로 토큰을 저장하고, `AuthContext`가 `onAuthStateChange`로 세션을 추적한다(네트워크 지연 대비 5초 타임아웃 안전망 포함). 저장소는 플랫폼별로 다르다(§11-8).

### 11-7. RLS 정책 자체가 누락되면 모든 행이 막힌다 (v2)
- **증상**: 마이페이지에서 `Cannot coerce the result to a single JSON object`(SELECT 0행) → 이어서 `new row violates row-level security policy for table "profiles"`(INSERT 거부).
- **원인**: `profiles` 테이블은 **RLS가 켜져 있는데 정책이 하나도 없었다**(대시보드 Policies에 "No policies created yet"). 정책 0개 + RLS ON = 모든 SELECT가 0행, 모든 INSERT/UPDATE 거부. 트리거(`handle_new_user`)는 `SECURITY DEFINER`라 행은 만들어졌지만 **읽지 못한** 것.
- **왜 누락됐나**: 스키마 일괄 실행 시 `CREATE POLICY`가 이미 존재하면 에러가 나며 배치가 중간에 멈출 수 있다.
- **해결/교훈**: 정책은 **`DROP POLICY IF EXISTS` 후 `CREATE POLICY`**로 작성(재실행 안전). 테이블 추가 시 ① RLS ENABLE ② 정책 ③ GRANT 세트(§11-1)에 더해, **적용 후 대시보드 Policies 화면에서 정책이 실제로 생겼는지 눈으로 확인**. 누락 계정은 `auth.users` 기준 백필 SQL로 보강.

### 11-8. 웹(expo web)과 네이티브의 플랫폼 차이 (v2)
- **SecureStore**: `expo-secure-store`는 네이티브 전용이라 웹에서 `getValueWithKeyAsync is not a function` 오류. → `lib/supabase.ts`에서 `Platform.OS === 'web'`이면 storage를 비워 supabase-js 기본값(localStorage)을 쓰게 분기.
- **Alert.alert**: react-native-web에서 `Alert.alert`는 동작하지 않는다(no-op). 삭제 확인이 안 떠 삭제가 진행되지 않음. → 웹은 `window.confirm`/`window.alert`, 네이티브는 `Alert`로 분기(`(main)/index.tsx`의 `confirmDelete`).

### 11-9. 프로필 자동 생성/백필 (v2)
- 회원가입 트리거(`handle_new_user`)가 없거나 트리거 도입 전 가입한 계정은 `profiles` 행이 없다. → `supabase_schema.sql`에 `auth.users`를 LEFT JOIN해 누락분을 채우는 백필 INSERT를 포함(재실행 안전). 트리거도 `DROP TRIGGER IF EXISTS` 후 재생성으로 보장.

### 11-10. 보관방식별 소비기한 — 조합 키 + 조건부 자동 채움 (v2)
- 단순 "카테고리당 1값" 대신 **(카테고리 + 보관방식)** 조합이 키다. `category_expiry`에 `storage` 컬럼 추가, UNIQUE를 `(owner_id, category, storage)`로. `upsert`의 `onConflict`도 세 컬럼.
- 자동 채움은 ItemForm의 `resolveExpiry`가 **카테고리·보관방식이 모두 정해졌을 때** 조회하고, 유통기한이 **빈칸일 때만** 채워 사용자 입력을 덮어쓰지 않는다.

---

## 12. 향후 확장 아이디어

### 12-1. 친구 수락 알림 (스키마 수정 필요)
현재 친구 추가는 바로 `accepted`로 처리된다(요청/수락 플로우 미사용). 수락 알림을 도입하려면 `notifications` 스키마를 손봐야 한다.
- **`type` CHECK 제약 확장**: 현재 `CHECK (type IN ('comment'))` → `'friend_accept'`(또는 `'friend_request'`) 추가.
- **`item_id` / `comment_id` NOT NULL → NULL 허용**: 코멘트와 무관한 알림은 이 두 컬럼이 없으므로 NULL을 허용하도록 변경.
- friendships의 status가 `accepted`로 바뀔 때 requester에게 알림을 생성하는 트리거/로직 추가.

### 12-2. 사용자 정의 카테고리
- 현재 `constants/categories.ts` 코드 상수(단일 출처). 2차에서 별도 `categories` 테이블 도입(§4-1).

### 12-3. 푸시 알림
- Expo Notifications + 디바이스 토큰 저장. `notifications` 행 생성 시 푸시 발송 연동.

### 12-4. AI 챗봇 → 레시피 AI 추천으로 대체 (완료된 방향 전환)
- 기존 'AI 챗봇' 메뉴는 **삭제 완료**(`chatbot.tsx` 미존재). AI는 **레시피 추천**(§13-5, 미구현)으로 방향이 바뀌었다.

### 12-5. UX/UI 디자인 적용 (남은 작업 — §10-4)
- 현재는 기능 위주의 기본 스타일. 디자인 시스템/테마, 다크 모드, 아이콘·일러스트, 전환 애니메이션 등 시각적 완성도 향상.

### 12-6. 표준 재료의 개인 오버라이드 (식재료 표준 데이터 이후)
- §13-7 도입 시 개인화는 **카테고리 단위**(`category_expiry`, 개인값 우선)로만 동작한다. 더 세밀하게 **재료 단위**로 사용자가 보관 일수를 조정하고 싶어지면, 별도 `user_ingredient_expiry`(owner_id × ingredient_id × storage → days) 오버라이드 테이블을 두는 안을 검토. 그 경우 자동 채움 우선순위는 "재료 개인값 > 카테고리 개인값 > 마스터 표준"이 된다. **§13-7 범위 밖**(과도한 복잡도 방지).

---

## 13. v2 개편 계획 및 진행 현황

> 새 플로우차트 기준 개편 작업을 **단계별로** 정리한다(대부분 완료). 각 단계는 끝낼 때마다 실제 동작을 확인하고 git 커밋한 뒤 다음으로 넘어갔다. 신규 작업 착수 전에는 무엇을 바꿀지 먼저 설명하고, 신규 테이블이 생기면 **RLS + 정책(DROP 후 CREATE) + GRANT를 항상 세트로**(§11-1, §11-7) 처리할 것.

### 13-0. 진행 현황 요약
13-1·13-2·13-3·13-4·13-6 **✅ 완료**, 13-5(레시피 AI) **⬜ 미구현**, **13-7(식재료 표준 데이터) ⬜ 미구현 — 신규 대형 변경**. 아래 각 항목에 구현 결과를 적었다. 실제 구조는 §6 상단 트리, 남은 작업은 §10.

### 13-1. 메인 구조 변경 — ✅ 완료
- ✅ 6개 메뉴 그리드 폐지 → `(main)/index.tsx`가 **나의 냉장고 목록**(첫 화면).
- ✅ 하단 탭(Tabs) 재구성: 냉장고 / 커뮤니티 / 레시피 / 알림 / 마이페이지 (`(main)/_layout.tsx`). 탭 외 화면은 `href:null` 숨김 라우트.
- ✅ '설정'·'AI 챗봇' 라우트 제거(파일 미존재).
- ✅ 로그아웃은 마이페이지로 이동(13-3). 진입 흐름(`app/index.tsx`, AuthRedirect)이 냉장고 목록을 가리킴.

### 13-2. 재료 정보 화면 분리 — ✅ 완료
- ✅ 재료 정보(읽기 전용) 화면 신설: `app/(main)/item/[itemId].tsx`. 표시는 **별도 `components/ItemDetail.tsx`** 사용(팀 방침대로 별도 컴포넌트로 결정).
  - 내 재료: `ItemDetail` + **'편집' 버튼**(→ `fridge/[itemId]`) + 코멘트 목록(읽기).
  - 친구 재료: `ItemDetail` + **코멘트 작성/목록**(기존 `friends/[friendId]` 모달 로직 이전, 모달 제거).
- ✅ 냉장고 목록·친구 냉장고에서 재료 클릭 → `item/[itemId]`로 이동.
- ✅ `fridge/[itemId].tsx`는 **편집 전용**으로 축소(+삭제, 코멘트 목록).
- ✅ `friends/` 디렉터리는 **이름 유지**, 탭 라벨만 '커뮤니티'(리네이밍 보류).

### 13-3. 마이페이지 — ✅ 완료 (회원 탈퇴 제외)
- ✅ `mypage/index.tsx`: 프로필 요약(display_name·@username·email) + **냉장고 공개 토글**(`fridge_public`) + 메뉴(프로필수정/알림설정/기본소비기한/공지사항) + **로그아웃**.
- ✅ `mypage/profile.tsx`: 회원명 수정(`profiles.display_name`), 비밀번호 변경(`supabase.auth.updateUser`). ⬜ **회원 탈퇴는 "준비 중"**(서버 함수 필요 — §10-2).
- ✅ `mypage/notification-settings.tsx`: 코멘트 알림(동작) / 소비기한 알림(저장만) 토글. 저장 위치는 **`profiles` 컬럼**(`notify_comments`/`notify_expiry`)으로 결정.
- ✅ `mypage/notice.tsx`: 공지사항(정적/하드코딩).
- ✅ `lib/profiles.ts` 신설(내 프로필 조회/수정/비밀번호).

### 13-4. 레시피 — 저장/조회 — ✅ 완료 (AI 제외)
- ✅ DB: `recipes` 테이블 + RLS + GRANT (`supabase_schema.sql` §8).
- ✅ `lib/recipes.ts`, `types/recipe.ts`.
- ✅ `recipes/index.tsx`(목록+추가), `recipes/[recipeId].tsx`(상세 + **인라인 수정** + 삭제), `recipes/new.tsx`(수동 입력 저장, `source='manual'`).

### 13-5. 레시피 AI 추천 — ⬜ 미구현 (최종·난이도 높음)
- `recipes/new.tsx`에 'AI 추천' 경로 추가: 내 `items`를 입력으로 외부 AI API 호출 → 미리보기 → 저장 시 `recipes`에 `source='ai'`로 insert. (`source` CHECK에 'ai'는 이미 포함)
- **고려사항**: API 키 관리(클라이언트 노출 금지 → Edge Function 등 서버 경유), 비용, 지연, 실패 폴백. → §10-1.

### 13-6. 기본 소비기한 개인화 (보관방식별) — ✅ 완료
- ✅ DB: `category_expiry` 테이블 + RLS + GRANT (`supabase_schema.sql` §9). **카테고리당이 아니라 (카테고리+보관방식) 조합별** — `storage` 컬럼 + UNIQUE `(owner_id, category, storage)`.
- ✅ `lib/expiry.ts`(`fetchCategoryExpiries`/`fetchExpiryDays`/`upsert`/`delete`/`addDaysToToday`), `types/expiry.ts`.
- ✅ `mypage/expiry/category.tsx`(카테고리 선택) → `mypage/expiry/[category].tsx`(냉장/냉동/실온 일수 각각 입력·저장).
- ✅ 등록(`register/new.tsx` + `ItemForm`의 `resolveExpiry`): 카테고리·보관방식이 둘 다 정해지면 조합 값으로 유통기한 자동 채움(**빈칸일 때만**, 수정 가능).

> **v3 영향(§13-7)**: `category_expiry`는 유지되며 역할이 **'개인 조정값(개인값 우선)'**으로 재정의된다. 13-7 이후 `resolveExpiry`는 ① `category_expiry` 개인값 → ② `ingredient_master` 표준값 → ③ 빈칸 순서로 동작한다. 이 화면(마이페이지 → 기본 소비기한 설정)과 테이블은 그대로 둔다.

### 13-7. 식재료 표준 데이터(ingredient master) 도입 — ⬜ 미구현 (신규 대형 변경)

약 504개 식재료의 표준 보관 정보를 DB 마스터 테이블로 제공하고, 식품 등록을 "표준 재료 선택" 중심으로 바꾼다. 테이블/RLS/적재는 §4-3, 카테고리는 §4-1-a, 등록 흐름은 §6-2·§6-3.

**단계별 작업 순서:**

1. **DB — `ingredient_master` 테이블 추가** (`supabase_schema.sql`에 §10으로 추가): 테이블 + 인덱스 + RLS(읽기 전용 SELECT) + GRANT(SELECT만) 세트, 재실행 안전(`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` 후 생성). 쓰기 정책·GRANT는 두지 않는다(§4-3 스키마 그대로).
2. **데이터 적재 (~504행)**: 스키마와 **분리된 시드 파일**(예: `ingredient_master_seed.sql`)로 관리하거나 Supabase Table Editor **CSV 임포트**로 적재.
   - 원본은 스프레드시트/CSV(식재료명·카테고리·실온일·냉장일·냉동일·보관팁)에서 생성.
   - 시드 SQL은 **재실행 안전**하게: `INSERT INTO public.ingredient_master (...) VALUES (...) ON CONFLICT (name) DO UPDATE SET category=EXCLUDED.category, room_days=EXCLUDED.room_days, fridge_days=EXCLUDED.fridge_days, freezer_days=EXCLUDED.freezer_days, storage_tip=EXCLUDED.storage_tip;`
   - 적재는 SQL Editor/service role로 실행(RLS 우회). 보관 일수 **0 = 비권장** 규칙을 데이터 생성 단계에서 일관 적용.
3. **카테고리 21개 반영**: `constants/categories.ts`를 §4-1-a의 21개 **순서 배열**로 교체. 마스터의 distinct `category`와 **정합성 일치** 확인(같은 커밋에서 시드와 함께 갱신).
4. **타입/데이터 계층**: `types/ingredient.ts`(마스터 행 타입), `lib/ingredients.ts`(`fetchIngredientsByCategory`, 필요 시 `fetchIngredientById`). `lib/expiry.ts`의 자동 채움 로직을 **우선순위 체인**(개인값 우선 → 마스터 → 빈칸)으로 확장.
5. **등록 화면 변경**:
   - `register/category.tsx`: 21개 카테고리 렌더(상수 그대로 사용).
   - **표준 재료 선택 화면 신설**(예: `register/ingredient.tsx`): 선택한 카테고리의 `ingredient_master` 목록 표시 + **'직접 입력'** 진입점.
   - `register/new.tsx` + `ItemForm`: 표준 재료 선택 시 `name`·`storage_tip` 프리필, **보관방식 버튼은 일수>0인 것만 활성**(0=비권장 표시), `resolveExpiry`가 우선순위 체인으로 유통기한 자동 채움(빈칸일 때만, 수정 가능). '직접 입력'은 기존 수동 등록 유지.
   - (선택) `items.ingredient_id`(nullable FK)를 도입하기로 하면 insert 시 선택한 마스터 id를 함께 저장, 직접 입력은 NULL(§4 items 표).
6. **검증**: (a) 표준 재료 선택→보관방식→유통기한 자동, (b) 0일 보관방식 비권장, (c) `category_expiry` 개인값이 있으면 마스터보다 우선, (d) '직접 입력' 경로가 기존처럼 동작, (e) 마스터는 앱에서 수정 불가(읽기 전용).

> 신규 테이블이므로 **RLS + 정책(DROP 후 CREATE) + GRANT를 세트로**(§11-1·§11-7) 처리하고, 적용 후 대시보드 Policies에서 정책 생성을 눈으로 확인할 것. 단 마스터는 **읽기 전용**이라 쓰기 정책/GRANT는 의도적으로 두지 않는다.

### 권장 진행 순서 요약 (이력)
1) ✅ 13-1 → 2) ✅ 13-2 → 3) ✅ 13-3 → 4) ✅ 13-4 → 5) ✅ 13-6 → 6) ⬜ 13-5 레시피 AI(남음) · ⬜ 13-7 식재료 표준 데이터(신규 대형 변경, 남음).

> 각 단계 착수 전 Claude Code에 "이 단계에서 무엇을 만들고 무엇을 바꿀지 먼저 설명해줘"라고 요청하고, 신규 테이블이 생기면 **RLS + GRANT를 항상 세트로**(§11-1) 처리할 것.