// Minimal flat config — Next.js plugin is wired into `next build`,
// so this file just enables `npm run lint` without conflicts.
export default [
  {
    ignores: ["node_modules", ".next", "out", "next-env.d.ts"],
  },
];
