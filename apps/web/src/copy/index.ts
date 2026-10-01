/**
 * The UI string catalogue (./en.json; prompt 3 5.2 "UI language"). Components read fixed interface
 * copy only from here; everything built from stored state (badges, status and rule lines, stage
 * labels, the demo line, field labels) comes in display objects from the API.
 */
import en from './en.json';

export const copy = en;
export type Copy = typeof en;
