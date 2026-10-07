# NicerBase Cloud console. Build from the monorepo root:
#   docker build . -f apps/cloud/Dockerfile -t nicerbase/cloud:latest
FROM node:22-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@11.13.1
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY patches ./patches
COPY apps/cloud ./apps/cloud
RUN pnpm install --frozen-lockfile --filter cloud --ignore-scripts
RUN pnpm --filter cloud build
# Runtime manifest: only production dependencies, no workspace catalog references.
RUN node -e "const p=require('./apps/cloud/package.json');delete p.devDependencies;require('fs').writeFileSync('./apps/cloud/package.prod.json',JSON.stringify(p,null,2))"

FROM node:22-slim AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/apps/cloud/package.prod.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/apps/cloud/dist ./dist
COPY --from=build /app/apps/cloud/public ./public
USER node
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD node -e "fetch('http://localhost:4000/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
