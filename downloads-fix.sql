-- =========================================================
-- downloads-fix.sql — SQL Editor에 붙여넣고 Run 하세요.
-- 다운로드 규칙의 "name"이 라이선스 이름으로 잘못 해석되던 문제를 고칩니다.
-- =========================================================

-- 1) 잘못된 규칙 지우기
drop policy "결제한 사람만 상품 파일을 받을 수 있음" on storage.objects;

-- 2) 고친 규칙 다시 만들기
-- objects.name 이라고 적어서 "파일의 이름"이라는 걸 분명히 했어요.
-- (licenses 표에도 name 칸이 있어서, 그냥 name이라고 쓰면 라이선스 이름으로 해석됐어요.)
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
        and l.product_id = (storage.foldername(objects.name))[1]
    )
  );
