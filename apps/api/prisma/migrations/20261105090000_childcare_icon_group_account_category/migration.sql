-- 육아 아이콘을 기어가는 아기로 바꾼다. 사용자가 다른 아이콘으로 바꿨으면 그대로 둔다.
UPDATE "Category"
SET "icon" = 'baby-crawl'
WHERE "type" = 'EXPENSE' AND "name" = '육아' AND "icon" = 'happy';

-- 기존 가계부에 기본 지출 카테고리 '모임통장' 을 추가한다.
-- 이미 같은 이름의 지출 카테고리가 있으면(숨긴 것 포함) 건너뛴다.
-- '경조사' 바로 다음에 넣고, 이름을 바꿔 '경조사' 가 없으면 지출 목록 맨 뒤에 넣는다.
WITH target AS (
  SELECT
    b."id" AS "bookId",
    COALESCE(
      (SELECT MAX(c."sortOrder") FROM "Category" c WHERE c."bookId" = b."id" AND c."type" = 'EXPENSE' AND c."name" = '경조사'),
      (SELECT MAX(c."sortOrder") FROM "Category" c WHERE c."bookId" = b."id" AND c."type" = 'EXPENSE'),
      -1
    ) AS "after"
  FROM "Book" b
  WHERE NOT EXISTS (
    SELECT 1 FROM "Category" c WHERE c."bookId" = b."id" AND c."type" = 'EXPENSE' AND c."name" = '모임통장'
  )
),
shifted AS (
  UPDATE "Category" c
  SET "sortOrder" = c."sortOrder" + 1
  FROM target t
  WHERE c."bookId" = t."bookId" AND c."type" = 'EXPENSE' AND c."sortOrder" > t."after"
)
INSERT INTO "Category" ("id", "bookId", "name", "type", "icon", "color", "sortOrder")
SELECT gen_random_uuid()::text, t."bookId", '모임통장', 'EXPENSE', 'people', '#4C6EF5', t."after" + 1
FROM target t;
