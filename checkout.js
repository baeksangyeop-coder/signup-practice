/* =========================================================
   checkout.js — 주문서

   이 페이지가 서버에 보내는 건 딱 두 가지예요.
   "어떤 라이선스를 살지(ID)"와 "구매 조건에 동의했는지".
   가격은 보내지 않아요. 서버가 창고에서 직접 찾아 주문에 적습니다.
   ========================================================= */

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
    location.replace("product.html");
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

    // 6) 서버가 돌려준 주문 정보 보여주기
    const o = result.order;
    document.getElementById("checkout").hidden = true;
    document.getElementById("back-link").hidden = true;
    document.getElementById("done-id").textContent = o.order_id;
    document.getElementById("done-name").textContent = o.order_name;
    document.getElementById("done-amount").textContent = won(o.amount);
    document.getElementById("order-done").hidden = false;
  });
}

init();
