#!/bin/sh
# Builds the conversion sandbox image (./Dockerfile) from the repository root, labelled with the SHA-256 of the
# converter's sources and of what builds it: the converter's and the plan cutter's TypeScript files (tests aside), the
# package's manifest, the lockfile and workspace file the image installs from, and the Dockerfile, as sha256sum lists
# them in byte order, hashed again. A change to any of them (any lockfile change included) needs a rebuild. The Dockerfile computes the same hash from what it bundles and
# refuses to build when the two differ; the app's conversion job computes it from the repository and refuses an image
# whose label differs (`stale_image`; apps/api/src/jobs/model-view/image.ts).
#
#   services/model-converter/build.sh            # tags sovitech-model-converter:dev
#   SOVITECH_CONVERTER_IMAGE=<tag> services/model-converter/build.sh
set -eu
cd "$(dirname "$0")/../.."
if command -v sha256sum >/dev/null 2>&1; then SUM='sha256sum'; else SUM='shasum -a 256'; fi
# shellcheck disable=SC2086 # SUM is a command and its arguments.
hash="sha256:$( (printf '%s\n' packages/viewer-spike/package.json pnpm-lock.yaml pnpm-workspace.yaml services/model-converter/Dockerfile; find packages/viewer-spike/src/convert packages/viewer-spike/src/plan -type f -name '*.ts' ! -name '*.test.ts') | LC_ALL=C sort | xargs $SUM | $SUM | cut -d' ' -f1)"
exec docker build -f services/model-converter/Dockerfile --build-arg "CONVERTER_SOURCE_HASH=${hash}" -t "${SOVITECH_CONVERTER_IMAGE:-sovitech-model-converter:dev}" .
