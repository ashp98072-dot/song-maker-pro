/** Preferencias locales del modo escenario móvil (sin Supabase). */
export interface MobileStageSettings {
  mobileStageMode: boolean;
  autoHideControls: boolean;
}

/** Extensión futura: pedal MIDI, page turner Bluetooth, pantalla externa. */
export type MobileStageExtensionId = 'foot-pedal' | 'bluetooth-page-turn' | 'midi' | 'external-display';

export type DockExpansion = 'compact' | 'expanded';
