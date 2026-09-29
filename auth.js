/* =========================================================
   auth.js — Supabase 버전 (진짜 주방과 창고에 연결!)

   연습용 버전과 함수 이름(signUp, logIn, currentUser, logOut)이 똑같아요.
   화면 파일은 거의 그대로 두고, "주방 안쪽"만 진짜로 바꾼 거예요.
   ========================================================= */

// ▼▼▼ 여기 두 줄만 내 프로젝트 값으로 바꾸세요 ▼▼▼
const SUPABASE_URL = "https://yzojuvnidtmrodutizqw.supabase.co";
const SUPABASE_KEY = "sb_publishable_b3u0Hg0mGWssa1GG28g-0w_m88WKn9Z"; // publishable(또는 anon) 키만!
// ▲▲▲ secret / service_role 키는 절대 여기에 넣으면 안 돼요 ▲▲▲

// 주방과 연결되는 "전화기" 만들기
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------- 회원가입 API ---------- */
// 중복 확인, 비밀번호 암호화, 저장은 이제 Supabase 서버가 알아서 해요.
async function signUp(name, email, password) {
  const { error } = await db.auth.signUp({
    email,
    password,
    options: { data: { name } }, // 이름 같은 추가 정보는 여기에 함께 보내요
  });

  if (error) {
    const message = error.message.includes("already registered")
      ? "이미 가입된 이메일이에요. 로그인해 주세요."
      : "가입하지 못했어요: " + error.message;
    return { ok: false, field: "email", message };
  }
  return { ok: true };
}

/* ---------- 로그인 API ---------- */
async function logIn(email, password) {
  const { error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    const message = error.message.includes("Email not confirmed")
      ? "이메일 인증이 아직 안 됐어요. (실습 중이라면 Confirm email 설정을 꺼주세요)"
      : "이메일 또는 비밀번호가 맞지 않아요.";
    return { ok: false, message };
  }
  // 로그인 성공 시 입장 팔찌(세션 토큰)는 Supabase가 자동으로 보관해요.
  return { ok: true };
}

/* ---------- 지금 로그인한 사람 확인 ---------- */
// 서버에 물어봐야 하니 이제 기다림(async)이 필요해요.
async function currentUser() {
  const { data } = await db.auth.getUser();
  const user = data.user;
  if (!user) return null;
  return {
    id: user.id,
    name: user.user_metadata?.name || "회원",
    email: user.email,
    createdAt: user.created_at,
  };
}

/* ---------- 로그아웃 ---------- */
async function logOut() {
  await db.auth.signOut();
}

/* ---------- 화면용 도우미 (연습용 버전과 동일) ---------- */
function setFieldError(input, message) {
  const errorEl = document.getElementById(input.id + "-error");
  errorEl.textContent = message || "";
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function setLoading(button, isLoading, loadingText) {
  if (!button.dataset.label) button.dataset.label = button.textContent;
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : button.dataset.label;
}
