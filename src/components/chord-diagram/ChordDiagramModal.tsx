import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ChordDiagramResult } from '@/utils/chordDiagrams';
import { ChordDiagramContent } from '@/components/chord-diagram/ChordDiagramContent';

type ChordDiagramModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chord: string;
  diagram: ChordDiagramResult;
};

export function ChordDiagramModal({ open, onOpenChange, chord, diagram }: ChordDiagramModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] max-h-[min(90vh,560px)] overflow-y-auto z-[200]">
        <DialogHeader>
          <DialogTitle className="font-display text-gold text-center">{chord}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <ChordDiagramContent
            chord={chord}
            diagram={diagram}
            scale={1.5}
            showExpandAction={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
