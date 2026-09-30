/* =========================================================
   my-orders.js — 내 주문 내역 + 다운로드

   주문 목록은 "내 주문만 볼 수 있음" 규칙 덕분에 내 것만 와요.
   다운로드는 "결제한 사람만 파일을 받을 수 있음" 규칙이 서버에서 지켜줘요.
   화면에서 버튼을 숨기는 건 편의일 뿐, 진짜 문지기는 서버 규칙이에요.
   ========================================================= */

function won(n) {
  return n.toLocaleString("ko-KR") + "원";
}

function dateText(iso) {
  return new Date(iso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

const STATUS = {
  paid:     { label: "결제 완료", note: "" },
  pending:  { label: "결제 대기", note: "결제를 끝내지 않은 주문이에요. 요금은 청구되지 않았어요." },
  canceled: { label: "취소됨",   note: "취소된 주문이에요." },
};

/* ---------- 내 주문 불러오기 ---------- */
// 주문 → 라이선스 → 상품까지 이어서 한 번에 가져와요.
async function loadOrders() {
  const { data, error } = await db
    .from("orders")
    .select("id, order_name, amount, status, created_at, paid_at, license_id, licenses(product_id, products(download_path))")
    .order("created_at", { ascending: false });
  if (error) return null;
  return data;
}

/* ---------- 다운로드 ---------- */
// 서버에 "60초 동안만 유효한 임시 다운로드 주소"를 요청해요.
// 결제한 주문이 없으면 서버 규칙이 거절해서 주소가 발급되지 않아요.
async function download(path, button, errorEl) {
  errorEl.textContent = "";
  setLoading(button, true, "준비하는 중…");

  const { data, error } = await db.storage
    .from("downloads")
    .createSignedUrl(path, 60, { download: true });

  setLoading(button, false);

  if (error || !data?.signedUrl) {
    errorEl.textContent = "파일을 받을 수 없어요. 결제가 완료된 주문인지 확인해 주세요.";
    return;
  }
  location.href = data.signedUrl;
}

/* ---------- 주문 한 줄 그리기 ---------- */
function renderOrder(order) {
  const li = document.createElement("li");
  li.className = `order-item is-${order.status}`;

  const top = document.createElement("div");
  top.className = "order-top";
  const name = document.createElement("strong");
  name.textContent = order.order_name;
  const badge = document.createElement("span");
  badge.className = "order-badge";
  badge.textContent = STATUS[order.status]?.label ?? order.status;
  top.append(name, badge);

  const meta = document.createElement("p");
  meta.className = "order-meta";
  meta.textContent = `${won(order.amount)} · 주문 ${dateText(order.created_at)}`;

  li.append(top, meta);

  const note = STATUS[order.status]?.note;
  if (note) {
    const p = document.createElement("p");
    p.className = "order-note";
    p.textContent = note;
    li.append(p);
  }

  const actions = document.createElement("div");
  actions.className = "order-actions";
  const errorEl = document.createElement("p");
  errorEl.className = "error-line";
  errorEl.setAttribute("aria-live", "polite");

  const path = order.licenses?.products?.download_path;
  if (order.status === "paid" && path) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "buy-btn small-btn";
    btn.textContent = "파일 다운로드";
    btn.addEventListener("click", () => download(path, btn, errorEl));
    actions.append(btn);
  } else if (order.status === "pending") {
    const a = document.createElement("a");
    a.className = "text-link";
    a.href = `checkout.html?license=${encodeURIComponent(order.license_id)}`;
    a.textContent = "다시 구매하기";
    actions.append(a);
  }

  li.append(actions, errorEl);
  return li;
}

/* ---------- 상단 메뉴 ---------- */
function renderAccount(user) {
  const box = document.getElementById("account");
  box.innerHTML = `<span class="account-name"></span><a href="welcome.html">방명록</a><button type="button" class="text-btn" id="logout-btn">로그아웃</button>`;
  box.querySelector(".account-name").textContent = `${user.name}님`;
  box.querySelector("#logout-btn").addEventListener("click", async () => {
    await logOut();
    location.href = "index.html";
  });
}

/* ---------- 페이지 시작 ---------- */
async function init() {
  const user = await currentUser();
  if (!user) {
    location.replace(`login.html?next=${encodeURIComponent("my-orders.html")}`);
    return;
  }
  renderAccount(user);

  const status = document.getElementById("status");
  const list = document.getElementById("order-list");
  const orders = await loadOrders();

  if (!orders) {
    status.textContent = "주문 내역을 불러오지 못했어요. 새로고침해 주세요.";
    return;
  }
  if (orders.length === 0) {
    status.innerHTML = `아직 주문이 없어요. <a href="index.html">스토어 둘러보기</a>`;
    return;
  }

  // 결제 완료 주문을 위로
  orders.sort((a, b) => (a.status === "paid" ? 0 : 1) - (b.status === "paid" ? 0 : 1));
  status.hidden = true;
  orders.forEach((o) => list.append(renderOrder(o)));
}

init();
