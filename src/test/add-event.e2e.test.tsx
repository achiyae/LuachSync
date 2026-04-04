import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('Add event e2e flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('validates preview and saved dashboard item details for א תשרי תש"פ לפני שקיעה', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'הוספת אירוע' }));

    await screen.findByRole('heading', { name: 'רישום אירוע חדש במעגל החיים' });

    const titleInput = screen.getByPlaceholderText('לדוגמה: אברהם בן תרח');
    await user.clear(titleInput);
    await user.type(titleInput, 'ישראל ישראלי');

    const [monthSelect, daySelect, timeSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(monthSelect, 'תשרי');
    await user.selectOptions(daySelect, '1');

    const yearInput = screen.getByPlaceholderText('תשפ״ו');
    await user.clear(yearInput);
    await user.type(yearInput, 'תש"פ');

    await user.selectOptions(timeSelect, 'before');

    expect(screen.getByText('סיכום תצוגה מקדימה')).toBeInTheDocument();
    expect(screen.getByText('תאריך לועזי מחושב: 30 ספטמבר 2019')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'שמירת אירוע' }));

    await user.click(screen.getByRole('button', { name: 'לוח בקרה' }));

    const eventTitle = await screen.findByText('ישראל ישראלי');
    const eventCard = eventTitle.closest('div.group');

    expect(eventCard).not.toBeNull();

    const card = eventCard as HTMLElement;
    expect(within(card).getByText('ישראל ישראלי')).toBeInTheDocument();
    expect(within(card).getAllByText('יום הולדת')).toHaveLength(2);
    expect(within(card).getByText('תאריך מקורי:')).toBeInTheDocument();
    expect(card.textContent).toMatch(/תאריך מקורי:\s*א.?\s*תשרי\s*תש.?פ/);

    const originalDateTags = screen.getAllByText('תאריך מקורי:');
    expect(originalDateTags).toHaveLength(1);

    const dateBadge = card.querySelector('div.w-20.h-20');
    expect(dateBadge).not.toBeNull();

    const badge = dateBadge as HTMLElement;
    expect(within(badge).getByText('יום הולדת')).toBeInTheDocument();
    expect(within(badge).getByText('תשרי')).toBeInTheDocument();
    expect(within(badge).getByText(/א.?/)).toBeInTheDocument();

    const allEventCards = document.querySelectorAll('div.group.p-6.rounded-xl');
    expect(allEventCards).toHaveLength(1);
  });
});