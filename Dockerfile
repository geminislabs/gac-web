# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
ARG NODE_AUTH_TOKEN
RUN echo "@jesusCabrera84:registry=https://npm.pkg.github.com" > .npmrc && \
    echo "//npm.pkg.github.com/:_authToken=$NODE_AUTH_TOKEN" >> .npmrc
RUN npm ci
RUN rm -f .npmrc

COPY . .
# Pass build-time args if needed, but for now we rely on env vars at runtime or build args passed via compose/workflow
# Note: SvelteKit public env vars (PUBLIC_*) must be present at build time.
ARG PUBLIC_GAC_API_URL
ARG PUBLIC_SISCOM_ADMIN_API_URL
ARG PUBLIC_SISCOM_API_URL
ARG VITE_GOOGLE_MAPS_API_KEY

ENV PUBLIC_GAC_API_URL=$PUBLIC_GAC_API_URL
ENV PUBLIC_SISCOM_ADMIN_API_URL=$PUBLIC_SISCOM_ADMIN_API_URL
ENV PUBLIC_SISCOM_API_URL=$PUBLIC_SISCOM_API_URL
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

RUN npm run build
RUN npm prune --production

# Run stage
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

ENV PORT=3000
ENV NODE_ENV=production

# EXPOSE 3000

CMD ["node", "build"]
