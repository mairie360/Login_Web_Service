import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BackupCodes } from './index';

const CODES = ['YOQM-3Y5S', '2ZXN-64EK'];

describe('BackupCodes', () => {
  it('shows the codes, the warning and the box', () => {
    render(<BackupCodes codes={CODES} acknowledged={false} onAcknowledgedChange={vi.fn()} error="" onFinish={vi.fn()} />);
    expect(screen.getByText('ÉTAPE 2 SUR 2')).toBeTruthy();
    expect(screen.getByText('Ces codes ne seront plus affichés.')).toBeTruthy();
    expect(screen.getByText('YOQM-3Y5S')).toBeTruthy();
  });
  it('reports the box and the error, and finishes on submit', () => {
    const onAcknowledgedChange = vi.fn();
    const onFinish = vi.fn((event) => event.preventDefault());
    render(<BackupCodes codes={CODES} acknowledged={false} onAcknowledgedChange={onAcknowledgedChange} error="Confirmez que vous avez enregistré vos codes." onFinish={onFinish} />);
    expect(screen.getByText('Confirmez que vous avez enregistré vos codes.')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('J’ai enregistré mes codes de secours en lieu sûr.'));
    fireEvent.click(screen.getByRole('button', { name: 'Terminer' }));
    expect(onAcknowledgedChange).toHaveBeenCalledWith(true);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
