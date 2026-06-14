// 냉장고 재료를 받아 Gemini API로 레시피 1개를 추천하는 Supabase Edge Function
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const TIMEOUT_MS = 30_000;

interface FridgeItem {
  name: string;
  category: string;
  expire_date: string | null;
}

// CORS 헤더를 포함한 JSON 응답 헬퍼
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // 1. CORS preflight 처리
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // 2. JWT 검증
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "인증 토큰이 없습니다." }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "유효하지 않은 토큰입니다." }, 401);
    }

    // 3 & 4. Request body 파싱 및 검증
    let payload: { items?: FridgeItem[] };
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "잘못된 요청 형식입니다." }, 400);
    }

    const items = payload.items;
    if (!Array.isArray(items) || items.length === 0) {
      return jsonResponse({ error: "재료 목록이 비어있습니다." }, 400);
    }

    // 5. Gemini API 호출
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
      return jsonResponse({ error: "서버 설정 오류입니다." }, 500);
    }

    // 오늘 날짜 (임박 재료 판단 기준)
    const today = new Date().toISOString().slice(0, 10);

    const ingredientList = items
      .map((item) => {
        const expire = item.expire_date
          ? `유통기한 ${item.expire_date}`
          : "유통기한 정보 없음";
        return `- ${item.name} (${item.category}, ${expire})`;
      })
      .join("\n");

    const prompt = `당신은 요리 전문가입니다. 오늘 날짜는 ${today}입니다.
아래는 사용자의 냉장고에 있는 재료 목록입니다.

${ingredientList}

위 재료들을 최대한 활용하는 레시피 1개를 추천해주세요.
유통기한(expire_date)이 임박한 재료를 우선적으로 활용하도록 레시피를 구성하세요.

규칙:
1. used_ingredients = 위 냉장고 재료 목록 중 이 레시피에서 실제로 사용한 것만 넣으세요.
2. needed_ingredients = 레시피에 필요하지만 냉장고에 없는 재료만 넣으세요.
   - 위 냉장고 재료 목록에 이미 있는 재료는 needed_ingredients에 절대 넣지 마세요.
   - 각 항목은 name과 amount(분량)를 가집니다. amount는 한국 요리 단위(g, ml, 개, 큰술, 작은술 등)로 표기하세요.
3. cook_time_minutes = 예상 조리 시간을 분 단위 정수로.
4. difficulty = 난이도를 1~5 정수로 (1=매우 쉬움, 5=매우 어려움).
5. body = 재료와 조리 순서를 단계별로 한국어로 설명하세요.

반드시 아래 JSON 형식으로만 응답하세요.

{
  "title": "레시피 이름",
  "body": "재료와 조리 순서를 단계별로 설명",
  "cook_time_minutes": 30,
  "difficulty": 3,
  "used_ingredients": ["사용한 냉장고 재료1", "사용한 냉장고 재료2"],
  "needed_ingredients": [{ "name": "추가 재료 이름", "amount": "분량" }]
}`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    // 7. 30초 타임아웃
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let geminiRes: Response;
    try {
      geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (err) {
      // 8. API 키는 로그에 남기지 않음 (err에 키가 포함되지 않도록 메시지만 기록)
      const reason =
        err instanceof Error && err.name === "AbortError"
          ? "Gemini API 호출 타임아웃"
          : "Gemini API 호출 실패";
      console.error(reason);
      return jsonResponse({ error: reason }, 500);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!geminiRes.ok) {
      console.error(`Gemini API 응답 오류: ${geminiRes.status}`);
      return jsonResponse({ error: "레시피 추천에 실패했습니다." }, 500);
    }

    // 6. 응답 파싱
    const geminiData = await geminiRes.json();
    const text: string | undefined =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("Gemini 응답에 텍스트가 없습니다.");
      return jsonResponse({ error: "레시피 추천에 실패했습니다." }, 500);
    }

    let recipe: {
      title?: string;
      body?: string;
      cook_time_minutes?: unknown;
      difficulty?: unknown;
      used_ingredients?: unknown;
      needed_ingredients?: unknown;
    };
    try {
      recipe = JSON.parse(text);
    } catch {
      console.error("Gemini 응답 JSON 파싱 실패");
      return jsonResponse({ error: "레시피 형식을 해석할 수 없습니다." }, 500);
    }

    if (!recipe.title || !recipe.body) {
      console.error("Gemini 응답에 필수 필드가 없습니다.");
      return jsonResponse({ error: "레시피 형식이 올바르지 않습니다." }, 500);
    }

    // 방어 처리: 숫자 정규화
    // difficulty: number 타입의 유한수일 때만 사용(기본 3), 1~5로 클램프 후 정수화
    const difficulty =
      typeof recipe.difficulty === "number" && Number.isFinite(recipe.difficulty)
        ? Math.min(5, Math.max(1, Math.round(recipe.difficulty)))
        : 3;

    // cook_time_minutes: 숫자 아니면 0
    const rawCookTime = Number(recipe.cook_time_minutes);
    const cookTimeMinutes = Number.isFinite(rawCookTime)
      ? Math.max(0, Math.round(rawCookTime))
      : 0;

    // used_ingredients: 배열 아니면 빈 배열
    const usedIngredients = Array.isArray(recipe.used_ingredients)
      ? recipe.used_ingredients.filter((v): v is string => typeof v === "string")
      : [];

    // needed_ingredients: 배열 아니면 빈 배열, 각 원소를 {name, amount}로 정규화
    const normalizeName = (s: string) => s.replace(/\s+/g, "").toLowerCase();
    const fridgeNames = new Set(items.map((it) => normalizeName(it.name)));

    const neededIngredients = (
      Array.isArray(recipe.needed_ingredients) ? recipe.needed_ingredients : []
    )
      .map((entry) => {
        const obj = (entry ?? {}) as { name?: unknown; amount?: unknown };
        return {
          name: typeof obj.name === "string" ? obj.name : "",
          amount: typeof obj.amount === "string" ? obj.amount : "",
        };
      })
      .filter((ing) => ing.name !== "")
      // 요구사항 #3 보장: 입력 냉장고 재료와 이름이 일치하면 서버에서 한 번 더 제거
      .filter((ing) => !fridgeNames.has(normalizeName(ing.name)));

    return jsonResponse({
      title: recipe.title,
      body: recipe.body,
      cook_time_minutes: cookTimeMinutes,
      difficulty,
      used_ingredients: usedIngredients,
      needed_ingredients: neededIngredients,
    });
  } catch (err) {
    console.error("처리 중 예외 발생:", err instanceof Error ? err.message : err);
    return jsonResponse({ error: "서버 오류가 발생했습니다." }, 500);
  }
});
