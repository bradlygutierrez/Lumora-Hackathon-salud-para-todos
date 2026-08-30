const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

/**
 * Excluimos los archivos de test del bundle de Metro/Expo Router.
 * Sin esto, un *.test.ts(x) que quede dentro de src/app se trata
 * como una posible pantalla y arrastra dependencias de testing
 * (como @testing-library/react-native) al bundle real, rompiendo
 * la app en el dispositivo.
 */
config.resolver.blockList = /\.test\.[jt]sx?$/;

/**
 * NativeWind procesa global.css y convierte las clases
 * Tailwind en estilos compatibles con React Native.
 */
module.exports = withNativeWind(config, {
  input: './global.css',
});