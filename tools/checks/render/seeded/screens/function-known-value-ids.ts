// Seeded bad input (TEST): the probe's form, knownValueIds as a function returning a
// hand-typed list (phase 0 round 2 review; adv0b/render/probe.mts). Refused: the field is
// replaced by displayObjects, which take their values only from the registered API adapter.
export default [
  {
    name: 'TEST screen with knownValueIds as a function',
    path: '/',
    knownValueIds: async () => ['building:demo.area', 'building:demo.rooms'],
  },
];
