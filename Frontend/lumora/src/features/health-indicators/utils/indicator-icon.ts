import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Icono por código de indicador, para "Seleccionar Indicador".
 *
 * El checklist de A08 pide soportar "los definidos por backend" además de
 * los 5 iniciales -- por eso esto es un lookup con fallback, no un switch
 * cerrado: un indicador nuevo que agregue el equipo de backend simplemente
 * usa el icono genérico hasta que se le asigne uno propio aquí.
 */
const ICON_BY_CODIGO: Record<string, IconName> = {
  presion_arterial_sistolica: 'heart',
  glucosa: 'water',
  peso: 'body',
  saturacion_oxigeno: 'pulse',
  temperatura_corporal: 'thermometer',
};

const DEFAULT_ICON: IconName = 'medkit-outline';

export function iconForIndicador(codigo: string): IconName {
  return ICON_BY_CODIGO[codigo] ?? DEFAULT_ICON;
}
