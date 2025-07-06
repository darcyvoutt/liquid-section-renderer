import terser from '@rollup/plugin-terser';

export default [
  // UMD build (for browsers)
  {
    input: 'src/liquid-section-renderer.js',
    output: {
      file: 'dist/liquid-section-renderer.js',
      format: 'umd',
      name: 'LiquidSectionRenderer',
      sourcemap: true
    }
  },
  // Minified UMD build
  {
    input: 'src/liquid-section-renderer.js',
    output: {
      file: 'dist/liquid-section-renderer.min.js',
      format: 'umd',
      name: 'LiquidSectionRenderer',
      sourcemap: true
    },
    plugins: [terser()]
  },
  // ESM build (for modern bundlers)
  {
    input: 'src/liquid-section-renderer.js',
    output: {
      file: 'dist/liquid-section-renderer.esm.js',
      format: 'es',
      sourcemap: true
    }
  }
];
