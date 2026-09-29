/* =========================================================
   posts.js — 방명록 버전
   글 쓰기 / 전체 글 불러오기 / 내 글 지우기
   auth.js에서 만든 "전화기(db)"를 그대로 이어서 씁니다.
   ========================================================= */

/* ---------- 글 저장하기 ---------- */
// 쓴 사람(user_id), 작성자 이름(author_name), 작성 시각은 서버가 자동으로 채워요.
async function createPost(content) {
  const { error } = await db.from("posts").insert({ content });
  if (error) return { ok: false, message: "저장하지 못했어요: " + error.message };
  return { ok: true };
}

/* ---------- 방명록 전체 불러오기 ---------- */
// 코드는 예전과 거의 같은데, 창고의 보기 규칙이 바뀌어서 이제 모두의 글이 와요.
async function listPosts() {
  const { data, error } = await db
    .from("posts")
    .select("id, user_id, author_name, content, created_at")
    .order("created_at", { ascending: false }) // 최신 글이 위로
    .limit(100);                               // 너무 많아지지 않게 최근 100개만
  if (error) return { ok: false, message: "불러오지 못했어요: " + error.message, posts: [] };
  return { ok: true, posts: data };
}

/* ---------- 글 지우기 ---------- */
// 화면에서 남의 글 삭제 버튼을 숨기긴 하지만, 진짜 보안은 서버 규칙이 지켜요.
// 누가 코드를 고쳐 남의 글 삭제를 시도해도 서버가 거절합니다.
async function deletePost(id) {
  const { error } = await db.from("posts").delete().eq("id", id);
  if (error) return { ok: false, message: "지우지 못했어요: " + error.message };
  return { ok: true };
}
