/**
 * The container images the store runs on, pinned by digest (prompt 3 section 12:
 * Docker Hub images are pinned by digest). docker-compose.yml names the same
 * Postgres image; images.test.ts keeps the two equal.
 *
 * - Postgres 18.6 on Debian bookworm, the multi-architecture index digest
 *   (arm64 for development machines, amd64 for CI), pulled 2026-09-25.
 * - Testcontainers' resource reaper (ryuk) 0.14.0, the version testcontainers
 *   12.0.1 starts, pulled 2026-09-25. The testing entry sets it through
 *   RYUK_CONTAINER_IMAGE, so the reaper is pinned as well.
 */
export const POSTGRES_IMAGE =
  'postgres:18.6-bookworm@sha256:3725f4e2499eef5134592b3b4ab79a543ed7f8e533b05b5b637af926630f6650';

export const RYUK_IMAGE =
  'testcontainers/ryuk:0.14.0@sha256:7c1a8a9a47c780ed0f983770a662f80deb115d95cce3e2daa3d12115b8cd28f0';
