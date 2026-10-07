/**
 * The API contract (phase 3, the wizard: docs/adr/0036-wizard-api-contract.md; phase 4, the workspace:
 * workspace.ts, docs/adr/0044-workspace-api-contract.md; phase 5, the proposal, Reports and exports: proposal.ts,
 * docs/adr/0049-proposal-reports-export-contract.md; phase 6, the Metrics pages and their chart series: metrics.ts,
 * docs/adr/0052-metrics-pages-and-series.md): the display objects the
 * UI receives, the route table with each route's schemas and refusals, and the request and response
 * shapes of sign-in, projects, the eight step views, the owner's writes, late findings, uploads and
 * phase 3's proposal page. apps/api validates its answers against these schemas and apps/web its
 * requests; both import them through `@sovitech/view-model/browser`.
 */
export * from './display';
export * from './common';
export * from './auth';
export * from './projects';
export * from './steps';
export * from './actions';
export * from './late-findings';
export * from './uploads';
export * from './workspace';
export * from './proposal';
export * from './metrics';
export * from './routes';
