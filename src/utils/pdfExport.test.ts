import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Song } from '@/types/music';
import { generateSongPdf } from './pdfExport';

const native = vi.hoisted(() => ({ platform: 'android', print: vi.fn() }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => native.platform },
  registerPlugin: () => ({ print: native.print }),
}));

const song: Song = {
  id: 'print-test', title: '<script>example</script>', artist: 'A & B',
  originalKey: 'C', originalGender: 'male', scaleMode: 'major',
  lyrics: 'Una canción', chords: 'C       G\nUna canción',
};

afterEach(() => { vi.restoreAllMocks(); native.print.mockReset(); native.platform = 'android'; });

describe('song printing', () => {
  it('opens Android printing with escaped song data and the displayed transposition', async () => {
    const open = vi.spyOn(window, 'open');
    await generateSongPdf(song, 'D', 2, true, false);
    const html = native.print.mock.calls[0][0].html as string;
    expect(html).toContain('&lt;script&gt;example&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('A &amp; B');
    expect(html).toContain('Tono: D');
    expect(html).toContain('D       A');
    expect(open).not.toHaveBeenCalled();
  });

  it('prints lyrics without chord lines when the song is in lyrics view', async () => {
    await generateSongPdf(song, 'C', 0, false, false);
    const html = native.print.mock.calls[0][0].html as string;
    expect(html).toContain('Una canción');
    expect(html).not.toContain('<div class="chord-line">');
  });

  it('surfaces native printing failure instead of silently opening an HTML preview', async () => {
    native.print.mockRejectedValueOnce(new Error('Servicio no disponible'));
    await expect(generateSongPdf(song, 'C', 0, true, false)).rejects.toThrow('Servicio no disponible');
  });

  it('reports a blocked browser print window and releases the temporary URL', async () => {
    native.platform = 'web';
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() });
    vi.spyOn(window, 'open').mockReturnValue(null);
    try {
      await expect(generateSongPdf(song, 'C', 0, true, false)).rejects.toThrow('ventana de impresión');
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    } finally { vi.unstubAllGlobals(); }
  });
});
