import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginField } from './LoginField';

describe('LoginField', () => {
  it('is a labelled required field named after its id', () => {
    const onChange = vi.fn();
    render(<LoginField id="email" label="Email professionnel" type="email" value="" autoComplete="email" disabled={false} onChange={onChange} />);
    const field = screen.getByLabelText('Email professionnel');
    expect(field.required).toBe(true);
    expect(field.getAttribute('name')).toBe('email');
    fireEvent.change(field, { target: { value: 'agent@mairie.fr' } });
    expect(onChange).toHaveBeenCalledWith('agent@mairie.fr');
  });
});
