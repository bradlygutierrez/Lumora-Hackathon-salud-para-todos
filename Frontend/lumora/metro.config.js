const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

/**
 * NativeWind procesa global.css y convierte las clases
 * Tailwind en estilos compatibles con React Native.
 */
module.exports = withNativeWind(config, {
  input: './global.css',
});