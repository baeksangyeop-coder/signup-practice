-- =========================================================
-- posts.sql — Supabase의 SQL Editor에 통째로 붙여넣고 Run 하세요.
-- 창고에 "글 보관함(posts 표)"을 만들고, 출입 규칙을 정하는 코드예요.
-- =========================================================

-- 1) 글 보관함 만들기 (엑셀 시트의 열을 정하는 것과 비슷해요)
create table public.posts (
  id          bigint generated always as identity primary key, -- 글 번호 (자동으로 1, 2, 3…)
  user_id     uuid not null default auth.uid()                 -- 쓴 사람 (로그인한 사람으로 자동 기록)
              references auth.users (id) on delete cascade,    -- 회원이 삭제되면 그 사람 글도 함께 삭제
  content     text not null
              check (char_length(content) between 1 and 500),  -- 내용 (1~500자)
  created_at  timestamptz not null default now()               -- 작성 시각 (자동)
);

-- 2) 출입 규칙(RLS) 켜기
-- publishable 키는 공개된 키라서, 규칙이 없으면 누구나 창고를 뒤질 수 있어요.
-- 규칙을 켜면 "허락된 일"만 가능해집니다.
alter table public.posts enable row level security;

-- 3) 로그인한 사람에게 이 표를 쓸 수 있는 권한 주기
grant select, insert, delete on public.posts to authenticated;

-- 4) 구체적인 규칙 세 가지
create policy "내 글만 볼 수 있음"
  on public.posts for select to authenticated
  using (auth.uid() = user_id);

create policy "내 이름으로만 쓸 수 있음"
  on public.posts for insert to authenticated
  with check (auth.uid() = user_id);

create policy "내 글만 지울 수 있음"
  on public.posts for delete to authenticated
  using (auth.uid() = user_id);
