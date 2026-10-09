import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import DeleteAccountPage from './DeleteAccountPage';
import PrivacyPage from './PrivacyPage';
import { isPublicAppPath } from '@/utils/publicAppPaths';

describe('public privacy and deletion paths', () => {
  it('allows both URLs without an account', () => {
    expect(isPublicAppPath('/privacidad')).toBe(true);
    expect(isPublicAppPath('/eliminar-cuenta')).toBe(true);
  });
  it('offers a manual request without claiming immediate deletion', () => {
    render(<MemoryRouter><DeleteAccountPage /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Preparar correo de eliminación' }).getAttribute('href'))
      .toContain('mailto:worhisptranspose@gmail.com?subject=');
    expect(screen.getByText(/Preparar el correo no envía/)).toBeInTheDocument();
  });
  it('links the policy to account deletion', () => {
    render(<MemoryRouter><PrivacyPage /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Solicitar eliminación de cuenta y datos' }))
      .toHaveAttribute('href', '/eliminar-cuenta');
  });
});
