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

// 토스 승인은 됐는데 주문 기록에 실패한 경우 (요금이 나갔으니 "실패"라고 하면 안 돼요)
function needsCheck(message, id) {
  title.textContent = "결제 확인이 필요해요";
  text.textContent = message;
  document.getElementById("result-order").textContent = id;
  document.getElementById("result-detail").hidden = false;
}

async function confirmPayment() {
  if (!paymentKey || !orderId || !amount) {
    // 결제 완료 후 새로고침하면 주소의 결제 정보가 지워진 상태로 와요.
    // 이 페이지에서는 결제 여부를 알 수 없으니, 내 주문에서 확인하도록 안내해요.
    title.textContent = "결제 상태는 내 주문에서 확인해 주세요";
    text.textContent = "이 페이지에는 결제 정보가 없어요. 방금 결제하셨다면 내 주문에서 결제 완료 여부와 파일을 확인할 수 있어요.";
    const link = document.getElementById("go-orders");
    link.textContent = "내 주문 보기";
    link.hidden = false;
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
      if (detail?.code === "ORDER_UPDATE_FAILED") {
        needsCheck(detail.message, detail.orderId || orderId);
        return;
      }
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
  document.getElementById("go-orders").hidden = false;

  // 주소창의 결제 정보 지우기 (새로고침·공유 시 노출 방지)
  history.replaceState(null, "", "payment-success.html");
}

confirmPayment();
