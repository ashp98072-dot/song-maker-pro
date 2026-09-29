import { describe, expect, it } from 'vitest';
import { parseHolyrics } from './holyricsParser';
import { readJavaDataStream } from './javaDataStream';

// Synthetic Java-stream fixtures; no user catalog or copyrighted lyrics in Git.
const utf = (text: string) => {
  const bytes = Array.from(new TextEncoder().encode(text));
  return [bytes.length >> 8, bytes.length & 255, ...bytes];
};
const str = (text: string) => [0x74, ...utf(text)];
const long = (value: number) => [0, 0, 0, 0, 0, 0, value >> 8, value & 255];
const desc = (name: string, flags: number, fields: [string, string][]) => [
  0x72, ...utf(name), ...long(1), flags, 0, fields.length,
  ...fields.flatMap(([type, field]) => [type.charCodeAt(0), ...utf(field), ...(type === 'L' ? str('Ljava/lang/String;') : [])]),
  0x78, 0x70,
];
const music = (title = 'Prueba á', lyrics = 'Línea uno\n\nLínea dos') => [
  0x73, ...desc('com.limagiran.holyrics.model.Music', 2, [['J','id'], ['J','set'], ['L','artist'], ['L','lyrics'], ['L','title']]),
  ...long(123), ...long(456), ...str('Autor de prueba'), ...str(lyrics), ...str(title),
];
const stream = (bytes: number[]) => new Uint8Array([0xac, 0xed, 0, 5, ...bytes]).buffer;
const list = (entries: number[][]) => stream([
  0x73, ...desc('java.util.ArrayList', 3, [['I','size']]),
  0, 0, 0, entries.length, 0x77, 4, 0, 0, 0, entries.length,
  ...entries.flat(), 0x78,
]);

describe('Holyrics data-only import', () => {
  it('reads a single Music object, preserves accents and stanza breaks with stable IDs', () => {
    const {songs,errors} = parseHolyrics(stream(music()));
    expect(errors).toEqual([]);
    expect(songs[0]).toMatchObject({ id: 'imp-holyrics-456-123', title: 'Prueba á', artist: 'Autor de prueba', chords: 'Línea uno\n\nLínea dos' });
    expect(parseHolyrics(stream(music())).songs[0].id).toBe(songs[0].id);
  });
  it('reads an ArrayList and reports invalid records without losing valid songs', () => {
    const result = parseHolyrics(list([music(), music('', '')]));
    expect(result.songs).toHaveLength(1);
    expect(result.errors).toEqual(['Canción 2: falta título o letra']);
  });
  it('rejects truncated input, bad headers, trailing data and unsupported objects', () => {
    const bytes = new Uint8Array(list([music()]));
    expect(() => parseHolyrics(bytes.slice(0,-1).buffer)).toThrow();
    expect(() => parseHolyrics(new Uint8Array([1,2,3,4]).buffer)).toThrow();
    expect(() => parseHolyrics(stream([...music(),0]))).toThrow();
    expect(() => parseHolyrics(stream([0x73,...desc('unknown.Class',2,[])]))).toThrow();
  });
  it('rejects oversized files before decoding', () => {
    expect(() => parseHolyrics(new ArrayBuffer(10 * 1024 * 1024 + 1))).toThrow('10 MB');
  });
  it('reads references without duplicating or executing objects', () => {
    const bytes = list([music()]);
    const shared = parseHolyrics(list([music(), [0x71,0,0x7e,0,6]]));
    expect(shared.songs).toHaveLength(2);
    expect(shared.songs[1]).toEqual(shared.songs[0]);
    // Root ArrayList is handle 0x7e0001; a cyclic reference is not a Music.
    expect(() => parseHolyrics(list([[0x71,0,0x7e,0,1]]))).toThrow();
    expect(parseHolyrics(bytes).songs).toHaveLength(1);
    expect(() => readJavaDataStream(stream([0x71,0,0x7e,0,1]))).toThrow();
  });
  it('decodes Java modified UTF-8 null and surrogate pairs', () => {
    expect(readJavaDataStream(stream([0x74,0,8,0xc0,0x80,0xed,0xa0,0xbd,0xed,0xb8,0x80]))).toBe('\0😀');
    expect(() => readJavaDataStream(stream([0x74,0,1,0xc0]))).toThrow();
  });
  it('checks list size and rejects externalizable class hooks', () => {
    const malformed = new Uint8Array(list([music()]));
    const marker = malformed.findIndex((v,i) => v === 0x77 && malformed[i+1] === 4);
    malformed[marker+5] = 2;
    expect(() => parseHolyrics(malformed.buffer)).toThrow('incompleta');
    expect(() => readJavaDataStream(stream([0x73,...desc('External', 4, [])]))).toThrow();
  });
});
