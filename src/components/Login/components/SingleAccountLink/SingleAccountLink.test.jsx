import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SingleAccountLink } from './SingleAccountLink';

describe('SingleAccountLink', () => {
  it('leads to the single account and is inert while loading', () => {
    const { rerender } = render(<SingleAccountLink href="https://sso.example/auth" disabled={false} />);
    const link = screen.getByRole('link', { name: 'Se connecter avec le compte unique' });
    expect(link.getAttribute('href')).toBe('https://sso.example/auth');
    expect(link.getAttribute('aria-disabled')).toBeNull();
    rerender(<SingleAccountLink href="https://sso.example/auth" disabled />);
    const disabledLink = screen.getByRole('link', { name: 'Se connecter avec le compte unique' });
    expect(disabledLink.getAttribute('aria-disabled')).toBe('true');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    disabledLink.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });
});
