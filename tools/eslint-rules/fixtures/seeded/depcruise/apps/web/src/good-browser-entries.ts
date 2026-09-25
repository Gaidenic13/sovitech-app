// Seeded input for the dependency-cruiser boundary test (tools/eslint-rules/depcruise.test.ts).
// Allowed: apps/web imports the view-model browser entry, ui, viewer and its own files.
import '@sovitech/view-model/browser';
import '@sovitech/ui';
import '@sovitech/ui/tokens.css';
import '@sovitech/viewer';
import './local-helper';
