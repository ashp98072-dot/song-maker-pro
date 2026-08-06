import type { RefObject } from 'react';
import type { RehearsalToolsProps } from '@/features/rehearsal/components/RehearsalTools';
import type { Song, ViewMode } from '@/types/music';
import type { VocalRegister } from '@/utils/vocalRange';

export interface WorshipToolsSheetProps {
  onShare: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  onToggleMobileStage: () => void;
  mobileStageActive: boolean;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  hasListNav: boolean;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  /** Si false, oculta modo Continuo (listas de 1 canción o sin lista). */
  continuousModeAvailable?: boolean;
  onYouTube: () => void;
}

/** Props del dock rápido + sheet (handlers desde SongViewPage, sin duplicar lógica). */
export interface WorshipFloatingDockProps {
  visible: boolean;
  /** Mismo valor que SongViewPage — evita doble hook desincronizado en PWA. */
  mobileViewport: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  controlsHidden?: boolean;
  onHideControls?: () => void;
  displayKey: string;
  genderShift: '' | 'male' | 'female';
  customSemitones: number;
  autoScrolling: boolean;
  isFullscreen: boolean;

  onTransposeDown: () => void;
  onTransposeUp: () => void;
  onSetCustomSemitones: (value: number) => void;
  onGenderToggle: () => void;
  onGenderSelect: (gender: '' | 'male' | 'female') => void;
  onResetTranspose: () => void;
  onToggleAutoScroll: () => void;

  /** One-tap live + teleprompter + share (Modo culto). */
  serviceModeInput?: import('@/features/mobile-worship/utils/worshipServiceMode').WorshipServiceModeInput | null;

  sheet: Omit<WorshipControlSheetProps, 'open' | 'onOpenChange'>;
}

export interface WorshipControlSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHideControls?: () => void;
  serviceModeInput?: import('@/features/mobile-worship/utils/worshipServiceMode').WorshipServiceModeInput | null;

  song: Song;
  displayKey: string;
  displayOriginalKey: string;
  effectiveSemitones: number;
  customSemitones: number;
  genderShift: '' | 'male' | 'female';
  modeSwapped: boolean;
  capoInfo: { capo: number; playAs: string } | null;
  displayCapoPlayAs: string | null;
  vocalRegister: VocalRegister | '';

  fontSize: number;
  viewMode: ViewMode;
  autoScrolling: boolean;
  scrollSpeed: number;
  smartScroll: boolean;
  youtubeDuration: number;
  isFullscreen: boolean;

  onResetTranspose: () => void;
  onToggleModeSwap: () => void;
  onDecreaseSemitone: () => void;
  onIncreaseSemitone: () => void;
  onSetCustomSemitones: (value: number) => void;
  onVocalRegisterChange: (register: VocalRegister | '') => void;
  onGenderShiftToggle: (gender: 'male' | 'female') => void;
  onGenderSelect: (gender: '' | 'male' | 'female') => void;

  onFontSizeChange: (size: number) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onToggleAutoScroll: () => void;
  onToggleSmartScroll: () => void;
  onScrollSpeedChange: (speed: number) => void;
  onToggleFullscreen: () => void;
  onYouTube: () => void;

  rehearsal: RehearsalToolsProps;
  tools: WorshipToolsSheetProps;
}
