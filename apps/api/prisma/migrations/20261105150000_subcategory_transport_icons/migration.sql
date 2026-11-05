-- 세부 카테고리가 아이콘을 따로 갖게 되면서, 상위 아이콘을 그대로 쓰던 교통수단 세부에 맞는 아이콘을 넣는다.
-- 사용자가 다른 아이콘으로 바꿨으면(상위와 다르면) 그대로 둔다.
UPDATE "Category" c
SET "icon" = v."icon"
FROM (VALUES ('버스', 'bus'), ('지하철', 'subway'), ('택시', 'taxi'), ('유류비', 'fuel')) AS v("name", "icon"),
     "Category" p
WHERE c."parentId" = p."id" AND c."name" = v."name" AND c."icon" = p."icon";
