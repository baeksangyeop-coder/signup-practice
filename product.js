/* =========================================================
   product.js — 서버(Supabase)에서 상품 정보를 불러와 보여주는 상세페이지

   예전에는 이 파일 맨 위에 상품 정보를 직접 적어뒀지만,
   이제는 Supabase 창고에서 불러와요. 가격의 주인이 "화면 코드"에서
   "서버"로 옮겨진 거예요.
   ========================================================= */

const PRODUCT_ID = "fieldwork-ui-kit"; // 어떤 상품 페이지인지

let PRODUCT = null;   // 서버에서 불러온 상품 정보가 담길 자리
let selected = null;  // 지금 선택된 라이선스

/* ---------- 도우미: 29000 → "29,000원" ---------- */
function won(n) {
  return n.toLocaleString("ko-KR") + "원";
}

/* ---------- 서버에서 상품 불러오기 ---------- */
// products 표에서 상품 한 개를 가져오면서, 붙어 있는 licenses도 함께 가져와요.
async function loadProduct() {
  const { data, error } = await db
    .from("products")
    .select("id, name, summary, images, licenses(id, name, price, detail, sort_order)")
    .eq("id", PRODUCT_ID)
    .single();

  if (error || !data) return null;
  data.licenses.sort((a, b) => a.sort_order - b.sort_order); // 정해둔 순서대로
  return data;
}

/* ---------- 이미지 갤러리 ---------- */
function renderGallery() {
  const main = document.getElementById("main-image");
  const thumbs = document.getElementById("thumbs");

  PRODUCT.images.forEach((img, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "thumb";
    btn.setAttribute("aria-label", `미리보기 ${i + 1}번 보기`);
    btn.setAttribute("aria-pressed", i === 0 ? "true" : "false");

    const el = document.createElement("img");
    el.src = img.src;
    el.alt = "";
    btn.append(el);

    btn.addEventListener("click", () => {
      main.src = img.src;
      main.alt = img.alt;
      thumbs.querySelectorAll(".thumb").forEach((t) => t.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
    });
    thumbs.append(btn);
  });

  main.src = PRODUCT.images[0].src;
  main.alt = PRODUCT.images[0].alt;
}

/* ---------- 라이선스 선택지 ---------- */
function renderLicenses() {
  const list = document.getElementById("licenses");

  PRODUCT.licenses.forEach((lic, i) => {
    const label = document.createElement("label");
    label.className = "license";
    label.innerHTML = `
      <input type="radio" name="license" value="${lic.id}" ${i === 0 ? "checked" : ""} />
      <span class="license-body">
        <span class="license-top">
          <span class="license-name"></span>
          <span class="license-price"></span>
        </span>
        <span class="license-detail"></span>
      </span>`;
    label.querySelector(".license-name").textContent = lic.name;
    label.querySelector(".license-price").textContent = won(lic.price);
    label.querySelector(".license-detail").textContent = lic.detail || "";

    label.querySelector("input").addEventListener("change", () => {
      selected = lic;
      updateTotal();
    });
    list.append(label);
  });
}

/* ---------- 선택에 따라 금액 바꾸기 ---------- */
function updateTotal() {
  document.querySelectorAll("[data-total]").forEach((el) => (el.textContent = won(selected.price)));
  document.querySelectorAll("[data-selected-name]").forEach((el) => (el.textContent = selected.name));
}

/* ---------- 구매하기 → 주문서로 이동 ---------- */
// 주소에는 "어떤 라이선스인지(ID)"만 담아요. 가격은 담지 않아요.
function buy() {
  location.href = `checkout.html?license=${encodeURIComponent(selected.id)}`;
}

/* ---------- 상단 로그인 상태 (어제 만든 로그인 기능 재사용) ---------- */
async function renderAccount() {
  const box = document.getElementById("account");
  try {
    const user = await currentUser();
    if (user) {
      box.innerHTML = `<span class="account-name"></span><a href="my-orders.html">내 주문</a><a href="welcome.html">방명록</a><button type="button" class="text-btn" id="logout-btn">로그아웃</button>`;
      box.querySelector(".account-name").textContent = `${user.name}님`;
      box.querySelector("#logout-btn").addEventListener("click", async () => {
        await logOut();
        location.reload();
      });
    } else {
      box.innerHTML = `<a href="login.html">로그인</a><a href="signup.html">회원가입</a>`;
    }
  } catch {
    box.innerHTML = `<a href="login.html">로그인</a><a href="signup.html">회원가입</a>`;
  }
}

/* ---------- 페이지 시작 ---------- */
async function init() {
  renderAccount(); // 로그인 표시는 상품 불러오기와 별개로 진행

  const nameEl = document.getElementById("product-name");
  const summaryEl = document.getElementById("product-summary");
  nameEl.textContent = "불러오는 중…"; // 서버에 다녀오는 동안 보여줄 상태

  PRODUCT = await loadProduct();

  // 실패했을 때: 무슨 일인지, 무엇을 하면 되는지 알려주기
  if (!PRODUCT || PRODUCT.licenses.length === 0) {
    nameEl.textContent = "상품을 불러오지 못했어요";
    summaryEl.textContent = "잠시 후 페이지를 새로고침해 주세요. 계속 안 되면 Supabase 프로젝트가 정지 상태인지 확인해 보세요.";
    document.querySelectorAll("[data-buy]").forEach((b) => (b.disabled = true));
    return;
  }

  selected = PRODUCT.licenses[0]; // 처음엔 첫 번째(개인용)가 선택된 상태
  nameEl.textContent = PRODUCT.name;
  summaryEl.textContent = PRODUCT.summary;
  document.title = PRODUCT.name;

  renderGallery();
  renderLicenses();
  updateTotal();
  document.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", buy));
}

init();
