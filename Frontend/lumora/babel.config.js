module.exports = function (api) {
  const isTest = api.env('test');

  if (isTest) {
    return {
      presets: ['babel-preset-expo'],
    };
  }

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'nativewind',

          /**
           * Forzamos el perfil legacy de Hermes.
           *
           * El perfil hermes-stable puede asumir soporte
           * nativo para propiedades privadas (#private),
           * pero Hermes de Expo/RN todavía puede fallar
           * con algunos paquetes que las incluyen.
           */
          unstable_transformProfile: 'hermes-v0',
        },
      ],

      'nativewind/babel',
    ],
  };
};