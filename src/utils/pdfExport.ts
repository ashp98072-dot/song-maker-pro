import { Song } from '@/types/music';
import { transposeText, isChordLine, isSectionLabel } from '@/utils/transpose';

export function generateSongPdf(
  song: Song,
  currentKey: string,
  semitones: number,
  showChords: boolean,
  useFlats: boolean
) {
  const lines = song.chords.split('\n');
  
  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${song.title} - ${song.artist}</title>
<style>
  @media print { @page { margin: 1.5cm; } }
  body { font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6; color: #111; max-width: 700px; margin: 0 auto; padding: 20px; }
  .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 12px; }
  .title { font-size: 22px; font-weight: bold; margin: 0; font-family: Georgia, serif; }
  .artist { font-size: 14px; color: #555; margin: 4px 0; }
  .key-info { font-size: 12px; color: #777; margin-top: 8px; }
  .section { font-weight: bold; font-size: 14px; margin-top: 20px; margin-bottom: 4px; color: #333; text-transform: uppercase; letter-spacing: 1px; }
  .chord-line { color: #b45309; font-weight: bold; white-space: pre; }
  .lyric-line { white-space: pre; }
  .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 10px; color: #999; text-align: center; }
</style></head><body>
<div class="header">
  <p class="title">${song.title}</p>
  <p class="artist">${song.artist}</p>
  <p class="key-info">Tono: ${currentKey || song.originalKey} · ${song.scaleMode === 'minor' ? 'Menor' : 'Mayor'} · ${song.originalGender === 'male' ? '♂ Hombre' : '♀ Mujer'}</p>
</div>`;

  for (const line of lines) {
    if (isSectionLabel(line)) {
      html += `<div class="section">${escapeHtml(line)}</div>`;
    } else if (isChordLine(line)) {
      if (showChords) {
        const transposed = semitones !== 0 ? transposeText(line, semitones, useFlats) : line;
        html += `<div class="chord-line">${escapeHtml(transposed)}</div>`;
      }
    } else {
      html += `<div class="lyric-line">${escapeHtml(line)}</div>`;
    }
  }

  html += `<div class="footer">Generado con Worship Transpose</div></body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.addEventListener('load', () => {
      setTimeout(() => { win.print(); }, 300);
    });
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
