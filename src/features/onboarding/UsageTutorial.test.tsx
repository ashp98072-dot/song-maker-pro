import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn(), unsubscribe: vi.fn(), listener: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({supabase:{auth:{
  getUser:mocks.getUser, updateUser:mocks.updateUser,
  onAuthStateChange: (callback: typeof mocks.listener) => { mocks.listener=callback; return {data:{subscription:{unsubscribe:mocks.unsubscribe}}}; },
}}}));
import { UsageTutorial } from './UsageTutorial';
import { ONBOARDING_KEY, TUTORIAL_EVENT, readTutorialProgress, tutorialForUser } from './onboardingState';
const user = (status='active',step=0) => ({id:'user-one',created_at:'2020-01-01T00:00:00Z',user_metadata:{[ONBOARDING_KEY]:{status,step}}});
const mount = (path='/') => render(<MemoryRouter initialEntries={[path]}><UsageTutorial /></MemoryRouter>);
describe('usage tutorial', () => {
  beforeEach(()=>{
    mocks.getUser.mockReset().mockResolvedValue({data:{user:user()},error:null});
    mocks.updateUser.mockReset().mockResolvedValue({error:null});
  });
  afterEach(cleanup);
  it('validates stored state and leaves older accounts alone',()=>{
    expect(readTutorialProgress({status:'active',step:100})).toBeNull();
    expect(tutorialForUser({created_at:'2020-01-01',user_metadata:{}})).toBeNull();
    expect(tutorialForUser({created_at:new Date().toISOString(),user_metadata:{}})?.step).toBe(0);
  });
  it('saves steps, goes back and finishes in account metadata',async()=>{
    mount(); await screen.findByText('Encuentra tu primera canción');
    fireEvent.click(screen.getByText('Siguiente'));
    await screen.findByText('Adapta la canción a tu voz');
    expect(mocks.updateUser).toHaveBeenLastCalledWith({data:{[ONBOARDING_KEY]:{status:'active',step:1}}});
    fireEvent.click(screen.getByText('Atrás')); await screen.findByText('Encuentra tu primera canción');
    for (const title of ['Adapta la canción a tu voz','Prepara una lista','Comparte una sesión en vivo']) {
      fireEvent.click(screen.getByText('Siguiente')); await screen.findByText(title);
    }
    fireEvent.click(screen.getByText('Comenzar'));
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mocks.updateUser).toHaveBeenLastCalledWith({data:{[ONBOARDING_KEY]:{status:'completed',step:3}}});
  });
  it('resumes saved progress, skips and allows a manual replay',async()=>{
    mocks.getUser.mockResolvedValue({data:{user:user('active',2)},error:null});
    mount(); await screen.findByText('Prepara una lista');
    fireEvent.click(screen.getByText('Omitir'));
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mocks.updateUser).toHaveBeenLastCalledWith({data:{[ONBOARDING_KEY]:{status:'skipped',step:2}}});
    act(()=>window.dispatchEvent(new Event(TUTORIAL_EVENT)));
    await screen.findByText('Encuentra tu primera canción');
  });
  it('does not reopen completed tutorials automatically',async()=>{
    mocks.getUser.mockResolvedValue({data:{user:user('completed',3)},error:null});
    mount(); await waitFor(()=>expect(mocks.getUser).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('does not interrupt song or live routes',async()=>{
    mount('/cancion/example'); await waitFor(()=>expect(mocks.getUser).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('shows save failures without falsely advancing',async()=>{
    mocks.updateUser.mockResolvedValue({error:new Error('offline')});
    mount(); await screen.findByText('Encuentra tu primera canción');
    fireEvent.click(screen.getByText('Siguiente'));
    await screen.findByRole('alert');
    expect(screen.getByText('Encuentra tu primera canción')).toBeInTheDocument();
    expect(screen.getByText('Siguiente')).toBeEnabled();
    fireEvent.click(screen.getByText('Cerrar por ahora (sin guardar)'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('ignores a pending save after logout',async()=>{
    let resolve!: (value: {error:null})=>void;
    mocks.updateUser.mockImplementation(()=>new Promise(r=>{resolve=r;}));
    mount(); await screen.findByText('Encuentra tu primera canción');
    fireEvent.click(screen.getByText('Siguiente'));
    await waitFor(()=>expect(mocks.updateUser).toHaveBeenCalled());
    act(()=>mocks.listener('SIGNED_OUT',null));
    await act(async()=>resolve({error:null}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
