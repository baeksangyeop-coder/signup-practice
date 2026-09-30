/* =========================================================
   checkout.js — 주문서

   이 페이지가 서버에 보내는 건 딱 두 가지예요.
   "어떤 라이선스를 살지(ID)"와 "구매 조건에 동의했는지".
   가격은 보내지 않아요. 서버가 창고에서 직접 찾아 주문에 적습니다.
   ========================================================= */

// 토스 클라이언트 키 — 브라우저에 공개돼도 되는 키예요. (문서용 테스트 키)
// 시크릿 키는 절대 여기 넣지 않아요. 그건 Supabase 서버 함수의 비밀 설정에만 있어요.
const TOSS_CLIENT_KEY = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

function won(n) {
  return n.toLocaleString("ko-KR") + "원";
}

const licenseId = new URLSearchParams(location.search).get("license");
const statusEl = document.getElementById("status");

/* ---------- 화면에 보여줄 라이선스 정보 불러오기 ---------- */
// 여기서 불러오는 가격은 "보여주기용"이에요. 실제 주문 금액은 서버 함수가 다시 정해요.
async function loadLicense(id) {
  const { data, error } = await db
    .from("licenses")
    .select("id, name, price, products(id, name, images)")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data;
}

/* ---------- 주문 만들기: 서버 함수 호출 ---------- */
async function createOrder(licenseId, agreed) {
  const { data, error } = await db.rpc("create_order", {
    p_license_id: licenseId,
    p_agreed: agreed,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, order: data };
}

/* ---------- 상단 로그인 표시 ---------- */
function renderAccount(user) {
  const box = document.getElementById("account");
  box.innerHTML = `<span class="account-name"></span><a href="welcome.html">방명록</a>`;
  box.querySelector(".account-name").textContent = `${user.name}님`;
}

/* ---------- 페이지 시작 ---------- */
async function init() {
  // 1) 어떤 라이선스인지 없으면 상품 페이지로
  if (!licenseId) {
    location.replace("index.html");
    return;
  }

  // 2) 로그인 확인: 안 했으면 로그인 후 이 주문서로 다시 돌아오게
  const user = await currentUser();
  if (!user) {
    const back = `checkout.html?license=${encodeURIComponent(licenseId)}`;
    location.replace(`login.html?next=${encodeURIComponent(back)}`);
    return;
  }
  renderAccount(user);

  // 3) 라이선스 정보 불러오기
  const lic = await loadLicense(licenseId);
  if (!lic) {
    statusEl.textContent = "선택한 라이선스를 찾지 못했어요. 상품 페이지에서 다시 골라주세요.";
    return;
  }

  // 4) 화면 채우기
  statusEl.hidden = true;
  document.getElementById("checkout").hidden = false;
  document.getElementById("buyer-name").textContent = user.name;
  document.getElementById("buyer-email").textContent = user.email;

  const img = lic.products.images?.[0];
  if (img) {
    document.getElementById("summary-image").src = img.src;
    document.getElementById("summary-image").alt = img.alt;
  }
  document.getElementById("summary-product").textContent = lic.products.name;
  document.getElementById("summary-license").textContent = `${lic.name} 라이선스`;
  document.getElementById("summary-price").textContent = won(lic.price);

  // 5) 주문하기
  const btn = document.getElementById("order-btn");
  const agree = document.getElementById("agree");
  const agreeError = document.getElementById("agree-error");
  const orderError = document.getElementById("order-error");

  agree.addEventListener("change", () => {
    if (agree.checked) agreeError.textContent = "";
  });

  btn.addEventListener("click", async () => {
    orderError.textContent = "";

    // 화면에서 먼저 확인 (서버도 한 번 더 확인해요)
    if (!agree.checked) {
      agreeError.textContent = "구매 조건에 동의해야 주문할 수 있어요.";
      agree.focus();
      return;
    }

    setLoading(btn, true, "주문 만드는 중…");
    const result = await createOrder(licenseId, true);
    setLoading(btn, false);

    if (!result.ok) {
      orderError.textContent = result.message;
      return;
    }

    // 6) 주문이 만들어졌으면 결제 화면으로
    document.getElementById("checkout").hidden = true;
    document.getElementById("back-link").hidden = true;
    showPayment(result.order, user);
  });
}

/* ---------- 토스 결제 화면 띄우기 ---------- */
// 금액은 서버 함수가 돌려준 주문 금액(order.amount)을 그대로 써요.
async function showPayment(order, user) {
  document.getElementById("pay-order-id").textContent = order.order_id;
  document.getElementById("pay-order-name").textContent = order.order_name;
  document.getElementById("pay-amount").textContent = won(order.amount);
  document.getElementById("pay-step").hidden = false;

  const payBtn = document.getElementById("pay-btn");
  const payError = document.getElementById("pay-error");

  try {
    const tossPayments = TossPayments(TOSS_CLIENT_KEY);
    // customerKey: 구매자를 구분하는 값. 추측하기 어려운 회원 번호(UUID)를 써요.
    const widgets = tossPayments.widgets({ customerKey: user.id });

    await widgets.setAmount({ currency: "KRW", value: order.amount });
    await Promise.all([
      widgets.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
      widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
    ]);
    payBtn.disabled = false; // 결제 화면이 다 그려진 뒤에만 누를 수 있게

    payBtn.addEventListener("click", async () => {
      payError.textContent = "";
      try {
        // 결제창을 열고, 끝나면 토스가 성공/실패 페이지로 돌려보내요.
        await widgets.requestPayment({
          orderId: order.order_id,
          orderName: order.order_name,
                   successUrl: new URL("payment-success.html", location.href).href,
          failUrl: new URL("payment-fail.html", location.href).href,
          customerEmail: user.email,
          customerName: user.name,
        });
      } catch (err) {
        // 사용자가 결제창을 닫은 경우 등
        payError.textContent = err?.message || "결제를 진행하지 못했어요. 다시 시도해 주세요.";
      }
    });
  } catch (err) {
    payError.textContent = "결제 화면을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.";
  }
}

init();
