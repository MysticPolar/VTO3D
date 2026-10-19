import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders the app root without the prototype status bar', () => {
    const { container } = render(<AppShell />);
    expect(container.querySelector('[data-app]')).toBeInTheDocument();
    expect(container.querySelector('[data-frame]')).not.toBeInTheDocument();
    expect(screen.queryByText('9:41')).not.toBeInTheDocument();
  });

  it('draws the 9:41 status bar inside the 390 × 844 frame with ?frame=iphone', () => {
    window.history.replaceState(null, '', '/?frame=iphone');
    const { container } = render(<AppShell />);
    const frame = container.querySelector('[data-frame="iphone"]');
    expect(frame).toBeInTheDocument();
    expect(frame?.querySelector('[data-app]')).toContainElement(screen.getByText('9:41'));
  });
});
