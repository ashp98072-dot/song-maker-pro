import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ report: vi.fn(), block: vi.fn(), auth: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: mocks.auth } } }));
vi.mock('./moderationApi', async () => {
  const actual = await vi.importActual<typeof import('./moderationApi')>('./moderationApi');
  return { ...actual, reportContent: mocks.report, setUserBlocked: mocks.block };
});
import { ModerationActions } from './ModerationActions';
beforeEach(() => { mocks.auth.mockResolvedValue({ data: { user: { id: 'viewer' } } }); mocks.report.mockReset().mockResolvedValue(undefined); mocks.block.mockReset().mockResolvedValue(undefined); });
afterEach(cleanup);
it('cancelling does not report or block', async () => {
  render(<ModerationActions kind="comment" targetId="comment-1" ownerId="author" />);
  fireEvent.click(screen.getByText('Reportar'));
  await screen.findByText('Reportar a moderación');
  fireEvent.click(screen.getByText('Cancelar'));
  expect(mocks.report).not.toHaveBeenCalled(); expect(mocks.block).not.toHaveBeenCalled();
});
it('reports the selected content and blocks only after the report succeeds', async () => {
  render(<ModerationActions kind="comment" targetId="comment-1" ownerId="author" />);
  fireEvent.click(screen.getByText('Reportar'));
  await screen.findByText('Reportar a moderación');
  fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'spam' } });
  fireEvent.change(screen.getByLabelText('Detalles (opcional)'), { target: { value: 'Repeated links' } });
  fireEvent.click(screen.getByLabelText('También bloquear a este usuario'));
  fireEvent.click(screen.getByText('Enviar reporte'));
  await waitFor(() => expect(mocks.block).toHaveBeenCalledWith('author', true));
  expect(mocks.report).toHaveBeenCalledWith('comment', 'comment-1', 'spam', 'Repeated links');
});
it('preserves the form and does not block on report failure', async () => {
  mocks.report.mockRejectedValue(new Error('offline'));
  render(<ModerationActions kind="list" targetId="list-1" ownerId="author" />);
  fireEvent.click(screen.getByText('Reportar'));
  await screen.findByText('Reportar a moderación');
  fireEvent.click(screen.getByLabelText('También bloquear a este usuario'));
  fireEvent.click(screen.getByText('Enviar reporte'));
  await waitFor(() => expect(mocks.report).toHaveBeenCalled());
  expect(mocks.block).not.toHaveBeenCalled(); expect(screen.getByText('Reportar a moderación')).toBeInTheDocument();
});
