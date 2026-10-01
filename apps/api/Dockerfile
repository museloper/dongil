# 빌드 컨텍스트: 저장소 루트 (docker compose --profile prod up)
FROM node:22-alpine AS build
WORKDIR /repo
RUN npm i -g pnpm@10
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc turbo.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @dongil/api... --filter @dongil/shared
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @dongil/shared build \
 && cd apps/api && npx prisma generate && pnpm build

FROM node:22-alpine
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
