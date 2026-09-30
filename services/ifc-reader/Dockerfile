# The IFC reader's sandbox (owner decision, 2026-09-26: "web-ifc instead"; prompt 3
# sections 8 and 11; docs/adr/0018-extractor-dependencies-and-sandbox-image.md;
# docs/adr/0031-ifc-reader-on-web-ifc.md). Every IFC job runs in a container of
# this image; PDF and XLSX jobs run in the Python extractor's
# (services/extractor/Dockerfile). The image carries no secret and makes no
# network call at run time; the API's runner (apps/api/src/jobs/sandbox.ts)
# applies the same flags as for the extractor: --network none, --read-only,
# --cap-drop ALL, --security-opt no-new-privileges, --pids-limit, --memory equal
# to --memory-swap (4g: web-ifc is wasm32, so 4 GB is its ceiling), --cpus, a
# small noexec /tmp, the document and the request mounted read-only, one
# writable output folder, and a wall clock after which the runner kills the
# container. Logs carry codes, GlobalIds and STEP ids only (rule 13).
#
# The reader's code is the workspace package packages/ifc-reader (TypeScript,
# under the repository's lint bans and tests); this folder holds only its image.
#
# Build from the repository root (the root .dockerignore limits the context to
# the lockfile, the workspace manifests and the sources this image bundles; never
# company/, fixtures or node_modules):
#
#   docker build -f services/ifc-reader/Dockerfile -t sovitech-ifc-reader:dev .
#
# Packages come only from the npm registry, installed at build time from the
# committed pnpm lockfile (--frozen-lockfile: a changed or unlisted package
# fails the build). pnpm itself is the version the root package.json pins
# (packageManager, 12.6.0), installed from the npm registry by npm (pnpm 12 ships
# as a native executable per platform, which corepack 0.33 cannot unpack). The
# run-time stage holds Node, the one bundled file and web-ifc's Node build and
# licence: no package manager, no compiler, no source.

# Node 22.17.1 on Debian bookworm, slim, pinned by the multi-platform index
# digest (linux/amd64 and linux/arm64 among its platforms), pulled 2026-09-25
# (ADR 0018 decision 4).
FROM node:22.17.1-bookworm-slim@sha256:2fa754a9ba4d7adbd2a51d182eaabbe355c82b673624035a38c0d42b08724854 AS build

ENV CI=true \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false
WORKDIR /build
RUN npm install --global pnpm@12.6.0 && pnpm --version

# The workspace manifests and the lockfile first, so the install layer is cached
# until one of them changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ifc-reader/package.json packages/ifc-reader/
COPY packages/extraction-contract/package.json packages/extraction-contract/
COPY packages/registry/package.json packages/registry/
COPY packages/domain/package.json packages/domain/
RUN pnpm install --frozen-lockfile --filter "@sovitech/ifc-reader..."

# The sources the bundle reaches, then one file for the run-time stage (web-ifc
# stays outside it: its Node build finds its WebAssembly next to itself).
COPY packages/ifc-reader/src packages/ifc-reader/src
COPY packages/extraction-contract/src packages/extraction-contract/src
COPY packages/registry/src packages/registry/src
COPY packages/domain/src packages/domain/src
RUN cd packages/ifc-reader \
 && node_modules/.bin/esbuild src/bin.ts --bundle --platform=node --target=node22 --format=esm \
      --external:web-ifc --outfile=/out/cli.mjs \
      "--banner:js=import { createRequire as __sovitechCreateRequire } from 'node:module'; const require = __sovitechCreateRequire(import.meta.url);" \
 && mkdir -p /out/node_modules/web-ifc \
 && cd node_modules/web-ifc \
 && cp -L package.json LICENSE.md README.md web-ifc-api-node.js web-ifc-node.wasm /out/node_modules/web-ifc/

FROM node:22.17.1-bookworm-slim@sha256:2fa754a9ba4d7adbd2a51d182eaabbe355c82b673624035a38c0d42b08724854 AS ifc-reader

ENV NODE_ENV=production

# An unprivileged account with no home content and no login shell (as the
# extractor's, uid 10001).
RUN groupadd --system --gid 10001 reader \
 && useradd --system --uid 10001 --gid reader --no-create-home --shell /usr/sbin/nologin reader \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

COPY --from=build /out/ /opt/ifc-reader/
RUN node -e "import('/opt/ifc-reader/node_modules/web-ifc/web-ifc-api-node.js')"

WORKDIR /output
USER reader:reader
# The V8 heap stays under half the container's 4 GB, leaving the rest to
# web-ifc's WebAssembly memory and the file's bytes (measured in ADR 0031).
ENTRYPOINT ["node", "--max-old-space-size=2048", "--disallow-code-generation-from-strings", "/opt/ifc-reader/cli.mjs"]
