/**
 * The workspace's view builders (phase 4; docs/adr/0044-workspace-api-contract.md decision 5, 0045-workspace-registers-
 * under-v1-5.md): pure functions from the project's derived state (2.4), as the API read it with its registry and its
 * closed gates (`WorkspaceProject`), to the contract's views (`@sovitech/view-model/browser`, workspace.ts) and the
 * display objects they name, on the one resolver (../resolver) and the formatting module (../formatting). Nothing here
 * reads the store, a module-level registry or a gate source, so TEST registries reach them in tests only.
 *
 * - inputs.ts: `WorkspaceProject` (what the API reads), `WorkspaceField`, `Built`, the asset and zone field keys.
 * - levels.ts: the level register and its one label function (R-076, R-077; D-18 interim; G7-14).
 * - frame.ts: the pages, the project card (R-049; G2-7, G9-6), the footer's "Still reading" (R-139).
 * - documents.ts: Documents' rows (G1-26, G2-14, G4-44) and the delete effect, from the project derived with the
 *   document removed (G4-39, G4-41, G4-42).
 * - scope.ts: System Scope's rows (G2-7, G11-10) and the plan of its decisions (G3-20, G4-38, G4-40).
 * - registers.ts: the asset and zone registers' cells, counts by type and register queries (2.5; ADR 0045); levels
 *   and zones named, never by key or id (G8-24); the listed zones (G4-43); tags as served (G2-15).
 * - equipment.ts: Equipment's rows, filters and pages, and the asset detail with its history (UD-08; G3-21, G4-17,
 *   G12-10).
 * - zones.ts: the zone register and its details (UD-09; G4-43, G12-10, G12-11).
 * - topology.ts: Topology's Logical view (G1-27, G2-7, G7-15, G11-11).
 * - copy.ts: what "Not available yet" names, and the delete confirmation's statement.
 * - shared.ts: one display per value id, the missing displays, the register state (rule 12; G12-10).
 */
export { ASSET_FIELDS, ZONE_FIELDS, type Built, type WorkspaceField, type WorkspaceProject } from './inputs';
export { DELETE_EFFECT, MISSING, deleteEffectDisplay } from './copy';
export { DisplaySet, registerState } from './shared';
export { knownLevels, levelLabel, levelRegister, levelValueId, levelsOf, type Level } from './levels';
export { frameView, projectCard, stillReading } from './frame';
export { categoryValueId, deleteEffectCount, deleteEffectView, documentsView, type DocumentFacts, type WithoutDocument } from './documents';
export { SCOPE_QUESTION_ID, planScopeDecisions, storedDecision, systemEquipmentPath, systemScopeView } from './scope';
export { EQUIPMENT_PAGE_SIZE, assetView, equipmentView } from './equipment';
export { levelKeyLabel, listedZones, referenceDisplays, servedTag, type NamingProject } from './registers';
export { zonesView } from './zones';
export { topologyView } from './topology';
