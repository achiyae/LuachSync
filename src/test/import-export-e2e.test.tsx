import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('Import/export e2e flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('uses export default reminder for one event and keeps override for another in ICS preview', async () => {
    const user = userEvent.setup();

    window.localStorage.setItem('hc4gc.appState.v1', JSON.stringify({
      events: [
        {
          id: 'event-1',
          title: 'ישראל ישראלי',
          type: 'birthday',
          hebrewDate: {
            day: 1,
            month: 'תשרי',
            year: 5780,
            afterSunset: false,
          },
        },
        {
          id: 'event-2',
          title: 'משה לוי',
          type: 'birthday',
          hebrewDate: {
            day: 1,
            month: 'חשוון',
            year: 5780,
            afterSunset: false,
          },
          reminderOverride: 'both',
        },
      ],
      exportSettings: {
        selectedSchema: 'ics',
        reminderMode: 'none',
        selectedEventTypes: [],
      },
    }));

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'ייצוא וייבוא' }));
    await screen.findByRole('heading', { name: 'ייצוא וייבוא נתוני לוח שנה' });

    await user.click(screen.getByRole('button', { name: /^שבוע לפני/ }));
    await user.click(screen.getByRole('button', { name: /תצוגה מקדימה של ICS/i }));

    const previewText = screen.getByText((content, element) => (
      element?.tagName.toLowerCase() === 'code' && content.includes('BEGIN:VCALENDAR')
    )).textContent;

    expect(previewText).toContain('SUMMARY:ישראל ישראלי');
    expect(previewText).toContain('SUMMARY:משה לוי');
    expect(previewText).toMatch(/SUMMARY:ישראל ישראלי[\s\S]*?X-EFFECTIVE-REMINDER-MODE:week-before/);
    expect(previewText).toMatch(/SUMMARY:משה לוי[\s\S]*?X-EFFECTIVE-REMINDER-MODE:both/);
  });
});
