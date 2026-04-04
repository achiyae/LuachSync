import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { addEventFromForm, getDashboardEventCards, getDashboardEventDateBadge, openDashboard } from './e2e-helpers';

describe('Add event e2e flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('validates preview and saved dashboard item details for א תשרי תש"פ לפני שקיעה', async () => {
    const user = userEvent.setup();

    render(<App />);

    await addEventFromForm(user, {
      title: 'ישראל ישראלי',
      month: 'תשרי',
      day: 1,
      hebrewYear: 'תש"פ',
      time: 'before',
      save: false,
    });

    expect(screen.getByText('סיכום תצוגה מקדימה')).toBeInTheDocument();
    expect(screen.getByText('תאריך לועזי מחושב: 30 ספטמבר 2019')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'שמירת אירוע' }));

    await openDashboard(user);

    await screen.findByText('ישראל ישראלי');

    const allEventCards = getDashboardEventCards();
    expect(allEventCards).toHaveLength(1);

    const card = allEventCards[0];
    expect(within(card).getByText('ישראל ישראלי')).toBeInTheDocument();
    expect(within(card).getAllByText('יום הולדת')).toHaveLength(2);
    expect(within(card).getByText('תאריך מקורי:')).toBeInTheDocument();
    expect(card.textContent).toMatch(/תאריך מקורי:\s*א.?\s*תשרי\s*תש.?פ/);

    const originalDateTags = screen.getAllByText('תאריך מקורי:');
    expect(originalDateTags).toHaveLength(1);

    const badge = getDashboardEventDateBadge(card);
    expect(within(badge).getByText('יום הולדת')).toBeInTheDocument();
    expect(within(badge).getByText('תשרי')).toBeInTheDocument();
    expect(within(badge).getByText(/א.?/)).toBeInTheDocument();
  });
});