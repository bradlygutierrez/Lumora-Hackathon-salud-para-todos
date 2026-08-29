/**
 * Design tokens oficiales de Lumora.
 *
 * IMPORTANTE:
 * Los componentes NO deberían escribir colores HEX directamente.
 *
 * En vez de:
 *
 * backgroundColor: '#BFE5FF'
 *
 * usar:
 *
 * backgroundColor: theme.colors.primary
 *
 * Esto permite cambiar toda la identidad visual desde un solo lugar.
 */
export const palette = {
  /**
   * LUMEN
   *
   * Familia principal de Lumora.
   */
  lumen: {
    strong: '#85BCE3',
    medium: '#99D5FF',

    /**
     * Color principal oficial.
     */
    main: '#BFE5FF',
  },

  /**
   * Tonos cálidos complementarios.
   */
  warm: {
    strong: '#FFDF9A',
    soft: '#FFEBC0',
  },

  mint: {
    soft: '#DDF5EA',
    medium: '#C5ECDD',
  },

  /**
   * COAL
   *
   * Principalmente utilizado para texto,
   * iconografía y superficies oscuras.
   */
  coal: {
    dark: '#242A2F',
    medium: '#353E45',
    light: '#505A61',
  },

  /**
   * BONE
   *
   * Fondos claros y superficies.
   */
  bone: {
    dark: '#F6F3ED',
    medium: '#FFFCF6',
    light: '#FFFDFA',
  },
} as const;

/**
 * Tokens semánticos.
 *
 * En los componentes normalmente debemos usar estos nombres
 * en lugar de acceder directamente a "palette".
 *
 * Ejemplo:
 *
 * theme.colors.textPrimary
 *
 * es más expresivo que:
 *
 * palette.coal.dark
 */
export const theme = {
  colors: {
    primary: palette.lumen.main,
    primaryStrong: palette.lumen.strong,
    primaryMedium: palette.lumen.medium,

    accent: palette.warm.strong,
    accentSoft: palette.warm.soft,
    mintSoft: palette.mint.soft,
    mintMedium: palette.mint.medium,

    background: palette.bone.light,
    surface: palette.bone.medium,
    surfaceMuted: palette.bone.dark,

    textPrimary: palette.coal.dark,
    textSecondary: palette.coal.light,

    border: palette.lumen.strong,

    /**
     * No tenemos rojo en la paleta oficial.
     *
     * Por ahora los errores utilizan Coal y SIEMPRE deben
     * acompañarse de texto/iconografía.
     *
     * Nunca comunicaremos un error únicamente mediante color.
     */
    error: palette.coal.dark,

    disabledBackground: palette.bone.dark,
    disabledText: palette.coal.light,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999,
  },

  typography: {
    size: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 20,
      xl: 24,
      xxl: 32,
    },

    weight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
} as const;

export type LumoraTheme = typeof theme;
