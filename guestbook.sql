-- =========================================================
-- guestbook.sql — SQL Editor에 통째로 붙여넣고 Run 하세요.
-- "내 글 보관함"을 "모두가 보는 방명록"으로 바꿉니다.
-- =========================================================

-- 1) 작성자 이름 칸 추가
-- 글을 쓸 때 로그인한 사람의 이름(가입 때 입력한 이름)이 자동으로 들어가요.
alter table public.posts
  add column author_name text
  default (auth.jwt() -> 'user_metadata' ->> 'name');

-- 2) 이미 써둔 글에도 이름 채워 넣기
update public.posts p
set author_name = u.raw_user_meta_data ->> 'name'
from auth.users u
where u.id = p.user_id
  and p.author_name is null;

-- 3) 보기 규칙 교체: "내 글만" → "로그인한 사람은 모든 글"
drop policy "내 글만 볼 수 있음" on public.posts;

create policy "로그인한 사람은 모든 글을 볼 수 있음"
  on public.posts for select to authenticated
  using (true);

-- 쓰기 규칙("내 이름으로만")과 지우기 규칙("내 글만")은 그대로 둡니다.
-- 그래서 남의 글이 보여도, 남의 글을 지울 수는 없어요.
