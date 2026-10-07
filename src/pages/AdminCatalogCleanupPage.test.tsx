import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({admin:true,rpc:vi.fn(),refresh:vi.fn(),hidden:[] as string[]}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mocks.rpc}}));
vi.mock('sonner',()=>({toast:{success:vi.fn(),error:vi.fn()}}));
vi.mock('@/context/useApp',()=>({useApp:()=>({isAdmin:mocks.admin,isGuest:false,archivedSongIds:mocks.hidden,refreshCatalogArchives:mocks.refresh,
  songs:[{id:'a',title:'Gloria',artist:'Autor',chords:'Letra'},{id:'b',title:'Gloria',artist:'Autor',chords:'C G Am F'}]})}));
import AdminCatalogCleanupPage from './AdminCatalogCleanupPage';
afterEach(cleanup);
beforeEach(()=>{mocks.admin=true;mocks.hidden=[];mocks.rpc.mockReset();mocks.rpc.mockResolvedValue({error:null});mocks.refresh.mockReset();mocks.refresh.mockResolvedValue(undefined);});
const mount=()=>render(<MemoryRouter><AdminCatalogCleanupPage /></MemoryRouter>);
it('requires selection and archives only the reviewed row', async()=>{
  mount();
  const button=screen.getByRole('button',{name:'Archivar seleccionadas'});
  expect(button).toBeDisabled();
  expect(screen.getByText(/Recomendación: conservar/)).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('checkbox')[1]);
  fireEvent.click(button);
  await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('admin_archive_catalog_songs',{p_ids:['a'],p_archive:true}));
  expect(mocks.refresh).toHaveBeenCalled();
});
it('restores an archived song without deleting it',async()=>{
  mocks.hidden=['a'];mount();
  fireEvent.change(screen.getByLabelText('Mostrar canciones'),{target:{value:'archived'}});
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button',{name:'Restaurar seleccionadas'}));
  await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('admin_archive_catalog_songs',{p_ids:['a'],p_archive:false}));
});
