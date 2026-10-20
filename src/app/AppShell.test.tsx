import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';
import { isFrameMode } from './DevFrame';

describe('AppShell', () => {
  it('renders the app root without the prototype status bar', () => {
    const { container } = render(<AppShell framed={false} />);
    expect(container.querySelector('[data-app]')).toBeInTheDocument();
    expect(container.querySelector('[data-frame]')).not.toBeInTheDocument();
    expect(screen.queryByText('9:41')).not.toBeInTheDocument();
  });

  it('draws the 9:41 status bar inside the 390 × 844 frame', () => {
    const { container } = render(<AppShell framed />);
    const frame = container.querySelector('[data-frame="iphone"]');
    expect(frame).toBeInTheDocument();
    expect(frame?.querySelector('[data-app]')).toContainElement(screen.getByText('9:41'));
  });
});

describe('isFrameMode', () => {
  it('is on with ?frame=iphone in demo builds', () => {
    expect(isFrameMode('?frame=iphone')).toBe(true);
    expect(isFrameMode('?x=1&frame=iphone')).toBe(true);
    expect(isFrameMode('')).toBe(false);
    expect(isFrameMode('?frame=android')).toBe(false);
  });
});
