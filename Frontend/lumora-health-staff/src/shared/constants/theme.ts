export const theme = {
  color: {
    background: '#FFFDFA',
    appBackground: '#FFFDFA',
    surface: '#FFFFFF',
    surfaceMuted: '#F6F3ED',
    text: '#242A2F',
    mutedText: '#505A61',
    subtleText: '#6B747B',
    primary: '#4A86B6',
    primaryPressed: '#3B6B92',
    primarySoft: '#DCECF6',
    accent: '#FFDF9A',
    border: '#CFE4F4',
    softBorder: '#E8E5DF',
    danger: '#BA1A1A',
    dangerText: '#93000A',
    dangerSoft: '#FDE7E7',
    warning: '#B54708',
    success: '#196B59',
    successSoft: '#DDF4EE',
    info: '#175CD3',
    // Lavados de fondo muy sutiles (más pálidos que los "Soft" de arriba,
    // pensados para cubrir toda la pantalla sin competir con el contenido)
    // usados por Screen para diferenciar secciones -- Pacientes, Agenda y
    // Personal, cada una con un matiz de la misma paleta. El resto de la
    // app se queda en appBackground (sin tinte) a propósito, para no
    // saturar visualmente pantallas que no son "destinos" de navegación.
    patientsWash: '#F3F8FC',
    agendaWash: '#FFF8EC',
    directoryWash: '#F1F9F6',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999,
  },
  typography: {
    title: 28,
    subtitle: 20,
    body: 16,
    caption: 13,
  },
} as const;
