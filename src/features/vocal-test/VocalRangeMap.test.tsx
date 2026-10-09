import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { VocalRangeMap } from './VocalRangeMap';

afterEach(cleanup);
describe('vocal register map', () => {
  it('shows reference registers without inventing a measurement', () => {
    render(<VocalRangeMap low={null} high={null} />);
    expect(screen.getByText('Mapa de registros de voz')).toBeInTheDocument();
    expect(screen.queryByText(/Tu rango medido:/)).not.toBeInTheDocument();
    expect(screen.getByText('Bajo')).toBeInTheDocument();
    expect(screen.getByText('Soprano')).toBeInTheDocument();
  });
  it('distinguishes the measured range from the orientative reference', () => {
    render(<VocalRangeMap low={48} high={69} selected="tenor" />);
    expect(screen.getByText('Tu rango medido: Do3 – La4')).toBeInTheDocument();
    expect(screen.getByText('Tenor ✓')).toBeInTheDocument();
    expect(screen.getByText('✓ Registro orientativo más cercano')).toBeInTheDocument();
  });
});
