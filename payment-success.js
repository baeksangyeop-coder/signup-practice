/* =========================================================
   payment-success.js — 결제 성공 페이지

   토스가 이 페이지로 돌려보내면서 주소에 paymentKey, orderId, amount를 붙여줘요.
   하지만 "이 페이지에 왔다 = 결제 완료"가 아니에요!
   아직 승인 전이라, 서버 함수에 승인을 부탁해야 결제가 확정됩니다.
   ========================================================= */

function won(n) {
  return Number(n).toLocaleString("ko-KR") + "원";
}

const params = new URLSearchParams(location.search);
const paymentKey = params.get("paymentKey");
const orderId = params.get("orderId");
const amount = params.get("amount");

const title = document.getElementById("result-title");
const text = document.getElementById("result-text");

function fail(message) {
  title.textContent = "결제를 완료하지 못했어요";
  text.textContent = message + " 결제가 승인되지 않았으니 요금은 청구되지 않아요.";
}

async function confirmPayment() {
  if (!paymentKey || !orderId || !amount) {
    fail("결제 정보가 없어요.");
    return;
  }

  // 서버 함수에 승인 요청 (로그인 정보가 자동으로 함께 전달돼요)
  const { data, error } = await db.functions.invoke("confirm-payment", {
    body: { paymentKey, orderId, amount: Number(amount) },
  });

  if (error) {
    // 서버가 보낸 이유를 꺼내서 보여주기
    let message = "서버에서 결제를 승인하지 못했어요.";
    try {
      const detail = await error.context.json();
      if (detail?.message) message = detail.message;
    } catch {}
    fail(message);
    return;
  }

  title.textContent = "결제가 완료됐어요";
  text.textContent = "서버가 금액을 확인하고 토스페이먼츠에 승인까지 받았어요.";
  document.getElementById("result-name").textContent = data.orderName;
  document.getElementById("result-amount").textContent = won(data.amount);
  document.getElementById("result-order").textContent = orderId;
  document.getElementById("result-detail").hidden = false;

  // 주소창의 결제 정보 지우기 (새로고침·공유 시 노출 방지)
  history.replaceState(null, "", "payment-success.html");
}

confirmPayment();
