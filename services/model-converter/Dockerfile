# The conversion sandbox of a stored IFC model shown as a document (the viewer step; the owner's decision of 2026-10-05
# on D-03, "1 b", for display only; prompt 3 section 8: "Every job that opens an owner model or document runs in a
# container with no network, a read-only input mount, and memory and time limits. That includes the Node conversion with
# That Open's IfcImporter (web-ifc)"; docs/adr/0046-viewer-spike.md decisions 2 and 6; docs/build-log.md, "The viewer
# step", item 3). Until the viewer step this folder was services/viewer-spike, the spike's image (built 2026-10-02,
# before Finding 12's fix): that image is stale and is never run by the app (the source-hash check below).
#
# Built like the IFC reader's image (services/ifc-reader/Dockerfile; ADR 0031): Node 22.17.1 slim pinned by digest;
# packages only from the npm registry, installed from the committed pnpm lockfile (--frozen-lockfile); the converter
# (packages/viewer-spike/src/convert/, with the spike's plan cutter it imports for the bench's --plans) bundled into one
# file; web-ifc's Node build, its WebAssembly and its licence beside it. The run-time stage holds no package manager,
# compiler or source. The app's conversion job (apps/api/src/jobs/model-view/sandbox.ts) and the spike's runner
# (tools/viewer-spike/run.ts) apply the IFC reader's flags: --network none, --read-only, --cap-drop ALL,
# --security-opt no-new-privileges, --user 10001:10001, --pids-limit, --memory equal to --memory-swap (4g: web-ifc is
# wasm32, so 4 GB is its ceiling), --cpus, a small noexec /tmp, the model mounted read-only, one writable output
# volume, and a wall clock (15 minutes). The converter prints codes only and writes the view file, the storey index
# (GlobalIds only) and a summary of sizes, times and memory (rule 13).
#
# The converter's version is the SHA-256 of its sources and of what builds it: the converter's and the plan cutter's
# TypeScript files (tests aside), the package's manifest, the lockfile and workspace file the build installs from, and
# this Dockerfile (its base image, the bundler's flags, the entrypoint's flags), as `sha256sum` lists them in byte
# order, hashed again. The build is given it
# (CONVERTER_SOURCE_HASH), computes it again from the sources it bundles, refuses to build when the two differ, and
# records it as the image's label `org.sovitech.converter.source-hash`. The job compares that label with the same hash
# of the repository's sources before each conversion, so an image built from other sources fails the job with the code
# `stale_image`, never runs as a silent old converter.
#
# Bundled into cli.mjs: @thatopen/fragments 3.4.7 (MIT; its own build carries copies of earcut (ISC), flatbuffers
# (Apache-2.0), lru-cache (ISC), pako ((MIT AND Zlib)) and the bounds-tree code its section helper uses) and three
# 0.186.1 (MIT). Beside it: web-ifc 0.0.78 (MPL-2.0), unmodified, with its LICENSE.md. The licences are listed in
# docs/adr/0046-viewer-spike.md.
#
# Build from the repository root with the script beside this file, which computes the hash and passes it (the root
# .dockerignore lets in only the lockfile, the workspace manifests and the sources the images bundle; never company/,
# fixtures or node_modules):
#
#   services/model-converter/build.sh

# Node 22.17.1 on Debian bookworm, slim: the IFC reader's base image and digest (ADR 0018 decision 4).
FROM node:22.17.1-bookworm-slim@sha256:2fa754a9ba4d7adbd2a51d182eaabbe355c82b673624035a38c0d42b08724854 AS build

ARG CONVERTER_SOURCE_HASH
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
COPY services/model-converter/Dockerfile services/model-converter/Dockerfile
# The source hash, computed again from what is bundled and what builds it; a build given another refuses.
RUN set -eu; \
    actual="sha256:$( (printf '%s\n' packages/viewer-spike/package.json pnpm-lock.yaml pnpm-workspace.yaml services/model-converter/Dockerfile; find packages/viewer-spike/src/convert packages/viewer-spike/src/plan -type f -name '*.ts' ! -name '*.test.ts') | LC_ALL=C sort | xargs sha256sum | sha256sum | cut -d' ' -f1)"; \
    if [ "${actual}" != "${CONVERTER_SOURCE_HASH:-}" ]; then echo "model-converter: source_hash_differs" >&2; exit 1; fi
RUN cd packages/viewer-spike \
 && node_modules/.bin/esbuild src/convert/bin.ts --bundle --platform=node --target=node22 --format=esm \
      --external:web-ifc --outfile=/out/cli.mjs \
      "--banner:js=import { createRequire as __sovitechCreateRequire } from 'node:module'; const require = __sovitechCreateRequire(import.meta.url);" \
 && mkdir -p /out/node_modules/web-ifc \
 && cd node_modules/web-ifc \
 && cp -L package.json LICENSE.md README.md web-ifc-api-node.js web-ifc-node.wasm /out/node_modules/web-ifc/

FROM node:22.17.1-bookworm-slim@sha256:2fa754a9ba4d7adbd2a51d182eaabbe355c82b673624035a38c0d42b08724854 AS model-converter

ARG CONVERTER_SOURCE_HASH
LABEL org.sovitech.converter.name="sovitech-model-converter" \
      org.sovitech.converter.source-hash="${CONVERTER_SOURCE_HASH}"
ENV NODE_ENV=production

RUN groupadd --system --gid 10001 converter \
 && useradd --system --uid 10001 --gid converter --no-create-home --shell /usr/sbin/nologin converter \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

COPY --from=build /out/ /opt/model-converter/
RUN node -e "import('/opt/model-converter/node_modules/web-ifc/web-ifc-api-node.js')"

WORKDIR /output
USER converter:converter
# The V8 heap may take 2 GB; web-ifc's WebAssembly memory and the Fragments writer's buffers live outside it, within
# the container's 4 GB (measured in ADR 0046).
ENTRYPOINT ["node", "--max-old-space-size=2048", "--disallow-code-generation-from-strings", "/opt/model-converter/cli.mjs", "--wasm", "/opt/model-converter/node_modules/web-ifc/"]
