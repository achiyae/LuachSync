import React, { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

vi.mock('../views/ImportExportView', () => {
  const MockImportExportView = ({ onSyncingStateChange }: { onSyncingStateChange?: (isSyncing: boolean) => void }) => {
    useEffect(() => {
      onSyncingStateChange?.(true);
      return () => onSyncingStateChange?.(false);
    }, [onSyncingStateChange]);

    return <div>Mock syncing import/export view</div>;
  };

  return { default: MockImportExportView };
});

describe('App sync navigation guard', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('blocks leaving import/export tab when sync is active and user cancels confirmation', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'ייצוא וייבוא' }));
    await screen.findByText('Mock syncing import/export view');

    await user.click(screen.getByRole('button', { name: 'לוח שנה' }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'ייצוא וייבוא' })).toBeInTheDocument();
    expect(screen.getByText('Mock syncing import/export view')).toBeInTheDocument();
  });

  it('allows leaving import/export tab when sync is active and user confirms', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'ייצוא וייבוא' }));
    await screen.findByText('Mock syncing import/export view');

    await user.click(screen.getByRole('button', { name: 'לוח שנה' }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'לוח שנה' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Mock syncing import/export view')).not.toBeInTheDocument();
    });
  });
});
