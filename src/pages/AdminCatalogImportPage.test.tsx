import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ admin: true, parse: vi.fn(), save: vi.fn(), merge: vi.fn() }));
vi.mock('@/context/useApp', () => ({ useApp: () => ({isAdmin:mocks.admin,isGuest:false,songs:[],importLibrary:mocks.merge}) }));
vi.mock('@/features/song-import', async importOriginal => ({
  ...await importOriginal<typeof import('@/features/song-import')>(),
  getSongImportProvider: () => ({parseFiles:mocks.parse}),
}));
vi.mock('@/features/song-import/adminImport', () => ({saveAdminImportBatch:mocks.save}));
vi.mock('sonner', () => ({toast:{success:vi.fn(),error:vi.fn()}}));
import AdminCatalogImportPage from './AdminCatalogImportPage';

const songs = (count: number) => Array.from({length:count},(_,i)=>({id:`imp-test-${i}`,title:`Prueba ${i}`,artist:'Autor',originalKey:'C',chords:'Texto de prueba'}));
function mount() {
  return render(<MemoryRouter initialEntries={['/import']}><Routes>
    <Route path="/import" element={<AdminCatalogImportPage />} />
    <Route path="/perfil" element={<p>Perfil</p>} />
  </Routes></MemoryRouter>);
}
async function upload(container: HTMLElement) {
  fireEvent.change(container.querySelector('input[type="file"]')!, {target:{files:[new File(['sample'],'sample.mufl')]}});
  await screen.findByDisplayValue('Prueba 0');
}
describe('administrative review and bulk save', () => {
  beforeEach(() => { mocks.admin=true; mocks.parse.mockReset(); mocks.save.mockReset(); mocks.merge.mockReset(); });
  afterEach(cleanup);
  it('redirects non-admin users without parsing or saving', () => {
    mocks.admin=false;
    mount();
    expect(screen.getByText('Perfil')).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('loads a review first and leaves duplicate titles unselected', async () => {
    mocks.parse.mockResolvedValue({songs:[...songs(1),...songs(1)],errors:[]});
    const {container}=mount();
    fireEvent.change(container.querySelector('input[type="file"]')!,{target:{files:[new File(['sample'],'sample.mufl')]}});
    await screen.findByRole('button',{name:'Solo biblioteca (1)'});
    expect(screen.getAllByDisplayValue('Prueba 0')).toHaveLength(2);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(screen.getByText(/no incluye tonalidad/)).toBeInTheDocument();
  });
  it('saves ten at a time, retains failed batches and retries only pending rows', async () => {
    mocks.parse.mockResolvedValue({songs:songs(12),errors:[]});
    mocks.save.mockImplementationOnce(async batch => batch.map((song:{id:string})=>({song_id:song.id,status:'imported',message:''})))
      .mockRejectedValueOnce(new Error('Conexión interrumpida'));
    const {container}=mount();
    await upload(container);
    fireEvent.click(screen.getByRole('button',{name:'Solo biblioteca (12)'}));
    await screen.findByText('Conexión interrumpida');
    expect(mocks.save.mock.calls.map(call=>call[0].length)).toEqual([10,2]);
    expect(screen.queryByDisplayValue('Prueba 0')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Prueba 10')).toBeInTheDocument();
    mocks.save.mockImplementationOnce(async batch=>batch.map((song:{id:string})=>({song_id:song.id,status:'imported',message:''})));
    fireEvent.click(screen.getByRole('button',{name:'Solo biblioteca (2)'}));
    await waitFor(()=>expect(screen.queryByDisplayValue('Prueba 10')).not.toBeInTheDocument());
    expect(mocks.save.mock.calls[2][0].map((song:{id:string})=>song.id)).toEqual(['imp-test-10','imp-test-11']);
    expect(mocks.merge).toHaveBeenCalledTimes(2);
  });
});

it('keeps the existing ID when an administrator opts into updates', async () => {
  mocks.admin=true;
  mocks.parse.mockResolvedValue({songs:songs(1),errors:[]});
  mocks.save.mockResolvedValue([{song_id:'imp-test-0',target_id:'original-id',status:'updated',message:''}]);
  const {container}=mount();
  fireEvent.click(screen.getByRole('checkbox', {name:/Actualizar canciones existentes/}));
  await upload(container);
  fireEvent.click(screen.getByRole('button',{name:'Solo biblioteca (1)'}));
  await waitFor(()=>expect(mocks.merge).toHaveBeenCalledWith([expect.objectContaining({id:'original-id'})],[],[],true));
  expect(mocks.save).toHaveBeenCalledWith(expect.any(Array),false,true);
  cleanup();
});

it('requires confirmation before saving an estimated key', async () => {
  mocks.admin=true; mocks.save.mockReset();
  mocks.parse.mockResolvedValue({songs:[{...songs(1)[0],originalKey:'',chords:'Am F C G7 C F G7 C'}],errors:[]});
  mocks.save.mockResolvedValue([{song_id:'imp-test-0',target_id:'imp-test-0',status:'imported',message:''}]);
  const {container}=mount(); await upload(container);
  expect(screen.getByLabelText('Tonalidad de Prueba 0')).toHaveValue('');
  fireEvent.click(screen.getByRole('button',{name:'Solo biblioteca (1)'}));
  expect(mocks.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Usar sugerencia'}));
  expect(screen.getByLabelText('Tonalidad de Prueba 0')).toHaveValue('C');
  fireEvent.click(screen.getByRole('button',{name:'Solo biblioteca (1)'}));
  await waitFor(()=>expect(mocks.save).toHaveBeenCalled());
  cleanup();
});
