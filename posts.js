/* =========================================================
   posts.js — 글 쓰기 / 불러오기 / 지우기 API
   auth.js에서 만든 "전화기(db)"를 그대로 이어서 씁니다.
   그래서 welcome.html에서 auth.js 다음에 불러와야 해요.
   ========================================================= */

/* ---------- 글 저장하기 ---------- */
// 누가 썼는지(user_id)와 작성 시각은 서버가 자동으로 채워줘요.
async function createPost(content) {
  const { error } = await db.from("posts").insert({ content });
  if (error) return { ok: false, message: "저장하지 못했어요: " + error.message };
  return { ok: true };
}

/* ---------- 내 글 목록 불러오기 ---------- */
// "내 글만" 조건을 코드에 안 적었는데도 내 글만 와요.
// 창고의 출입 규칙(RLS)이 서버에서 걸러주기 때문이에요.
async function listMyPosts() {
  const { data, error } = await db
    .from("posts")
    .select("id, content, created_at")
    .order("created_at", { ascending: false }); // 최신 글이 위로
  if (error) return { ok: false, message: "불러오지 못했어요: " + error.message, posts: [] };
  return { ok: true, posts: data };
}

/* ---------- 글 지우기 ---------- */
async function deletePost(id) {
  const { error } = await db.from("posts").delete().eq("id", id);
  if (error) return { ok: false, message: "지우지 못했어요: " + error.message };
  return { ok: true };
}
