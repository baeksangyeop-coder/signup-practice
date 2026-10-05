-- =========================================================
-- grants-fix.sql — 2026-10-05에 이미 적용했어요. (기록용)
-- 표 권한을 실제로 필요한 만큼만 남깁니다.
-- RLS 정책이 1차로 막고, 이 권한 설정이 2차로 막는 이중 잠금이에요.
-- =========================================================

-- 1) 상품, 라이선스, 주문: 공개 키로는 읽기만
-- Supabase는 기본으로 모든 권한을 열어 두고 RLS로만 막아요.
-- 정책을 실수로 하나 추가해도 뚫리지 않도록 쓰기 권한 자체를 걷어 냅니다.
-- (주문 만들기는 create_order 함수, 결제 완료 처리는 서버 함수가 관리자 권한으로 해요)
revoke insert, update, delete, truncate, references, trigger
  on public.products, public.licenses, public.orders
  from anon, authenticated;
revoke select on public.orders from anon;

-- 2) 방명록: 글 내용(content)만 직접 쓸 수 있게
-- 작성자(user_id), 이름(author_name), 시각은 서버 기본값으로만 채워져요.
-- 그래서 이름을 '관리자'처럼 바꿔서 글을 쓸 수 없어요.
revoke insert, update, truncate, references, trigger on public.posts from anon, authenticated;
revoke select, delete on public.posts from anon;
grant insert (content) on public.posts to authenticated;
