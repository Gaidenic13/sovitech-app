// Seeded bad input (TEST): a screen entry whose display objects are a function returning
// literal display objects. JSON cannot hold a function, so this seed is TypeScript. The
// render check refuses it: a screen takes its display objects only from the registered API
// adapter (phase 0 round 2 review; probe verify0b/render/probe.mts, "fn returning literal ids").
export default [
  {
    name: 'TEST screen whose display objects are a function',
    path: '/',
    displayObjects: async () => ({ 'building:demo.area': { text: 'TEST 1' } }),
  },
];
