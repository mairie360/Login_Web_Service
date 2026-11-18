import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AccountSecured } from './index';

describe('AccountSecured', () => {
  it('confirms the account is secured and announces the module opening', () => {
    render(<AccountSecured />);
    expect(screen.getByText('Votre compte est sécurisé.')).toBeTruthy();
    expect(screen.getByText('Ouverture de votre module…')).toBeTruthy();
  });
});
