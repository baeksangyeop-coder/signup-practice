-- =========================================================
-- orders.sql — SQL Editor에 통째로 붙여넣고 Run 하세요.
-- 주문 표와, 가격을 서버가 직접 계산해 주문을 만드는 함수를 만듭니다.
-- =========================================================

-- 1) 주문 표
create table public.orders (
  id          uuid primary key default gen_random_uuid(),  -- 주문번호 (추측할 수 없는 긴 번호)
  user_id     uuid not null references auth.users (id) on delete cascade,
  license_id  text not null references public.licenses (id),
  order_name  text not null,                                -- 예: Fieldwork UI Kit 개인용 라이선스
  amount      integer not null check (amount >= 0),         -- 결제할 금액 (서버가 정함)
  status      text not null default 'pending'
              check (status in ('pending', 'paid', 'canceled')), -- 결제 대기 / 완료 / 취소
  agreed_at   timestamptz not null,                         -- 구매 조건에 동의한 시각
  created_at  timestamptz not null default now()
);

-- 2) 출입 규칙: 내 주문만 "볼" 수 있고, 직접 "쓰는" 규칙은 만들지 않아요.
alter table public.orders enable row level security;
grant select on public.orders to authenticated;

create policy "내 주문만 볼 수 있음"
  on public.orders for select to authenticated
  using (auth.uid() = user_id);

-- 쓰기 규칙이 없으니, 누군가 화면 코드를 고쳐
-- "0원짜리 주문"을 직접 넣으려 해도 서버가 거절해요.

-- 3) 주문 만들기 함수 — 주문은 오직 이 창구로만 만들어져요.
-- 화면에서는 "어떤 라이선스를 살지"와 "동의했는지"만 받고,
-- 가격과 주문 이름은 서버가 창고에서 직접 찾아 적습니다.
create or replace function public.create_order(p_license_id text, p_agreed boolean)
returns jsonb
language plpgsql
security definer            -- 쓰기 규칙이 없는 표에 이 함수만은 쓸 수 있게 해줘요
set search_path = ''        -- 보안 설정: 엉뚱한 표를 참조하지 못하게 고정
as $$
declare
  v_user     uuid := auth.uid();  -- 지금 로그인한 사람
  v_price    integer;
  v_name     text;
  v_order_id uuid;
begin
  -- 서버에서 다시 확인 1: 로그인했는가?
  if v_user is null then
    raise exception '로그인이 필요해요.';
  end if;

  -- 서버에서 다시 확인 2: 구매 조건에 동의했는가?
  if p_agreed is not true then
    raise exception '구매 조건에 동의해야 주문할 수 있어요.';
  end if;

  -- 가격은 화면이 아니라 창고에서 직접 찾기
  select l.price, p.name || ' ' || l.name || ' 라이선스'
    into v_price, v_name
  from public.licenses l
  join public.products p on p.id = l.product_id
  where l.id = p_license_id;

  -- 서버에서 다시 확인 3: 실제로 있는 라이선스인가?
  if v_price is null then
    raise exception '존재하지 않는 라이선스예요.';
  end if;

  insert into public.orders (user_id, license_id, order_name, amount, agreed_at)
  values (v_user, p_license_id, v_name, v_price, now())
  returning id into v_order_id;

  return jsonb_build_object(
    'order_id',   v_order_id,
    'order_name', v_name,
    'amount',     v_price
  );
end;
$$;

-- 4) 이 함수는 로그인한 사람만 부를 수 있어요.
revoke execute on function public.create_order(text, boolean) from public, anon;
grant execute on function public.create_order(text, boolean) to authenticated;
