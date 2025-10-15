FROM node:20-alpine as deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps as build
COPY . .
RUN npx nest new tmp --package-manager=npm >/dev/null 2>&1 || true && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main.js"]