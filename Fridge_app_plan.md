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

```
app/
  index.tsx                  # 앱 실행 → 세션 검사 → 분기
  (auth)/
    login.tsx                # 로그인
    signup.tsx               # 회원가입
    find-id.tsx              # 아이디 찾기
    find-password.tsx        # 비밀번호 찾기
  (main)/
    _layout.tsx              # 하단 탭 또는 메인 메뉴
    index.tsx                # 메인 화면 (6개 메뉴 진입점)
    register/
      category.tsx           # 카테고리 선택
    fridge/
      index.tsx              # 나의 냉장고 품목 목록
      [itemId].tsx           # 개별 품목 정보 (코멘트 표시)
    friends/
      index.tsx              # 친구 목록 / 친구 추가
      [friendId].tsx         # 친구의 냉장고 보기 (읽기 전용)
    notifications.tsx        # 알림창
    settings.tsx             # 설정 (냉장고 공개 여부 등)
    chatbot.tsx              # AI 챗봇 (2차 — "준비 중" placeholder)
  components/
    ItemForm.tsx             # 식재료 데이터 입력 공통 컴포넌트 (핵심)
  constants/
    categories.ts            # 카테고리 상수 배열 (단일 출처, 5-1 참조)
```

### 6-1. 진입 흐름
`index.tsx`에서 SecureStore의 세션을 확인한다. 유효하면 `(main)`으로, 아니면 `(auth)/login`으로 보낸다.

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

1. **프로젝트 셋업**: Expo + TypeScript + Expo Router + Supabase 클라이언트 연결, `.env` 구성
2. **DB 스키마**: 위 테이블 생성 + RLS 정책 적용 (SQL 파일로 관리)
3. **인증**: 회원가입/로그인/세션 유지 → 진입 분기 동작
4. **식품 등록 + 나의 냉장고**: ItemForm(create/edit), 목록, 개별 조회, 삭제
5. **친구 기능**: 친구 추가/목록, 친구 냉장고 읽기 전용 보기
6. **코멘트 + 인앱 알림**: 코멘트 작성, notifications 생성 트리거, 알림창, 알림 클릭 이동
7. **설정**: 냉장고 공개 여부 토글, 로그아웃
8. **마감**: 빈 상태 처리, 로딩/에러 처리, 챗봇 placeholder

> 각 마일스톤이 끝나면 실제 동작을 확인하고 다음으로 넘어갈 것. 한 번에 전부 만들지 말 것.

---

## 8. 놓치기 쉬운 처리 (체크리스트)

- [ ] 품목 삭제 경로 (다 먹은/버린 식재료) — 목록에서 스와이프 또는 상세에서 삭제
- [ ] 유통기한 표시 — 임박/만료 품목 색상 구분 (자동 알림은 2차)
- [ ] 친구 추가 시 자기 자신/중복 추가 방지
- [ ] 냉장고 비공개(fridge_public=false)인 친구 → "공개하지 않음" 안내
- [ ] 로그아웃 위치 (설정 화면)
- [ ] 빈 상태 UI (품목 없음, 친구 없음, 알림 없음)
- [ ] 입력 검증 (이름 필수, 수량 0 이상, 유통기한 형식)
- [ ] 네트워크 에러 / 로딩 인디케이터

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