/** @type {import('next').NextConfig} */
export default {
  // Static export: the whole app is client-side (pdf.js + two JSON files), so
  // there is no server to run. `next build` emits ./out, which is what Amplify
  // manual deploys accept.
  output: 'export',
  turbopack: {},
  agentRules: false,
  images: { unoptimized: true },
};
