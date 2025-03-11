module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Enable react-native-reanimated
      'react-native-reanimated/plugin',
      
      // Support for alias imports
      ['module-resolver', {
        root: ['./'],
        alias: {
          '@': './',
        },
      }],
    ],
  };
}; 