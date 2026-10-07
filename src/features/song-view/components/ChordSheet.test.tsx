import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('@/components/ChordPopover',()=>({default:({children}:{children:React.ReactNode})=><span>{children}</span>}));
import ChordSheet from './ChordSheet';
afterEach(cleanup);
it('renders comma/repeat chords as transposed Latin chords, preserving lyrics',()=>{
  const {container}=render(<ChordSheet chords={'Am, G, C.\n////G////\nA los buenos y a los malos.'} semitones={2} useFlats={false} showChords useAmerican={false} onSectionClick={()=>{}} onSectionRef={()=>{}} />);
  expect(container.querySelectorAll('.chord-highlight')).toHaveLength(2);
  expect(container.textContent).toContain('Sim, La, Re.');
  expect(container.textContent).toContain('////La////');
  expect(screen.getByText('A los buenos y a los malos.')).toBeInTheDocument();
});
