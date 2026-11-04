-- 기존 가계부에 기본 지출 카테고리 '육아' 를 추가한다.
-- 이미 같은 이름의 지출 카테고리가 있으면(숨긴 것 포함) 건너뛴다.
-- '교육' 바로 다음에 넣고, 이름을 바꿔 '교육' 이 없으면 지출 목록 맨 뒤에 넣는다.
WITH target AS (
  SELECT
    b."id" AS "bookId",
    COALESCE(
      (SELECT MAX(c."sortOrder") FROM "Category" c WHERE c."bookId" = b."id" AND c."type" = 'EXPENSE' AND c."name" = '교육'),
      (SELECT MAX(c."sortOrder") FROM "Category" c WHERE c."bookId" = b."id" AND c."type" = 'EXPENSE'),
      -1
    ) AS "after"
  FROM "Book" b
  WHERE NOT EXISTS (
    SELECT 1 FROM "Category" c WHERE c."bookId" = b."id" AND c."type" = 'EXPENSE' AND c."name" = '육아'
  )
),
shifted AS (
  UPDATE "Category" c
  SET "sortOrder" = c."sortOrder" + 1
  FROM target t
  WHERE c."bookId" = t."bookId" AND c."type" = 'EXPENSE' AND c."sortOrder" > t."after"
)
INSERT INTO "Category" ("id", "bookId", "name", "type", "icon", "color", "sortOrder")
SELECT gen_random_uuid()::text, t."bookId", '육아', 'EXPENSE', 'happy', '#FCC419', t."after" + 1
FROM target t;
