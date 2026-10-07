import { describe, expect, it } from 'vitest';
import { analyzeCatalog, countSongChords } from './analyzeCatalog';
import type { Song } from '@/types/music';
const song = (id: string,title: string,chords: string,artist='Autor'): Song => ({id,title,chords,artist,originalKey:'C',originalGender:'male',scaleMode:'major',lyrics:''});
describe('catalog review', () => {
  it('counts comma and repeat notation without counting prose', () => {
    expect(countSongChords('Am, G, Am, C.\n////G////\nC, D, G.')).toBe(8);
    expect(countSongChords('Amigo, canta conmigo\nA los buenos y a los malos')).toBe(0);
  });
  it('groups title and artist, keeps the version with chords and marks different arrangements', () => {
    const rows=analyzeCatalog([song('a','Glória','Letra'),song('b','gloria','C G Am F'),song('c','Gloria','D G A','Otro')]);
    expect(rows).toHaveLength(2);
    expect(rows.find(row => row.song.id === 'b')?.suggestedKeep).toBe(true);
    expect(rows.every(row => !row.identical)).toBe(true);
  });
  it('distinguishes exact copies from standalone lyrics', () => {
    const rows=analyzeCatalog([song('a','Uno','C G'),song('b','Uno','C G'),song('c','Dos','Letra')]);
    expect(rows.filter(row=>row.identical)).toHaveLength(2);
    expect(rows.find(row=>row.song.id==='c')?.chordCount).toBe(0);
  });
});
