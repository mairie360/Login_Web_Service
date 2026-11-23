import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OfferChoice } from './OfferChoice';

const props = (extra = {}) => ({ alert: null, onDismissAlert: vi.fn(), isCreating: false, onCreate: vi.fn(), onLater: vi.fn(), onNeverOnThisDevice: vi.fn(), ...extra });

describe('MAIR-811 OfferChoice', () => {
  it('lists the three benefits with their lib icons and calls each action', () => {
    const handlers = props();
    const { container } = render(<OfferChoice {...handlers} />);
    expect(container.querySelectorAll('li [data-m360-component~="Icon"]')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Créer une passkey' }));
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ne plus me le proposer sur cet appareil' }));
    expect([handlers.onCreate, handlers.onLater, handlers.onNeverOnThisDevice].map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1]);
  });

  it('while creating, the other choices wait; an alert can be dismissed', () => {
    const handlers = props({ isCreating: true, alert: { title: 'La création de la passkey a échoué. Veuillez réessayer.' } });
    render(<OfferChoice {...handlers} />);
    expect(screen.getByRole('button', { name: 'Plus tard' }).disabled).toBe(true);
    expect(screen.getByText('La création de la passkey a échoué. Veuillez réessayer.')).toBeTruthy();
  });
});
