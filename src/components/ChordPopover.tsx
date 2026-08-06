import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getChordDiagram } from '@/utils/chordDiagrams';
import {
  CHORD_POPOVER_ESTIMATE_HEIGHT,
  CHORD_POPOVER_ESTIMATE_WIDTH,
  choosePopoverPlacement,
  clampPopoverPosition,
  measureAnchorSpaces,
  shouldUseChordModal,
  type ChordPopoverPlacement,
} from '@/utils/chordPopoverPosition';
import { ChordDiagramContent } from '@/components/chord-diagram/ChordDiagramContent';
import { ChordDiagramModal } from '@/components/chord-diagram/ChordDiagramModal';

interface ChordPopoverProps {
  chord: string;
  children: React.ReactNode;
}

type PopoverCoords = {
  top: number;
  left: number;
  placement: ChordPopoverPlacement;
};

const HOVER_CLOSE_DELAY_MS = 120;

function ChordPopoverPortal({
  popoverRef,
  chord,
  diagram,
  coords,
  onExpand,
  onClose,
  onCancelClose,
}: {
  popoverRef: React.RefObject<HTMLDivElement | null>;
  chord: string;
  diagram: NonNullable<ReturnType<typeof getChordDiagram>>;
  coords: PopoverCoords;
  onExpand: () => void;
  onClose: () => void;
  onCancelClose: () => void;
}) {
  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={`Diagrama de ${chord}`}
      className="fixed z-[80] glass-card p-3 shadow-xl float-in min-w-[200px] max-w-[min(96vw,320px)]"
      style={{ top: coords.top, left: coords.left }}
      onMouseEnter={onCancelClose}
      onMouseLeave={onClose}
      onClick={(e) => e.stopPropagation()}
    >
      <ChordDiagramContent chord={chord} diagram={diagram} onExpand={onExpand} />
    </div>,
    document.body
  );
}

export default function ChordPopover({ chord, children }: ChordPopoverProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diagram = getChordDiagram(chord);

  const cancelScheduledClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closePopover = useCallback(() => {
    cancelScheduledClose();
    setShowPopover(false);
    setCoords(null);
  }, [cancelScheduledClose]);

  const scheduleClose = useCallback(() => {
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(closePopover, HOVER_CLOSE_DELAY_MS);
  }, [cancelScheduledClose, closePopover]);

  const openPopoverAtAnchor = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const anchorRect = anchor.getBoundingClientRect();
    const spaces = measureAnchorSpaces(anchorRect);
    const placement = choosePopoverPlacement(spaces);
    setCoords(
      clampPopoverPosition(
        anchorRect,
        CHORD_POPOVER_ESTIMATE_WIDTH,
        CHORD_POPOVER_ESTIMATE_HEIGHT,
        placement
      )
    );
    setShowPopover(true);
  }, []);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const anchorRect = anchor.getBoundingClientRect();
    const popEl = popoverRef.current;
    const popWidth = popEl?.offsetWidth ?? CHORD_POPOVER_ESTIMATE_WIDTH;
    const popHeight = popEl?.offsetHeight ?? CHORD_POPOVER_ESTIMATE_HEIGHT;

    const spaces = measureAnchorSpaces(anchorRect);
    const placement = choosePopoverPlacement(spaces, popHeight);
    setCoords(clampPopoverPosition(anchorRect, popWidth, popHeight, placement));
  }, []);

  const openModal = useCallback(() => {
    closePopover();
    setModalOpen(true);
  }, [closePopover]);

  const handleActivate = useCallback(() => {
    if (!diagram) return;
    if (shouldUseChordModal()) {
      setModalOpen(true);
      return;
    }
    if (showPopover) {
      closePopover();
    } else {
      openPopoverAtAnchor();
    }
  }, [diagram, showPopover, closePopover, openPopoverAtAnchor]);

  useLayoutEffect(() => {
    if (!showPopover) return;
    updatePosition();
  }, [showPopover, updatePosition]);

  useEffect(() => {
    if (!showPopover) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [showPopover, updatePosition]);

  useEffect(() => {
    if (!showPopover) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePopover();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showPopover, closePopover]);

  useEffect(() => () => cancelScheduledClose(), [cancelScheduledClose]);

  if (!diagram) return <>{children}</>;

  const useModalOnly = shouldUseChordModal();

  return (
    <>
      <span
        ref={anchorRef}
        className="relative inline cursor-pointer overflow-visible"
        onMouseEnter={() => {
          if (useModalOnly) return;
          cancelScheduledClose();
          openPopoverAtAnchor();
        }}
        onMouseLeave={() => {
          if (useModalOnly) return;
          scheduleClose();
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleActivate();
        }}
      >
        {children}
      </span>

      {showPopover && coords && !useModalOnly && (
        <ChordPopoverPortal
          popoverRef={popoverRef}
          chord={chord}
          diagram={diagram}
          coords={coords}
          onExpand={openModal}
          onClose={closePopover}
          onCancelClose={cancelScheduledClose}
        />
      )}

      <ChordDiagramModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        chord={chord}
        diagram={diagram}
      />
    </>
  );
}
