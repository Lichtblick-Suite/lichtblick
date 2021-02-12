module.exports = {
  presets: ['@babel/preset-react', '@babel/preset-flow'],
  plugins: [
    '@babel/plugin-transform-modules-commonjs',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-syntax-dynamic-import',
    ['@babel/plugin-proposal-object-rest-spread', { useBuiltIns: true }],
  ],
};
