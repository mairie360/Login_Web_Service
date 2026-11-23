import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AutomaticCreation } from './AutomaticCreation';

describe('MAIR-811 AutomaticCreation', () => {
  it('tells the sign-in succeeded while the module opens', () => {
    render(<AutomaticCreation />);
    expect(screen.getByText('Connexion réussie.')).toBeTruthy();
    expect(screen.getByText('Ouverture de votre module…')).toBeTruthy();
  });
});
