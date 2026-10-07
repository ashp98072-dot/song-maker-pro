import { beforeEach, describe, expect, it, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
import { saveAdminImportBatch } from './adminImport';
import { normalizeImportedSong } from './utils/normalizeImportedSong';
const song = normalizeImportedSong({ title: 'Prueba', chords: 'Letra de prueba' })!;

describe('administrative import transport', () => {
  beforeEach(() => rpc.mockReset());
  it('sends only song data to the server admin RPC', async () => {
    rpc.mockResolvedValue({ data: [{song_id:song.id,status:'imported',message:''}], error: null });
    await saveAdminImportBatch([song], true);
    expect(rpc).toHaveBeenCalledWith('admin_import_songs', expect.objectContaining({p_publish:true,p_songs:[expect.objectContaining({id:song.id,title:'Prueba'})]}));
    expect(rpc.mock.calls[0][1]).not.toHaveProperty('user_id');
  });
  it('surfaces permission and missing-migration failures', async () => {
    rpc.mockResolvedValue({data:null,error:{code:'42501',message:'Solo administrador'}});
    await expect(saveAdminImportBatch([song],false)).rejects.toThrow('Solo administrador');
    rpc.mockResolvedValue({data:null,error:{code:'PGRST202'}});
    await expect(saveAdminImportBatch([song],false)).rejects.toThrow('migración');
  });
  it('rejects incomplete or mismatched responses instead of reporting success', async () => {
    rpc.mockResolvedValue({data:[],error:null});
    await expect(saveAdminImportBatch([song],false)).rejects.toThrow('incompleta');
    rpc.mockResolvedValue({data:[{song_id:'other',status:'imported'}],error:null});
    await expect(saveAdminImportBatch([song],false)).rejects.toThrow('incompleta');
  });
});

it('updates with explicit opt-in and keeps the server target ID', async () => {
  rpc.mockResolvedValue({data:[{song_id:song.id,target_id:'existing-song',status:'updated',message:''}],error:null});
  const result = await saveAdminImportBatch([song], true, true);
  expect(rpc).toHaveBeenCalledWith('admin_import_songs', expect.objectContaining({p_songs:[expect.objectContaining({updateExisting:true})]}));
  expect(result[0].target_id).toBe('existing-song');
});
