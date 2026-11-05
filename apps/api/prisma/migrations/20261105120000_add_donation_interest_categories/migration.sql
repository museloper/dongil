-- 기존 가계부에 기본 카테고리 '기부'(지출), '이자'(수입) 를 추가한다.
-- 이미 같은 종류·이름의 카테고리가 있으면(숨긴 것 포함) 건너뛴다.
-- 기준 카테고리 바로 다음에 넣고, 이름을 바꿔 기준이 없으면 그 종류의 맨 뒤에 넣는다.
WITH target AS (
  SELECT
    b."id" AS "bookId",
    COALESCE(
      (SELECT MAX(c."sortOrder") FROM "Category" c WHERE c."bookId" = b."id" AND c."type" = 'EXPENSE' AND c."name" = '모임통장'),
      (SELECT MAX(c."sortOrder") FROM "Category" c WHERE c."bookId" = b."id" AND c."type" = 'EXPENSE'),
      -1
    ) AS "after"
  FROM "Book" b
  WHERE NOT EXISTS (
    SELECT 1 FROM "Category" c WHERE c."bookId" = b."id" AND c."type" = 'EXPENSE' AND c."name" = '기부'
  )
),
shifted AS (
  UPDATE "Category" c
  SET "sortOrder" = c."sortOrder" + 1
  FROM target t
  WHERE c."bookId" = t."bookId" AND c."type" = 'EXPENSE' AND c."sortOrder" > t."after"
)
INSERT INTO "Category" ("id", "bookId", "name", "type", "icon", "color", "sortOrder")
SELECT gen_random_uuid()::text, t."bookId", '기부', 'EXPENSE', 'ribbon', '#FF8787', t."after" + 1
FROM target t;

WITH target AS (
  SELECT
    b."id" AS "bookId",
    COALESCE(
      (SELECT MAX(c."sortOrder") FROM "Category" c WHERE c."bookId" = b."id" AND c."type" = 'INCOME' AND c."name" = '부수입'),
      (SELECT MAX(c."sortOrder") FROM "Category" c WHERE c."bookId" = b."id" AND c."type" = 'INCOME'),
      -1
    ) AS "after"
  FROM "Book" b
  WHERE NOT EXISTS (
    SELECT 1 FROM "Category" c WHERE c."bookId" = b."id" AND c."type" = 'INCOME' AND c."name" = '이자'
  )
),
shifted AS (
  UPDATE "Category" c
  SET "sortOrder" = c."sortOrder" + 1
  FROM target t
  WHERE c."bookId" = t."bookId" AND c."type" = 'INCOME' AND c."sortOrder" > t."after"
)
INSERT INTO "Category" ("id", "bookId", "name", "type", "icon", "color", "sortOrder")
SELECT gen_random_uuid()::text, t."bookId", '이자', 'INCOME', 'cash', '#51CF66', t."after" + 1
FROM target t;
