FROM node:20-alpine
WORKDIR /workspace
COPY api/package.json api/package-lock.json* ./api/
WORKDIR /workspace/api
RUN npm install --omit=dev
WORKDIR /workspace
COPY api ./api
COPY shared ./shared
WORKDIR /workspace/api
ENV NODE_ENV=production
EXPOSE 8787
CMD ["sh", "-c", "npx tsx src/db/migrate.ts && npx tsx src/index.ts"]
