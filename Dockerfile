# 1) Base image with Node
FROM node:20-alpine AS base
WORKDIR /app


FROM base AS deps

COPY package*.json ./
# Copy prisma schema so @prisma/client postinstall can generate correctly
COPY prisma ./prisma
# Install exact deps from package-lock.json
RUN npm ci

# 3) Build stage
FROM deps AS build
# Copy the rest of the source code
COPY . .
# Make sure Prisma client is generated (belt-and-suspenders)
RUN npx prisma generate
# Build the NestJS app
RUN npm run build

# 4) Runtime image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
# Copy compiled JS from build
COPY --from=build /app/dist ./dist
# (Optional) copy Prisma schema if you want it in the image
COPY prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/main.js"]