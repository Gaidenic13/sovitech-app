/**
 * The wizard API contract (phase 3; docs/adr/0036-wizard-api-contract.md): the display objects the
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
export * from './routes';
