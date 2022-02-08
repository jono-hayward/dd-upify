export default {
  plugins: [
    'removeDimensions',
    {
      name: 'removeAttrs',
      params: {
        attrs: '(fill)'
      }
    }
  ]
};
