/**
 * The lazily loaded chunk's entry (docs/build-log.md, the viewer step, item 3, "What loads when"): the model view
 * bound to the three.js engine. `ModelViewer` (../ModelViewer.tsx) imports it with a literal `import()` only after
 * the graphics probe answers "hardware", so three.js, Fragments and camera-controls are fetched by no page that
 * cannot draw the view.
 */
import { createThreeEngine } from './engine';
import { ModelView, type ModelViewProps } from './ModelView';

export default function ModelViewEntry(props: Omit<ModelViewProps, 'createEngine'>) {
  return <ModelView {...props} createEngine={createThreeEngine} />;
}
