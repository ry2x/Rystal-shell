import {build} from 'esbuild';

await build({
  entryPoints: ['src/app.tsx'],
  outfile: 'dist/app.js',
  bundle: true,
  external: ['gi://*', 'resource://*', 'cairo', 'console', 'system'],
  format: 'esm',
  keepNames: false,
  minify: true,
  platform: 'neutral',
  sourcemap: false,
  target: 'es2022',
  tsconfig: 'tsconfig.json',
});
