import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

export type AddEventDetails = {
  title: string;
  month: string;
  day: number | string;
  hebrewYear: string;
  time: 'before' | 'after';
  save?: boolean;
};

export async function addEventFromForm(user: UserEvent, details: AddEventDetails): Promise<void> {
  const {
    title,
    month,
    day,
    hebrewYear,
    time,
    save = true,
  } = details;

  const addEventHeading = screen.queryByRole('heading', { name: 'רישום אירוע חדש במעגל החיים' });
  if (!addEventHeading) {
    await user.click(screen.getByRole('button', { name: 'הוספת אירוע' }));
    await screen.findByRole('heading', { name: 'רישום אירוע חדש במעגל החיים' });
  }

  const titleInput = screen.getByPlaceholderText('לדוגמה: אברהם בן תרח');
  await user.clear(titleInput);
  await user.type(titleInput, title);

  const [monthSelectRaw, daySelect, timeSelect] = screen.getAllByRole('combobox');
  const monthSelect = monthSelectRaw as HTMLSelectElement;
  const normalizeText = (value: string) => value
    .normalize('NFKC')
    .replace(/[\u200e\u200f]/g, '')
    .trim();
  const normalizedMonth = normalizeText(month);
  const monthOptions = Array.from(monthSelect.options) as HTMLOptionElement[];
  const matchedMonthOption = monthOptions.find((option) => {
    const value = normalizeText(option.value);
    const text = normalizeText(option.textContent || '');
    return value === normalizedMonth || text === normalizedMonth;
  });
  if (!matchedMonthOption) {
    throw new Error(`Month option not found for: ${month}`);
  }

  await user.selectOptions(monthSelect, matchedMonthOption.value);
  await user.selectOptions(daySelect, String(day));

  const yearInput = screen.getByTestId('add-event-hebrew-year');
  await user.clear(yearInput);
  await user.type(yearInput, hebrewYear);

  await user.selectOptions(timeSelect, time);

  if (save) {
    await user.click(screen.getByRole('button', { name: 'שמירת אירוע' }));
  }
}

export async function openDashboard(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'לוח בקרה' }));
  await screen.findByTestId('dashboard-mini-calendar');
}

export async function goToMiniCalendarMonth(user: UserEvent, targetDate: Date): Promise<void> {
  const targetMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const now = new Date();
  const monthDiff = (targetMonth.getFullYear() - now.getFullYear()) * 12 + (targetMonth.getMonth() - now.getMonth());

  const monthNavButton = monthDiff >= 0
    ? await screen.findByTestId('mini-calendar-next-month')
    : await screen.findByTestId('mini-calendar-prev-month');

  for (let i = 0; i < Math.abs(monthDiff); i += 1) {
    await user.click(monthNavButton);
  }
}

export function getDashboardEventCards(): HTMLElement[] {
  return screen.getAllByTestId('dashboard-event-card');
}

export function getDashboardEventDateBadge(card: HTMLElement): HTMLElement {
  return within(card).getByTestId('dashboard-event-date-badge');
}
