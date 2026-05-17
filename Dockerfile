# 1) Base image with Node
FROM node:20-alpine AS base
WORKDIR /app


FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# 3) Build stage
FROM deps AS build
# Copy the rest of the source code
COPY . .
RUN npx prisma generate
RUN npm run build

# 4) Runtime image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/main.js"]