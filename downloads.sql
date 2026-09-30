-- =========================================================
-- downloads.sql — SQL Editor에 붙여넣고 Run 하세요.
-- 상품 파일을 넣을 "비공개 파일 창고"와, 결제한 사람만 꺼낼 수 있는 규칙을 만듭니다.
-- =========================================================

-- 1) 비공개 파일 창고(bucket) 만들기
-- public = false: 주소를 알아도 아무나 열 수 없어요.
insert into storage.buckets (id, name, public)
values ('downloads', 'downloads', false);

-- 2) 상품마다 "어떤 파일을 줄지" 경로 적어두기
alter table public.products add column download_path text;

update public.products
set download_path = 'fieldwork-ui-kit/Fieldwork-UI-Kit.zip'
where id = 'fieldwork-ui-kit';

-- 3) 파일 꺼내기 규칙
-- 파일은 "상품ID/파일이름" 폴더 구조로 넣어요. (예: fieldwork-ui-kit/Fieldwork-UI-Kit.zip)
-- 요청한 사람에게 그 상품의 "결제 완료(paid)" 주문이 있을 때만 꺼낼 수 있어요.
create policy "결제한 사람만 상품 파일을 받을 수 있음"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'downloads'
    and exists (
      select 1
      from public.orders o
      join public.licenses l on l.id = o.license_id
      where o.user_id = auth.uid()
        and o.status = 'paid'
        and l.product_id = (storage.foldername(name))[1]
    )
  );

-- 올리기·수정·삭제 규칙은 만들지 않았어요.
-- 파일은 관리자(나)만 대시보드에서 올릴 수 있습니다.
