import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('sonner', () => ({ Toaster: ({theme}:{theme:string}) => <output data-testid="toast-theme">{theme}</output> }));
import { ThemeProvider } from './ThemeContext';
import { useTheme } from './useTheme';
import { Toaster } from '@/components/ui/sonner';
function Controls() {
  const {toggleTheme} = useTheme();
  return <button onClick={toggleTheme}>Cambiar tema</button>;
}
const mount = () => render(<ThemeProvider><Controls /><Toaster /></ThemeProvider>);
describe('shared application and notification theme', () => {
  beforeEach(()=>localStorage.clear());
  afterEach(()=>{cleanup();document.documentElement.classList.remove('light');});
  it('applies the stored light theme to document and notifications',()=>{
    localStorage.setItem('wt-theme','light');
    mount();
    expect(document.documentElement).toHaveClass('light');
    expect(screen.getByTestId('toast-theme')).toHaveTextContent('light');
  });
  it('updates notifications and persistence when toggling',()=>{
    mount();
    expect(screen.getByTestId('toast-theme')).toHaveTextContent('dark');
    fireEvent.click(screen.getByText('Cambiar tema'));
    expect(screen.getByTestId('toast-theme')).toHaveTextContent('light');
    expect(localStorage.getItem('wt-theme')).toBe('light');
    fireEvent.click(screen.getByText('Cambiar tema'));
    expect(screen.getByTestId('toast-theme')).toHaveTextContent('dark');
  });
  it('keeps notifications aligned with theme changes in another tab',()=>{
    mount();
    act(()=>window.dispatchEvent(new StorageEvent('storage',{key:'wt-theme',newValue:'light'})));
    expect(screen.getByTestId('toast-theme')).toHaveTextContent('light');
    expect(document.documentElement).toHaveClass('light');
  });
});
