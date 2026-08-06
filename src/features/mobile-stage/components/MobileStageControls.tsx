/**
 * Punto de extensión para controles externos (pedal, Bluetooth page turn, MIDI).
 * No implementado aún — el dock expone `data-pedal-ready` para enlazar listeners.
 */
export interface ExternalStageControlHandlers {
  onTransposeUp?: () => void;
  onTransposeDown?: () => void;
  onToggleAutoScroll?: () => void;
  onToggleMetronome?: () => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
}

/** Reservado: registrar listeners de pedal/MIDI sin acoplar a Supabase. */
export function useExternalStageControls(_handlers: ExternalStageControlHandlers) {
  // Futuro: Gamepad API, Web MIDI, Bluetooth HID
}
