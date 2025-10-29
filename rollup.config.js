import typescript from '@rollup/plugin-typescript';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'main.ts',
  output: {
    dir: 'dist',
    sourcemap: 'inline',
    format: 'cjs',
    exports: 'default'
  },
  external: ['obsidian', '@codemirror/view', '@codemirror/state', '@codemirror/language'],
  plugins: [
typescript({ compilerOptions: { outDir: 'dist' } }),
    nodeResolve({browser: true}),
    commonjs(),
  ]
};
