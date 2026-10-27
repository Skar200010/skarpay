FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN npm install --omit=dev --workspaces --if-present 2>/dev/null || npm install --omit=dev
EXPOSE 4100
CMD ["node", "apps/api/src/index.js"]
