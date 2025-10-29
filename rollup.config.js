import typescript from '@rollup/plugin-typescript';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'main.ts',
  output: {
    dir: '.',
    sourcemap: 'inline',
    format: 'cjs',
    exports: 'default'
  },
  external: ['obsidian', '@codemirror/view', '@codemirror/state', '@codemirror/language'],
  plugins: [
    typescript({
      tsconfig: false,
      compilerOptions: {
        baseUrl: '.',
        inlineSourceMap: true,
        inlineSources: true,
        module: 'ESNext',
        target: 'es5',
        allowJs: true,
        noImplicitAny: true,
        moduleResolution: 'node',
        importHelpers: true,
        lib: ['dom', 'es5', 'scripthost', 'es2015'],
        skipLibCheck: true
      }
    }),
    nodeResolve({browser: true}),
    commonjs(),
  ]
};