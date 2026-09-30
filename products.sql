-- =========================================================
-- products.sql — SQL Editor에 통째로 붙여넣고 Run 하세요.
-- 상품 정보와 라이선스별 가격을 서버 창고에 보관합니다.
-- =========================================================

-- 1) 상품 표
create table public.products (
  id       text primary key,                 -- 상품 식별 이름 (예: fieldwork-ui-kit)
  name     text not null,
  summary  text not null,
  images   jsonb not null default '[]'       -- 이미지 목록 (경로와 설명)
);

-- 2) 라이선스(옵션) 표: 상품 하나에 여러 개가 달려요
create table public.licenses (
  id          text primary key,
  product_id  text not null references public.products (id) on delete cascade,
  name        text not null,
  price       integer not null check (price >= 0),  -- 가격 (원 단위, 음수 불가)
  detail      text,
  sort_order  integer not null default 0             -- 화면에 보이는 순서
);

-- 3) 출입 규칙 켜기
alter table public.products enable row level security;
alter table public.licenses enable row level security;

-- 4) 읽기만 허용: 로그인 여부와 상관없이 누구나 상품을 볼 수 있어요.
-- 상품 페이지는 방문자 누구에게나 보여야 하니까요.
grant select on public.products to anon, authenticated;
grant select on public.licenses to anon, authenticated;

create policy "누구나 상품을 볼 수 있음"
  on public.products for select to anon, authenticated
  using (true);

create policy "누구나 라이선스를 볼 수 있음"
  on public.licenses for select to anon, authenticated
  using (true);

-- 5) 쓰기 규칙은 일부러 만들지 않았어요.
-- 규칙이 없으면 공개 키로는 가격을 바꾸거나 상품을 추가할 수 없습니다.
-- 가격은 오직 관리자(나)가 대시보드에서만 고칠 수 있어요.

-- 6) 상품 데이터 넣기 (product.js에 적어뒀던 내용 그대로)
insert into public.products (id, name, summary, images) values (
  'fieldwork-ui-kit',
  'Fieldwork UI Kit',
  '회원가입, 로그인, 결제 화면에 필요한 폼 컴포넌트를 모은 Figma 키트예요. 입력칸의 기본·선택·에러 상태와 라이트·다크 모드가 모두 들어 있어요.',
  '[
    {"src": "images/preview-1.svg", "alt": "입력칸의 기본, 선택, 에러 상태가 들어간 가입 폼 예시"},
    {"src": "images/preview-2.svg", "alt": "버튼, 토글, 칩, 라디오 카드 컴포넌트 모음"},
    {"src": "images/preview-3.svg", "alt": "다크 모드로 구성한 결제 선택 화면 예시"}
  ]'::jsonb
);

insert into public.licenses (id, product_id, name, price, detail, sort_order) values
  ('fieldwork-personal',   'fieldwork-ui-kit', '개인용', 29000,  '개인 프로젝트와 포트폴리오에 쓸 수 있어요.', 1),
  ('fieldwork-commercial', 'fieldwork-ui-kit', '상업용', 59000,  '클라이언트 작업이나 판매하는 서비스 1개에 쓸 수 있어요.', 2),
  ('fieldwork-team',       'fieldwork-ui-kit', '팀용',   149000, '최대 5명이 함께 쓰고, 상업 프로젝트 수에 제한이 없어요.', 3);
