// =========================================================
// confirm-payment — 결제 승인 서버 함수 (Supabase Edge Function)
//
// 이 코드는 브라우저가 아니라 Supabase 서버에서만 실행돼요.
// 그래서 토스 시크릿 키와 관리자 키를 안전하게 쓸 수 있어요.
//
// 하는 일
// 1. 요청한 사람이 로그인한 회원인지 확인
// 2. 주문이 그 사람 것인지, 아직 결제 대기 상태인지 확인
// 3. 토스가 알려준 금액이 창고의 주문 금액과 같은지 확인 (조작 방지)
// 4. 시크릿 키로 토스에 "이 결제 승인해 주세요" 요청
// 5. 성공하면 주문을 paid로 바꾸기 (실패하면 기록을 남기고 문의 안내)
// =========================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { message: "POST 요청만 받아요." });

  // 관리자 키로 만든 연결 — 서버 안에서만 쓰고, 절대 밖으로 내보내지 않아요.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1) 로그인한 회원인지 확인
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return reply(401, { message: "로그인이 필요해요." });

  // 요청 내용 읽기
  let body: { paymentKey?: unknown; orderId?: unknown; amount?: unknown };
  try {
    body = await req.json();
  } catch {
    return reply(400, { message: "요청 형식이 올바르지 않아요." });
  }
  const { paymentKey, orderId, amount } = body;
  if (typeof paymentKey !== "string" || typeof orderId !== "string" || !UUID.test(orderId)) {
    return reply(400, { message: "결제 정보가 올바르지 않아요." });
  }

  // 2) 창고에서 주문 찾기
  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, order_name, amount, status, payment_key")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.user_id !== user.id) {
    return reply(404, { message: "주문을 찾을 수 없어요." });
  }

  // 이미 승인된 주문이면 (예: 성공 페이지 새로고침) 다시 승인하지 않고 결과만 알려줘요.
  if (order.status === "paid" && order.payment_key === paymentKey) {
    return reply(200, { orderName: order.order_name, amount: order.amount, alreadyPaid: true });
  }
  if (order.status !== "pending") {
    return reply(409, { message: "결제할 수 없는 주문 상태예요." });
  }

  // 3) 금액 대조 — 브라우저에서 금액을 바꿔치기했다면 여기서 막혀요.
  if (Number(amount) !== order.amount) {
    return reply(400, { message: "결제 금액이 주문 금액과 달라요. 결제를 진행하지 않았어요." });
  }

  // 4) 토스에 결제 승인 요청 (시크릿 키 + 콜론을 base64로 인코딩)
  const secretKey = Deno.env.get("TOSS_SECRET_KEY");
  if (!secretKey) return reply(500, { message: "서버에 결제 키가 설정되지 않았어요." });

  const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(secretKey + ":"),
      "Content-Type": "application/json",
      "Idempotency-Key": order.id, // 같은 주문을 두 번 승인하지 않도록
    },
    // 금액은 브라우저가 보낸 값이 아니라 창고의 주문 금액을 써요.
    body: JSON.stringify({ paymentKey, orderId: order.id, amount: order.amount }),
  });
  const payment = await tossRes.json();

  if (!tossRes.ok) {
    // 실제 서비스에서는 여기서 결제 조회 API로 상태를 한 번 더 확인하는 게 안전해요.
    return reply(400, { code: payment.code, message: payment.message ?? "결제 승인에 실패했어요." });
  }

  // 5) 주문을 결제 완료로 바꾸기
  const { data: updated, error: updateError } = await admin
    .from("orders")
    .update({ status: "paid", payment_key: payment.paymentKey, paid_at: new Date().toISOString() })
    .eq("id", order.id)
    .eq("status", "pending")
    .select("id");

  // 바뀐 줄이 없으면: 동시에 들어온 다른 요청이 먼저 paid로 바꿨는지 다시 확인
  let recorded = !updateError && (updated?.length ?? 0) > 0;
  if (!recorded && !updateError) {
    const { data: again } = await admin.from("orders").select("status").eq("id", order.id).maybeSingle();
    recorded = again?.status === "paid";
  }

  // 토스 승인은 됐는데 주문 기록에 실패한 경우: 돈은 나갔으니 "실패"라고 안내하면 안 돼요.
  // 서버 기록(로그)을 남기고, 화면에는 주문번호와 함께 확인이 필요하다고 알려요.
  if (!recorded) {
    console.error("결제 승인 후 주문 반영 실패", {
      orderId: order.id,
      paymentKey: payment.paymentKey,
      error: updateError?.message,
    });
    return reply(500, {
      code: "ORDER_UPDATE_FAILED",
      message: "결제는 승인됐지만 주문 기록에 실패했어요. 아래 주문번호로 문의해 주시면 바로 확인해 드릴게요.",
      orderId: order.id,
    });
  }

  return reply(200, {
    orderName: order.order_name,
    amount: order.amount,
    method: payment.method,
  });
});
