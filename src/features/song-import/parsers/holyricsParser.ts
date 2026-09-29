import type { Song } from '@/types/music';
import { readJavaDataStream, type JavaObject, type JavaValue } from './javaDataStream';

function isObject(value: JavaValue): value is JavaObject {
  return value !== null && typeof value === 'object' && 'kind' in value && value.kind === 'object';
}

export function parseHolyrics(buffer: ArrayBuffer): { songs: Partial<Song>[]; errors: string[] } {
  const root = readJavaDataStream(buffer);
  let entries: JavaValue[];
  if (isObject(root) && root.className === 'java.util.ArrayList') {
    const data = root.annotations.get('java.util.ArrayList') ?? [];
    const header = data[0];
    if (!(header instanceof Uint8Array) || header.length !== 4) throw new Error('Lista Holyrics no compatible');
    entries = data.slice(1);
    const size = new DataView(header.buffer, header.byteOffset, 4).getInt32(0);
    if (size !== root.fields.get('size') || size !== entries.length) throw new Error('Lista Holyrics incompleta');
  } else entries = [root];
  if (entries.length > 5000) throw new Error('Máximo 5000 canciones por archivo');
  const songs: Partial<Song>[] = [];
  const errors: string[] = [];
  entries.forEach((entry, index) => {
    if (!isObject(entry) || entry.className !== 'com.limagiran.holyrics.model.Music') {
      throw new Error('La exportación contiene un tipo de canción no compatible');
    }
    const string = (key: string) => {
      const value = entry.fields.get(key);
      return typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : '';
    };
    const title = string('title'); const lyrics = string('lyrics');
    if (!title || !lyrics) { errors.push(`Canción ${index + 1}: falta título o letra`); return; }
    if (title.length > 200 || lyrics.length > 100000) { errors.push(`Canción ${index + 1}: título o letra demasiado largos`); return; }
    const id = entry.fields.get('id'); const set = entry.fields.get('set');
    if (typeof id !== 'bigint' || typeof set !== 'bigint') throw new Error('Identificador Holyrics no compatible');
    songs.push({
      id: `imp-holyrics-${set}-${id}`, title, artist: string('artist') || string('author') || 'Desconocido',
      lyrics, chords: lyrics,
      // This export schema has no musical key: the review screen explains the default.
      originalKey: 'C', key: 'C', scaleMode: 'major',
    });
  });
  return { songs, errors };
}
