# The viewer spike's conversion sandbox (phase 4; the owner's answer of 2026-10-02, "Trial now,
# decide later"; prompt 3 section 8: "Every job that opens an owner model or document runs in a
# container with no network, a read-only input mount, and memory and time limits. That includes
# the Node conversion with That Open's IfcImporter (web-ifc)"; docs/adr/0046-viewer-spike.md).
#
# Built like the IFC reader's image (services/ifc-reader/Dockerfile; ADR 0031): Node 22.17.1 slim
# pinned by digest; packages only from the npm registry, installed from the committed pnpm lockfile
# (--frozen-lockfile); the converter and its plan cutter (packages/viewer-spike/src/convert/ and
# src/plan/) bundled into one file; web-ifc's Node build, its WebAssembly
# and its licence beside it. The run-time stage holds no package manager, compiler or source. The
# spike's runner (tools/viewer-spike/run.ts) applies the reader's flags: --network none,
# --read-only, --cap-drop ALL, --security-opt no-new-privileges, --user 10001:10001, --pids-limit,
# --memory equal to --memory-swap (4g: web-ifc is wasm32, so 4 GB is its ceiling), --cpus, a small
# noexec /tmp, the model mounted read-only, one writable output volume, and a wall clock. The
# converter prints codes only and writes sizes, times and memory only (rule 13).
#
# Bundled into cli.mjs: @thatopen/fragments 3.4.7 (MIT; its own build carries copies of earcut
# (ISC), flatbuffers (Apache-2.0), lru-cache (ISC), pako ((MIT AND Zlib)) and the bounds-tree code
# its section helper uses) and three 0.186.1 (MIT). Beside it: web-ifc 0.0.78 (MPL-2.0),
# unmodified, with its LICENSE.md. The licences are listed in docs/adr/0046-viewer-spike.md.
#
# Build from the repository root (the root .dockerignore lets in only the lockfile, the workspace
# manifests and the sources the images bundle; never company/, fixtures or node_modules):
#
#   docker build -f services/viewer-spike/Dockerfile -t sovitech-viewer-spike:dev .

# Node 22.17.1 on Debian bookworm, slim: the IFC reader's base image and digest (ADR 0018 decision 4).
FROM node:22.17.1-bookworm-slim@sha256:2fa754a9ba4d7adbd2a51d182eaabbe355c82b673624035a38c0d42b08724854 AS build

ENV CI=true \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false
WORKDIR /build
RUN npm install --global pnpm@12.6.0 && pnpm --version

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/viewer-spike/package.json packages/viewer-spike/
RUN pnpm install --frozen-lockfile --filter "@sovitech/viewer-spike..."

COPY packages/viewer-spike/src/convert packages/viewer-spike/src/convert
COPY packages/viewer-spike/src/plan packages/viewer-spike/src/plan
RUN cd packages/viewer-spike \
 && node_modules/.bin/esbuild src/convert/bin.ts --bundle --platform=node --target=node22 --format=esm \
      --external:web-ifc --outfile=/out/cli.mjs \
      "--banner:js=import { createRequire as __sovitechCreateRequire } from 'node:module'; const require = __sovitechCreateRequire(import.meta.url);" \
 && mkdir -p /out/node_modules/web-ifc \
 && cd node_modules/web-ifc \
 && cp -L package.json LICENSE.md README.md web-ifc-api-node.js web-ifc-node.wasm /out/node_modules/web-ifc/

FROM node:22.17.1-bookworm-slim@sha256:2fa754a9ba4d7adbd2a51d182eaabbe355c82b673624035a38c0d42b08724854 AS viewer-spike

ENV NODE_ENV=production

RUN groupadd --system --gid 10001 converter \
 && useradd --system --uid 10001 --gid converter --no-create-home --shell /usr/sbin/nologin converter \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

COPY --from=build /out/ /opt/viewer-spike/
RUN node -e "import('/opt/viewer-spike/node_modules/web-ifc/web-ifc-api-node.js')"

WORKDIR /output
USER converter:converter
# The V8 heap may take 2 GB; web-ifc's WebAssembly memory and the Fragments writer's buffers live
# outside it, within the container's 4 GB (measured in ADR 0046).
ENTRYPOINT ["node", "--max-old-space-size=2048", "--disallow-code-generation-from-strings", "/opt/viewer-spike/cli.mjs", "--wasm", "/opt/viewer-spike/node_modules/web-ifc/"]
