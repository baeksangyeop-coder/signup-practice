-- =========================================================
-- payments.sql — SQL Editor에 붙여넣고 Run 하세요.
-- 주문 표에 "결제 기록" 칸 두 개를 추가합니다.
-- =========================================================

alter table public.orders
  add column payment_key text unique,  -- 토스가 발급한 결제 번호 (조회·취소할 때 필요)
  add column paid_at timestamptz;      -- 결제가 확정된 시각

-- 이 칸들을 채우고 status를 'paid'로 바꾸는 건
-- 오직 서버 함수(confirm-payment)만 할 수 있어요.
-- 화면(공개 키)에는 여전히 쓰기 권한이 없습니다.
