import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginFeedback } from './LoginFeedback';

describe('LoginFeedback', () => {
  it('shows a dismissible error and the success', async () => {
    const onDismissError = vi.fn();
    const { rerender, container } = render(<LoginFeedback error="" success="" onDismissError={onDismissError} />);
    expect(container.innerHTML).toBe('');
    rerender(<LoginFeedback error="Identifiants refusés" success="" onDismissError={onDismissError} />);
    expect(screen.getByRole('alert').textContent).toContain('Identifiants refusés');
    await userEvent.click(screen.getByRole('button', { name: 'Fermer le message' }));
    expect(onDismissError).toHaveBeenCalledTimes(1);
    rerender(<LoginFeedback error="" success="Mot de passe modifié" onDismissError={onDismissError} />);
    expect(screen.getByRole('status').textContent).toBe('Mot de passe modifié');
  });
});
