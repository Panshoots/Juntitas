const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable unstable_enablePackageExports to resolve the _interopRequireDefault is not a function error on web
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
