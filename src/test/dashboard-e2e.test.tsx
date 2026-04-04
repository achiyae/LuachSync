import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { addEventFromForm, goToMiniCalendarMonth, openDashboard } from './e2e-helpers';

describe('Dashboard e2e flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows dot only on 12 September 2026 and updates daily view title after click', async () => {
    const user = userEvent.setup();

    render(<App />);

    await addEventFromForm(user, {
      title: 'ישראל ישראלי',
      month: 'תשרי',
      day: 1,
      hebrewYear: 'תש"פ',
      time: 'before',
    });

    await openDashboard(user);
    await goToMiniCalendarMonth(user, new Date(2026, 8, 1));

    const miniMonth = await screen.findByTestId('dashboard-mini-calendar-month');
    expect(miniMonth).toHaveTextContent('ספטמבר 2026');

    const day12 = screen.getByTestId('mini-calendar-day-2026-09-12');
    expect(within(day12).getByTestId('mini-calendar-day-dot')).toBeInTheDocument();
    expect(screen.getAllByTestId('mini-calendar-day-dot')).toHaveLength(1);

    await user.click(day12);

    expect(screen.getByTestId('dashboard-daily-hebrew-date')).toHaveTextContent('א׳ תִּשְׁרֵי תשפ״ז');
  });
});
