/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, FormEvent, useRef } from 'react';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  PlusCircle, 
  ArrowLeftRight, 
  Settings, 
  HelpCircle, 
  Search, 
  Bell, 
  ChevronRight, 
  ChevronLeft,
  Menu,
  MoreVertical,
  Cake,
  Heart,
  Flame,
  Star,
  Info,
  Lightbulb,
  Download,
  UploadCloud,
  Copy,
  BookOpen,
  Sparkles,
  Check,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HDate, Zmanim, Location, HebrewCalendar, getSedra, gematriya, gematriyaStrToNum, flags } from '@hebcal/core';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addDays, getDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from './lib/utils';
import { CalendarEvent, EventType, ReminderMode } from './types';

// --- Helpers ---
const hebrewMonthsMap: Record<string, string> = {
    'Nisan': 'ניסן', 'Iyyar': 'אייר', 'Sivan': 'סיוון', 'Tamuz': 'תמוז', 'Av': 'אב', 'Elul': 'אלול',
    'Tishrei': 'תשרי', 'Cheshvan': 'חשוון', 'Heshvan': 'חשוון', 'Kislev': 'כסלו', 'Tevet': 'טבת', 
    'Shvat': 'שבט', "Sh'vat": 'שבט', 'Adar 1': 'אדר א׳', 'Adar I': 'אדר א׳', 'Adar 2': 'אדר ב׳', 'Adar II': 'אדר ב׳', 'Adar': 'אדר'
};

const hebrewMonthsRev: Record<string, string> = {
  'Nisan': 'ניסן', 'Iyyar': 'אייר', 'Sivan': 'סיוון', 'Tamuz': 'תמוז', 'Av': 'אב', 'Elul': 'אלול',
  'Tishrei': 'תשרי', 'Cheshvan': 'חשוון', 'Heshvan': 'חשוון', 'Kislev': 'כסלו', 'Tevet': 'טבת',
  'Shvat': 'שבט', "Sh'vat": 'שבט', 'Adar 1': 'אדר א׳', 'Adar I': 'אדר א׳', 'Adar 2': 'אדר ב׳', 'Adar II': 'אדר ב׳', 'Adar': 'אדר'
};

type ReminderRule = { id: string; label: string; trigger: string; time?: string };

type ExportSettingsState = {
  selectedSchema: 'ics';
  reminderMode: Exclude<ReminderMode, 'use-export-default'>;
  selectedEventTypes: string[];
};

type PersistedAppState = {
  events: CalendarEvent[];
  exportSettings: ExportSettingsState;
};

type ImportPayload = {
  events: CalendarEvent[];
  exportSettings?: ExportSettingsState;
};

const DEFAULT_EXPORT_SETTINGS: ExportSettingsState = {
  selectedSchema: 'ics',
  reminderMode: 'none',
  selectedEventTypes: []
};

const REMINDER_MODE_OPTIONS: Array<{ id: ReminderMode; label: string; desc: string }> = [
  { id: 'use-export-default', label: 'השתמש בהגדרת הייצוא', desc: 'האירוע ישתמש בתזכורות שתוגדרנה במסך הייצוא.' },
  { id: 'none', label: 'ללא תזכורות', desc: 'האירוע הזה ייוצא ללא תזכורות, גם אם בייצוא מוגדר אחרת.' },
  { id: 'day-before', label: 'יום לפני בשעה 19:00', desc: 'עוקף את ברירת המחדל של הייצוא עבור האירוע הזה בלבד.' },
  { id: 'week-before', label: 'שבוע לפני', desc: 'עוקף את ברירת המחדל של הייצוא עבור האירוע הזה בלבד.' },
  { id: 'both', label: 'גם שבוע לפני וגם יום לפני ב-19:00', desc: 'עוקף את ברירת המחדל של הייצוא עבור האירוע הזה בלבד.' }
];

const buildReminderRules = (mode: ReminderMode): ReminderRule[] => {
  switch (mode) {
    case 'day-before':
      return [{ id: 'day_before_19', label: 'יום לפני בשעה 19:00', trigger: '-P1D', time: '19:00' }];
    case 'week-before':
      return [{ id: 'week_before', label: 'שבוע לפני', trigger: '-P7D' }];
    case 'both':
      return [
        { id: 'day_before_19', label: 'יום לפני בשעה 19:00', trigger: '-P1D', time: '19:00' },
        { id: 'week_before', label: 'שבוע לפני', trigger: '-P7D' }
      ];
    default:
      return [];
  }
};

const getEventTypeLabel = (type: string) => {
  if (type === 'yahrzeit') return 'אזכרות';
  if (type === 'birthday') return 'ימי הולדת';
  if (type === 'anniversary') return 'ימי נישואין';
  return type;
};

const getEventTypeSyncLabel = (type: string) => {
  if (type === 'yahrzeit') return 'אזכרה';
  if (type === 'birthday') return 'יום הולדת';
  if (type === 'anniversary') return 'יום נישואין';
  return type;
};

const escapeIcsText = (value: string) => value
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n');

const normalizeImportedUid = (uid: string) => uid.replace(/(?:@hc4gc-source)+$/, '');

const normalizeExportBaseId = (id: string) => id.replace(/(?:@hc4gc-source)+$/, '');

const getHebrewMonthSpan = (date: Date) => {
    const startH = new HDate(startOfMonth(date));
    const endH = new HDate(endOfMonth(date));
    const startHStr = hebrewMonthsMap[startH.getMonthName()] || startH.getMonthName();
    const endHStr = hebrewMonthsMap[endH.getMonthName()] || endH.getMonthName();
    const startYStr = gematriya(startH.getFullYear());
    const endYStr = gematriya(endH.getFullYear());
    
    if (startHStr === endHStr) {
      return `${startHStr} ${startYStr}`;
    }
    if (startYStr === endYStr) {
      return `${startHStr}-${endHStr} ${startYStr}`;
    }
    return `${startHStr} ${startYStr} - ${endHStr} ${endYStr}`;
};

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab, isCollapsed, onToggleCollapse, isMobileMenuOpen, onCloseMobileMenu }: {
  activeTab: string,
  setActiveTab: (tab: string) => void,
  isCollapsed: boolean,
  onToggleCollapse: () => void,
  isMobileMenuOpen: boolean,
  onCloseMobileMenu: () => void
}) => {
  const navItems = [
    { id: 'dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
    { id: 'calendar', label: 'לוח שנה', icon: CalendarIcon },
    { id: 'add-event', label: 'הוספת אירוע', icon: PlusCircle },
    { id: 'import-export', label: 'ייצוא וייבוא', icon: ArrowLeftRight },
  ];

  return (
    <aside className={cn(
      "h-screen fixed right-0 top-0 border-l border-slate-200 bg-slate-100 flex flex-col p-4 gap-2 z-50 overflow-y-auto transition-all duration-300 w-72 max-w-[88vw] md:max-w-none",
      isCollapsed ? "md:w-20" : "md:w-64",
      isMobileMenuOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
    )}>
      <div className="mb-8 px-2">
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between gap-3")}>
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-blue-600 flex items-center justify-center text-white">
                <BookOpen size={20} />
              </div>
              <div>
                <h2 className="font-bold text-blue-900 leading-tight">HC4GC</h2>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 opacity-70">מערכת לוח שנה עברי</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-10 h-10 rounded bg-blue-600 flex items-center justify-center text-white">
              <BookOpen size={20} />
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'הרחב תפריט' : 'כווץ תפריט'}
            aria-label={isCollapsed ? 'הרחב תפריט' : 'כווץ תפריט'}
            className="hidden md:inline-flex p-2 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-slate-200 transition-colors"
          >
            {isCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
          <button
            onClick={onCloseMobileMenu}
            title="סגור תפריט"
            aria-label="סגור תפריט"
            className="md:hidden inline-flex p-2 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-slate-200 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              onCloseMobileMenu();
            }}
            title={isCollapsed ? item.label : undefined}
            className={cn(
              "flex items-center px-3 py-2 rounded-lg transition-all duration-200 ease-in-out text-right",
              isCollapsed ? "justify-center" : "gap-3",
              activeTab === item.id 
                ? "bg-white text-blue-700 font-bold shadow-sm" 
                : "text-slate-600 hover:text-blue-600 hover:bg-slate-200"
            )}
          >
            <item.icon size={18} />
            {!isCollapsed && <span className="text-sm tracking-wide">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-200 pt-4 flex flex-col gap-1">
        <button
          title="תמיכה"
          className={cn(
            "flex items-center px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-slate-200 rounded-lg transition-all text-right w-full",
            isCollapsed ? "justify-center" : "gap-3"
          )}
        >
          <HelpCircle size={18} />
          {!isCollapsed && <span className="text-sm tracking-wide">תמיכה</span>}
        </button>
      </div>
    </aside>
  );
};

const TopBar = ({ title, onOpenMobileMenu }: { title: string, onOpenMobileMenu: () => void }) => {
  return (
    <header className="w-full sticky top-0 z-40 bg-slate-50 flex justify-between items-center px-4 sm:px-6 py-3 border-b border-slate-200/50">
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg hover:bg-slate-200/70 transition-colors text-slate-600"
          aria-label="פתח תפריט"
          title="פתח תפריט"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-blue-900">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full hover:bg-slate-200/50 transition-colors text-slate-500">
          <HelpCircle size={20} />
        </button>
        <img 
          alt="Profile" 
          className="w-8 h-8 rounded-full border border-slate-200"
          src="https://picsum.photos/seed/user123/100/100"
        />
      </div>
    </header>
  );
};

// --- Views ---

const DashboardView = ({ events, onAddClick, onEdit, onDelete, onClearAll }: { events: CalendarEvent[], onAddClick: () => void, onEdit: (e: CalendarEvent) => void, onDelete: (id: string) => void, onClearAll: () => void }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const hDate = new HDate(selectedDate);
  
  const [filterType, setFilterType] = useState<string | null>(null);
  const uniqueTypes = useMemo(() => Array.from(new Set(events.map(e => e.type))), [events]);
  const filteredEvents = useMemo(() => {
    let result = events;
    if (filterType) result = result.filter(e => e.type === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => 
        e.title.toLowerCase().includes(q) || 
        e.type.toLowerCase().includes(q) ||
        (e.hebrewDate && e.hebrewDate.month.toLowerCase().includes(q)) ||
        (e.hebrewDate && gematriya(e.hebrewDate.day).includes(q))
      );
    }
    return result;
  }, [events, filterType, searchQuery]);

  const upcomingEvents = useMemo(() => {
    const fromYear = hDate.getFullYear();
    const fromAbs = hDate.abs();

    const mapped = filteredEvents.map(event => {
      // @ts-ignore
      let nextOccur = new HDate(event.hebrewDate.day, event.hebrewDate.month, fromYear);
      let abs = nextOccur.abs();
      if (abs < fromAbs) {
        // @ts-ignore
        nextOccur = new HDate(event.hebrewDate.day, event.hebrewDate.month, fromYear + 1);
        abs = nextOccur.abs();
      }
      return { ...event, nextOccur };
    });
    
    mapped.sort((a, b) => a.nextOccur.abs() - b.nextOccur.abs());
    return mapped;
  }, [filteredEvents, hDate]);

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const calendarDays = useMemo(() => eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) }), [calendarMonth]);
  const monthHDate = new HDate(calendarMonth);

  const [locationState, setLocationState] = useState<{ lat: number, long: number, tz: string, name: string }>({ lat: 31.7683, long: 35.2137, tz: 'Asia/Jerusalem', name: 'Jerusalem' });
  const [isEditingLoc, setIsEditingLoc] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // @ts-ignore (hebcal core might not have exact types listed locally, but we rely on execution outputs)
    const loc: any = Location.lookup(locationQuery);
    if (loc && loc.latitude) {
        setLocationState({ lat: loc.latitude, long: loc.longitude, tz: loc.timeZoneId || 'Asia/Jerusalem', name: loc.locationName });
    } else {
        alert('מיקום לא נמצא במאגר (נסה באנגלית, כגון "Tel Aviv").');
    }
    setIsEditingLoc(false);
  };

  const getLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=he`);
                const data = await res.json();
                const city = data.address?.city || data.address?.town || data.address?.village || 'מיקום מותאם אישית';
                setLocationState({ lat: pos.coords.latitude, long: pos.coords.longitude, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, name: city });
            } catch {
                setLocationState({ lat: pos.coords.latitude, long: pos.coords.longitude, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, name: 'מיקום מותאם אישית' });
            }
        });
    } else {
        alert("שירותי מיקום לא נתמכים בדפדפן זה");
    }
  };

  const shabbatZmanim = useMemo(() => {
    const sun = addDays(selectedDate, -getDay(selectedDate));
    const sat = addDays(selectedDate, 6 - getDay(selectedDate));
    const loc = new Location(locationState.lat, locationState.long, true, locationState.tz, locationState.name, 'IL');
    const options = {
      start: sun,
      end: sat,
      candlelighting: true,
      location: loc,
      il: true,
    };
    const evs = HebrewCalendar.calendar(options);
    const formatTimeStr = (d: Date | undefined) => d ? format(d, 'HH:mm') : '--:--';
    
    let candle = '--:--';
    let havdalah = '--:--';
    
    for (const ev of evs) {
      const desc = ev.getDesc();
      if (desc === 'Candle lighting') {
        // @ts-ignore
        candle = formatTimeStr(ev.eventTime);
      } else if (desc === 'Havdalah') {
        // @ts-ignore
        havdalah = formatTimeStr(ev.eventTime);
      }
    }
    return { candle, havdalah };
  }, [selectedDate, locationState]);

  const zmanim = useMemo(() => {
    const loc = new Location(locationState.lat, locationState.long, true, locationState.tz, locationState.name, 'IL');
    const z = new Zmanim(loc, selectedDate, false);
    const formatTime = (d: Date | null) => d ? format(d, 'HH:mm') : '--:--';
    return {
      alotHaShachar: formatTime(z.alotHaShachar()),
      netzHaChama: formatTime(z.neitzHaChama()),
      sofZmanKriasShema: formatTime(z.sofZmanShmaMGA()),
      chatzos: formatTime(z.chatzot()),
      shkiya: formatTime(z.shkiah()),
      candleLighting: shabbatZmanim.candle,
      havdalah: shabbatZmanim.havdalah
    };
  }, [selectedDate, locationState, shabbatZmanim]);

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1 font-semibold">השקפה יומית</p>
          <h2 className="text-4xl font-bold text-slate-900">{hDate.renderGematriya()}</h2>
          <p className="text-slate-500 font-medium">
            {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: he })} • פרשת {getSedra(hDate.getFullYear(), false).lookup(hDate)?.parsha?.join('-') || 'אין פרשה'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClearAll}
            className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg font-semibold text-sm shadow-sm flex items-center gap-2 hover:bg-red-50 active:scale-95 transition-all"
          >
            ניקוי רשימה
          </button>
          <button 
            onClick={onAddClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm shadow-sm flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus size={16} />
            אירוע חדש
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative w-full max-w-3xl">
          <Search className="absolute right-4 top-3.5 text-slate-400" size={18} />
          <input 
            className="w-full bg-white border border-slate-200 shadow-sm rounded-xl py-3 pr-12 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all text-right"
            dir="rtl"
            placeholder="חיפוש אירועים, תאריכים או שמות..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide max-w-full">
          <button 
            onClick={() => setFilterType(null)}
            className={cn("px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors", filterType === null ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-700 hover:bg-slate-300")}
          >כל האירועים</button>
          {uniqueTypes.map(t => (
            <button 
              key={t}
              onClick={() => setFilterType(t)}
              className={cn("px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors", filterType === t ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-700 hover:bg-slate-300")}
            >
              {t === 'yahrzeit' ? 'אזכרות' : t === 'birthday' ? 'ימי הולדת' : t === 'anniversary' ? 'ימי נישואין' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <h3 className="text-xs uppercase tracking-[0.15em] text-slate-500 font-bold">אזכרות ושמחות קרובות</h3>
          <div className="space-y-4">
            {upcomingEvents.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                אין אירועים קרובים תחת המסנן הזה.
              </div>
            ) : (
              upcomingEvents.map((event) => {
                const isToday = event.nextOccur.abs() === hDate.abs();
                const hasReminderOverride = event.reminderOverride && event.reminderOverride !== 'use-export-default';
                const overrideLabel = event.reminderOverride === 'day-before'
                  ? 'יום לפני בשעה 19:00'
                  : event.reminderOverride === 'week-before'
                    ? 'שבוע לפני'
                    : event.reminderOverride === 'both'
                      ? 'גם שבוע לפני וגם יום לפני ב-19:00'
                      : 'ללא תזכורות';
                const monthName = event.nextOccur.getMonthName();
                const monthLabel = hebrewMonthsRev[monthName] || event.nextOccur.getMonthName('h') || monthName;
                return (
                <div key={event.id} className={cn("group p-6 rounded-xl transition-all flex items-start gap-6 border shadow-sm", isToday ? "bg-blue-50 border-blue-200" : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200")}>
                  <div className={cn(
                    "flex flex-col items-center justify-center w-20 h-20 rounded-lg shrink-0",
                    event.type === 'yahrzeit' ? "bg-purple-100 text-purple-800" : 
                    event.type === 'birthday' ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"
                  )}>
                    <span className="text-[10px] font-bold leading-none">{event.type === 'yahrzeit' ? 'אזכרה' : event.type === 'birthday' ? 'יום הולדת' : event.type === 'anniversary' ? 'יום נישואין' : event.type}</span>
                    <span className="text-[10px] font-semibold mt-1 leading-none">{monthLabel}</span>
                    <span className="text-2xl font-extrabold mt-1 leading-none">{gematriya(event.nextOccur.getDate()) || event.hebrewDate.day}</span>
                  </div>
                  <div className="flex-1 text-right">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold uppercase rounded tracking-wider",
                          event.type === 'yahrzeit' ? "bg-purple-200 text-purple-900" : 
                          event.type === 'birthday' ? "bg-orange-200 text-orange-900" : "bg-blue-200 text-blue-900"
                        )}>
                          {event.type === 'yahrzeit' ? 'אזכרה' : event.type === 'birthday' ? 'יום הולדת' : event.type === 'anniversary' ? 'יום נישואין' : event.type}
                        </span>
                        {hasReminderOverride && (
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700"
                            title={`עקיפת תזכורות: ${overrideLabel}`}
                            aria-label={`עקיפת תזכורות: ${overrideLabel}`}
                          >
                            <Bell size={13} />
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-medium">{gematriya(event.nextOccur.getDate())} {monthLabel} {gematriya(event.nextOccur.getFullYear() % 1000)}</span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">{event.title}</h4>
                  </div>
                  <div className="shrink-0 relative">
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === event.id ? null : event.id)}
                      onBlur={() => setTimeout(() => setOpenMenuId(null), 150)}
                      className="p-2 text-slate-300 hover:text-blue-600 transition-colors focus:text-blue-600 focus:bg-slate-100 rounded-lg">
                      <MoreVertical size={18} />
                    </button>
                    {openMenuId === event.id && (
                      <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg py-1 w-32 z-10">
                        <button onMouseDown={() => { onEdit(event); setOpenMenuId(null); }} className="w-full text-right px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 font-medium">עריכה</button>
                        <button onMouseDown={() => { onDelete(event.id); setOpenMenuId(null); }} className="w-full text-right px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-medium">מחיקה</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-blue-50 p-6 rounded-xl space-y-4 border border-blue-100">
            <div className="flex justify-between items-center">
              <div className="flex gap-1 bg-blue-100/50 p-1 rounded-lg">
                <button onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="p-1 hover:bg-white rounded-md transition-colors text-slate-500 hover:text-blue-600 shadow-sm">
                  <ChevronRight size={16} />
                </button>
                <button onClick={() => { setCalendarMonth(new Date()); setSelectedDate(new Date()); }} className="px-2 py-1 font-bold text-[11px] hover:bg-white rounded-md transition-colors text-slate-500 hover:text-blue-600 shadow-sm">
                  היום
                </button>
                <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-1 hover:bg-white rounded-md transition-colors text-slate-500 hover:text-blue-600 shadow-sm">
                  <ChevronLeft size={16} />
                </button>
              </div>
              <h4 className="font-bold text-blue-900" dir="ltr">{format(calendarMonth, 'MMMM yyyy', { locale: he })} / {getHebrewMonthSpan(calendarMonth)}</h4>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center" dir="rtl">
              {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(day => (
                <span key={day} className="text-[10px] font-bold text-slate-400">{day}</span>
              ))}
              {Array.from({ length: startOfMonth(calendarMonth).getDay() }).map((_, i) => (
                <span key={`empty-${i}`}></span>
              ))}
              {calendarDays.map((date, i) => {
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                const dayHDate = new HDate(date);
                const hasEvent = events.some(e => {
                  try {
                    const temp = new HDate(e.hebrewDate.day, e.hebrewDate.month as any, dayHDate.getFullYear());
                    return temp.getMonth() === dayHDate.getMonth() && temp.getDate() === dayHDate.getDate();
                  } catch {
                    return false;
                  }
                });
                
                return (
                  <button 
                    key={i} 
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "text-xs py-1 rounded-full cursor-pointer hover:bg-blue-200 transition-colors relative flex flex-col items-center justify-center h-8 w-8 mx-auto",
                      isSelected ? "bg-blue-600 text-white font-bold shadow-sm" : isToday ? "text-blue-600 font-bold" : "text-slate-700"
                    )}
                  >
                    <span className="leading-none">{format(date, 'd')}</span>
                    {hasEvent && (
                      <span className={cn("absolute bottom-1 w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-blue-600")} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            {isEditingLoc ? (
              <form onSubmit={handleLocationSubmit} className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="למשל: Tel Aviv" 
                  className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 bg-slate-50 text-slate-700"
                  autoFocus
                />
                <button type="submit" className="text-[10px] bg-blue-600 text-white px-2 rounded hover:bg-blue-700 font-bold">אישור</button>
                <button type="button" onClick={() => setIsEditingLoc(false)} className="text-[10px] bg-slate-200 text-slate-700 px-2 rounded hover:bg-slate-300 font-bold">בטל</button>
              </form>
            ) : (
              <div className="flex justify-between items-start mb-4 gap-2">
                <h4 className="text-[11px] uppercase tracking-[0.1em] text-slate-500 font-bold truncate leading-relaxed" title={locationState.name}>
                  זמני היום <br/>
                  <button onClick={() => setIsEditingLoc(true)} className="text-blue-600 hover:underline">{locationState.name}</button>
                </h4>
                <button onClick={getLocation} type="button" className="text-[10px] text-blue-600 font-bold hover:underline shrink-0 bg-blue-50 px-2 py-1 rounded">איתור מיקום שלי</button>
              </div>
            )}
            <div className="space-y-3">
              {[
                { label: 'עלות השחר', value: zmanim.alotHaShachar },
                { label: 'נץ החמה', value: zmanim.netzHaChama },
                { label: 'סוף זמן קריאת שמע', value: zmanim.sofZmanKriasShema },
                { label: 'חצות היום', value: zmanim.chatzos },
                { label: 'שקיעת החמה', value: zmanim.shkiya },
                { label: 'כניסת שבת', value: zmanim.candleLighting },
                { label: 'צאת שבת', value: zmanim.havdalah },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  <span className="text-sm font-bold text-blue-600" dir="ltr">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddEventView = ({ events, initialData, onSave, onCancel }: { events: CalendarEvent[], initialData?: CalendarEvent | null, onSave: (e: CalendarEvent) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    type: (initialData?.type || 'birthday') as EventType,
    customType: '',
    dateMode: 'hebrew' as 'hebrew' | 'gregorian',
    day: initialData?.hebrewDate.day || 1,
    month: initialData?.hebrewDate.month || 'ניסן',
    yearStr: initialData?.hebrewDate.year ? gematriya(initialData.hebrewDate.year) : (gematriya(5786) || 'תשפ״ו'),
    gregorianDate: format(new Date(), 'yyyy-MM-dd'),
    afterSunset: initialData?.hebrewDate.afterSunset || false,
    reminderOverride: (initialData?.reminderOverride || 'use-export-default') as ReminderMode
  });

  const months = [
    'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב׳', 'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול'
  ];

  const uniqueCustomTypes = useMemo(() => {
    return Array.from(new Set(events.map(e => e.type).filter(t => !['birthday', 'anniversary', 'yahrzeit'].includes(t))));
  }, [events]);
  
  const previewDate = useMemo(() => {
    if (formData.dateMode === 'hebrew') {
        try {
            const cleanYearStr = formData.yearStr.replace(/^ה['״"]?(?=[א-ת])/g, '');
            let y = gematriyaStrToNum(cleanYearStr);
            if (y < 3000) y += 5000;
            const monthMap: Record<string, string> = {
                'ניסן': 'Nisan', 'אייר': 'Iyyar', 'סיוון': 'Sivan', 'תמוז': 'Tamuz', 'אב': 'Av', 'אלול': 'Elul',
                'תשרי': 'Tishrei', 'חשוון': 'Cheshvan', 'כסלו': 'Kislev', 'טבת': 'Tevet', 'שבט': 'Shvat', 'אדר': 'Adar 1', 'אדר ב׳': 'Adar 2'
            };
            const hd = new HDate(formData.day, monthMap[formData.month] || 'Nisan', y);
            const targetHd = formData.afterSunset ? hd.prev() : hd;
            const gregDate = targetHd.greg();
            return {
                title: 'תאריך לועזי מחושב',
                value: format(gregDate, 'd MMMM yyyy', { locale: he }),
                sedra: getSedra(y, true).lookup(hd)?.parsha?.join('-') || 'אין פרשה',
                hd: hd,
                previewDayStr: gematriya(formData.day),
                previewMonthStr: formData.month
            };
        } catch {
            return { title: 'תאריך לועזי מחושב', value: 'תאריך לא חוקי', sedra: '', hd: null, previewDayStr: '', previewMonthStr: '' };
        }
    } else {
        try {
            const [y, m, d] = formData.gregorianDate.split('-').map(Number);
            let hd = new HDate(new Date(y, m - 1, d));
            if (formData.afterSunset) hd = hd.next();
            
            return {
                title: 'תאריך עברי מחושב',
                value: `${gematriya(hd.getDate())} ב${hebrewMonthsRev[hd.getMonthName()] || hd.getMonthName()} ${gematriya(hd.getFullYear())}`,
                sedra: getSedra(hd.getFullYear(), true).lookup(hd)?.parsha?.join('-') || 'אין פרשה',
                hd: hd,
                previewDayStr: gematriya(hd.getDate()),
                previewMonthStr: hebrewMonthsRev[hd.getMonthName()] || hd.getMonthName()
            };
        } catch {
            return { title: 'תאריך עברי מחושב', value: 'תאריך לא חוקי', sedra: '', hd: null, previewDayStr: '', previewMonthStr: '' };
        }
    }
  }, [formData.dateMode, formData.day, formData.month, formData.yearStr, formData.afterSunset, formData.gregorianDate]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    let y = 5786;
    let d = 1;
    let m = 'Nisan';
    
    if (previewDate.hd) {
        y = previewDate.hd.getFullYear();
        d = previewDate.hd.getDate();
        m = previewDate.hd.getMonthName();
    }
    
    onSave({
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      title: formData.title.trim(),
      type: formData.type === 'other' ? formData.customType.trim() : formData.type,
      hebrewDate: {
        day: d,
        month: hebrewMonthsRev[m] || 'ניסן',
        year: y,
        afterSunset: formData.afterSunset
      },
      reminderOverride: formData.reminderOverride
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-10">
        <h2 className="text-4xl font-extrabold text-slate-900 mt-1">רישום אירוע חדש במעגל החיים</h2>
        <p className="text-slate-500 mt-2 max-w-xl">סנכרן אבני דרך אישיות עם מחזור הירח והשמש העברי. חישובים אסטרונומיים מדויקים יוחלו בהתאם לבחירת האזור שלך.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
            זהות האירוע
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">סוג אירוע</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'birthday', label: 'יום הולדת', icon: Cake },
                  { id: 'anniversary', label: 'יום נישואין', icon: Heart },
                  { id: 'yahrzeit', label: 'אזכרה', icon: Flame },
                  ...uniqueCustomTypes.map(t => ({ id: t, label: t, icon: Star })),
                  { id: 'other', label: 'אחר...', icon: PlusCircle }
                ].map((type) => (
                  <label key={type.id} className="cursor-pointer">
                    <input 
                      type="radio" 
                      name="event_type" 
                      className="hidden peer" 
                      checked={formData.type === type.id}
                      onChange={() => setFormData({ ...formData, type: type.id as EventType, customType: type.id === 'other' ? '' : formData.customType })}
                    />
                    <div className="text-center py-4 border border-slate-200 rounded-lg peer-checked:bg-blue-50 peer-checked:border-blue-600 peer-checked:text-blue-700 transition-all flex flex-col items-center justify-center h-full">
                      <type.icon className="mx-auto mb-1" size={20} />
                      <span className="text-[11px] font-semibold">{type.label}</span>
                    </div>
                  </label>
                ))}
              </div>
              {formData.type === 'other' && (
                <div className="mt-2 text-right">
                  <input
                    type="text"
                    placeholder="הזן סוג אירוע מותאם אישית..."
                    className="w-full bg-slate-50 border-none rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500/20 text-sm text-right"
                    value={formData.customType}
                    onChange={(e) => setFormData({ ...formData, customType: e.target.value })}
                    required
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">שם/כותרת</label>
              <div className="relative">
                <input 
                  className="w-full bg-slate-50 border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm text-right"
                  placeholder="לדוגמה: אברהם בן תרח"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  type="text"
                  required
                />
                <Info className="absolute left-3 top-3 text-slate-400" size={16} />
              </div>
              <p className="text-[10px] text-slate-400 italic">יש לציין כותרת לאירוע או שם מלא.</p>
            </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="w-1.5 h-6 bg-slate-400 rounded-full"></span>
              בחירת תאריך
            </h3>
            <div className="flex bg-slate-100 rounded-lg p-1 text-[10px] font-bold">
              <button 
                type="button" 
                onClick={() => setFormData({ ...formData, dateMode: 'hebrew' })}
                className={cn("px-3 py-1 rounded transition-all uppercase tracking-tighter", formData.dateMode === 'hebrew' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}
              >תאריך עברי</button>
              <button 
                type="button" 
                onClick={() => setFormData({ ...formData, dateMode: 'gregorian' })}
                className={cn("px-3 py-1 rounded transition-all uppercase tracking-tighter", formData.dateMode === 'gregorian' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}
              >תאריך לועזי</button>
            </div>
          </div>
          
          {formData.dateMode === 'hebrew' ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">חודש עברי</label>
                <select 
                  className="w-full bg-slate-50 border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500/20 text-sm appearance-none text-right"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  required
                >
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">יום</label>
                <select 
                  className="w-full bg-slate-50 border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500/20 text-sm appearance-none text-right"
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: parseInt(e.target.value) })}
                  required
                >
                  {Array.from({ length: 30 }).map((_, i) => (
                    <option key={i+1} value={i+1}>{gematriya(i+1)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">שנה עברית</label>
                <input 
                  className="w-full bg-slate-50 border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500/20 text-sm text-right"
                  placeholder="תשפ״ו"
                  value={formData.yearStr}
                  onChange={(e) => setFormData({ ...formData, yearStr: e.target.value })}
                  type="text"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">זמן</label>
                 <select 
                  className="w-full bg-slate-50 border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500/20 text-sm appearance-none text-right"
                  value={formData.afterSunset ? "after" : "before"}
                  onChange={(e) => setFormData({ ...formData, afterSunset: e.target.value === "after" })}
                  required
                >
                  <option value="before">לפני השקיעה</option>
                  <option value="after">אחרי השקיעה</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">תאריך לועזי</label>
                <input 
                  type="date"
                  className="w-full bg-slate-50 border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500/20 text-sm text-right"
                  value={formData.gregorianDate}
                  onChange={(e) => setFormData({ ...formData, gregorianDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">זמן רלוונטי</label>
                 <select 
                  className="w-full bg-slate-50 border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500/20 text-sm appearance-none text-right"
                  value={formData.afterSunset ? "after" : "before"}
                  onChange={(e) => setFormData({ ...formData, afterSunset: e.target.value === "after" })}
                  required
                >
                  <option value="before">לפני השקיעה</option>
                  <option value="after">אחרי השקיעה (הופך ליום העברי הבא)</option>
                </select>
              </div>
            </div>
          )}
        </section>

        <section className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="text-blue-600" size={20} />
            <div>
              <h3 className="text-lg font-bold text-slate-900">עקיפת תזכורות לאירוע</h3>
              <p className="text-xs text-slate-500 mt-1">הגדרה כאן תגבר על הגדרת התזכורות הגלובלית במסך הייצוא, עבור האירוע הזה בלבד.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {REMINDER_MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFormData({ ...formData, reminderOverride: option.id })}
                className={cn(
                  "text-right p-4 rounded-xl border transition-colors",
                  formData.reminderOverride === option.id ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <span className="block text-sm font-bold text-slate-900">{option.label}</span>
                <span className="block text-[11px] text-slate-500 mt-1 leading-relaxed">{option.desc}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-900 leading-relaxed">
            <strong className="font-bold">שים לב:</strong> הגדרת "השתמש בהגדרת הייצוא" תחיל את בחירת התזכורות הגלובלית מדף הייצוא. כל בחירה אחרת כאן תגבר עליה.
          </div>
        </section>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-slate-50 p-6 rounded-xl border border-slate-200 flex items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 leading-none">{previewDate.previewMonthStr}</span>
              <span className="text-2xl font-extrabold text-blue-900">{previewDate.previewDayStr}</span>
            </div>
            <div>
              <h4 className="font-bold text-slate-900">סיכום תצוגה מקדימה</h4>
              <p className="text-xs text-slate-500">{previewDate.title}: {previewDate.value}</p>
              {previewDate.sedra && <p className="text-xs text-slate-500 italic">פרשת {previewDate.sedra}</p>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={onCancel}
              className="px-8 py-3 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors"
            >
              ביטול
            </button>
            <button 
              type="submit"
              className="px-10 py-3 bg-gradient-to-br from-blue-600 to-blue-800 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all"
            >
              שמירת אירוע
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const CalendarView = ({ events }: { events: CalendarEvent[] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarItem, setSelectedCalendarItem] = useState<{
    title: string;
    dayLabel: string;
    kind: 'holiday' | 'user';
    typeLabel?: string;
  } | null>(null);
  
  const uniqueTypes = useMemo(() => Array.from(new Set(events.map(e => e.type))), [events]);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const hebcalEvents = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const evs = HebrewCalendar.calendar({
      start,
      end,
      il: true,
    });
    return evs.filter(ev => {
      const f = ev.getFlags();
      const desc = ev.getDesc();
      // eslint-disable-next-line no-bitwise
      return !(f & flags.PARSHA_HASHAVUA) && desc !== 'Candle lighting' && desc !== 'Havdalah';
    });
  }, [currentMonth]);

  const nextHoliday = useMemo(() => {
    const today = new Date();
    const evs = HebrewCalendar.calendar({
      start: today,
      end: addMonths(today, 6),
      il: true,
    });
    const holidaysList = evs.filter(ev => {
      const f = ev.getFlags();
      // eslint-disable-next-line no-bitwise
      return (f & flags.CHAG) || (f & flags.ROSH_CHODESH) || (f & flags.MINOR_FAST) || (f & flags.MAJOR_FAST);
    });
    if (holidaysList.length > 0) {
      const next = holidaysList[0];
      const nextGreg = next.getDate().greg();
      const daysUntil = Math.ceil((nextGreg.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        name: next.render('he'),
        daysUntil: Math.max(0, daysUntil),
        gregDate: nextGreg
      };
    }
    return null;
  }, []);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  useEffect(() => {
    if (!selectedCalendarItem) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedCalendarItem(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedCalendarItem]);

  return (
    <div className="p-6 flex-1 flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold mb-1">{getHebrewMonthSpan(currentMonth)}</p>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">{format(currentMonth, 'MMMM yyyy', { locale: he })}</h2>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          <button onClick={prevMonth} className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm">
            <ChevronRight size={20} />
          </button>
          <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-2 font-semibold text-sm hover:bg-white rounded-lg transition-colors shadow-sm">היום</button>
          <button onClick={nextMonth} className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm">
            <ChevronLeft size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl overflow-hidden border border-slate-200 flex flex-col shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
          {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map(day => (
            <div key={day} className="py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1">
          {days.map((day, i) => {
            const hDate = new HDate(day);
            const isToday = isSameDay(day, new Date());
            
            const dayHebcalEvents = hebcalEvents.filter(ev => isSameDay(ev.getDate().greg(), day));
            const dayUserEvents = events.filter(ev => {
               const eventMonthStr = ev.hebrewDate.month;
               const hDateMonthStr = hebrewMonthsMap[hDate.getMonthName()] || hDate.getMonthName();
               return ev.hebrewDate.day === hDate.getDate() && eventMonthStr === hDateMonthStr;
            });
            
            return (
              <div key={i} className={cn(
                "min-h-[120px] p-3 border-l border-b border-slate-50 hover:bg-slate-50 transition-colors flex flex-col gap-2 group relative",
                isToday && "bg-blue-50/30 ring-1 ring-inset ring-blue-200"
              )}>
                <div className="flex justify-between items-start">
                  <span className={cn(
                    "text-xs font-bold",
                    isToday ? "text-blue-600 px-1.5 py-0.5 bg-blue-100 rounded" : "text-slate-900"
                  )}>{format(day, 'd')}</span>
                  <span className="text-[10px] font-bold text-slate-400">{hDate.renderGematriya()}</span>
                </div>
                <div className="flex flex-col gap-1 mt-1 overflow-y-auto max-h-[80px] scrollbar-hide">
                  {dayHebcalEvents.map((ev, idx) => (
                    <button
                      key={`h-${idx}`}
                      type="button"
                      onClick={() => setSelectedCalendarItem({
                        title: ev.render('he'),
                        dayLabel: `${format(day, 'd/M')} • ${hDate.renderGematriya()}`,
                        kind: 'holiday'
                      })}
                      className="w-full text-[10px] text-right px-2 py-0.5 bg-blue-600 text-white rounded font-bold truncate hover:opacity-90 transition-opacity"
                    >
                      {ev.render('he')}
                    </button>
                  ))}
                  {dayUserEvents.map((ev) => (
                    <button
                      key={`u-${ev.id}`}
                      type="button"
                      onClick={() => setSelectedCalendarItem({
                        title: ev.title,
                        dayLabel: `${format(day, 'd/M')} • ${hDate.renderGematriya()}`,
                        kind: 'user',
                        typeLabel: ev.type
                      })}
                      className={cn(
                      "w-full text-[10px] text-right px-2 py-0.5 rounded truncate font-bold hover:opacity-90 transition-opacity",
                      ev.type === 'birthday' ? "bg-blue-300 text-blue-900" :
                      ev.type === 'yahrzeit' ? "bg-red-600 text-white" :
                      "bg-purple-300 text-purple-900"
                    )} title={ev.title}>
                      {ev.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-100 p-4 rounded-xl flex flex-col gap-3">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500">מקרא לוח השנה</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { type: 'holiday', color: 'bg-blue-600', label: 'חגים ומועדים' },
              { type: 'birthday', color: 'bg-blue-300', label: 'ימי הולדת' },
              { type: 'yahrzeit', color: 'bg-red-600', label: 'אזכרות' },
              { type: 'anniversary', color: 'bg-purple-300', label: 'ימי נישואין' },
              ...uniqueTypes.filter(t => !['birthday', 'yahrzeit', 'anniversary'].includes(t)).map(t => ({
                type: t, color: 'bg-purple-300', label: t
              }))
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 text-xs">
                <span className={cn("w-3 h-3 rounded-full", item.color)}></span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-slate-100 p-4 rounded-xl flex items-center justify-between group cursor-pointer hover:bg-slate-200 transition-colors">
          <div>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500">החג הבא</h3>
            <p className="text-lg font-bold">{nextHoliday ? nextHoliday.name : 'אין קרוב'}</p>
            {nextHoliday && <p className="text-xs text-slate-500">
              {nextHoliday.daysUntil === 0 ? 'היום' : `עוד ${nextHoliday.daysUntil} ימים`} ({format(nextHoliday.gregDate, 'd בMMMM', { locale: he })})
            </p>}
          </div>
          <ChevronLeft className="text-blue-600 group-hover:-translate-x-1 transition-transform" size={20} />
        </div>
        <div className="bg-slate-200 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center border border-slate-300">
              <Sparkles className="text-blue-600" size={20} />
            </div>
            <div>
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500">תובנת זמנים</h3>
              <p className="text-xs leading-tight">השקיעה היום ב- <span className="font-bold">17:44</span>. הדלקת נרות בעוד <span className="text-blue-600 font-bold">4 שעות</span>.</p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedCalendarItem && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCalendarItem(null)}
              className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-[1px]"
              aria-label="סגור פרטי אירוע"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-3 bottom-3 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[28rem] z-[71] bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 text-right"
              dir="rtl"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">{selectedCalendarItem.dayLabel}</p>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-tight mt-1 break-words">{selectedCalendarItem.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCalendarItem(null)}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold transition-colors"
                >
                  סגור
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-bold",
                  selectedCalendarItem.kind === 'holiday' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                )}>
                  {selectedCalendarItem.kind === 'holiday' ? 'חג או מועד' : 'אירוע אישי'}
                </span>
                {selectedCalendarItem.typeLabel && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                    {selectedCalendarItem.typeLabel}
                  </span>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const ImportExportView = ({ events, onImport, exportSettings, onExportSettingsChange }: { events: CalendarEvent[], onImport?: (payload: ImportPayload) => void, exportSettings: ExportSettingsState, onExportSettingsChange: React.Dispatch<React.SetStateAction<ExportSettingsState>> }) => {
  const selectedSchema = exportSettings.selectedSchema;
  const reminderMode = exportSettings.reminderMode;
  const uniqueEventTypes = useMemo(() => Array.from(new Set(events.map(e => e.type))), [events]);
  const selectedEventTypes = exportSettings.selectedEventTypes;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizeReminderMode = (mode: string | undefined): ExportSettingsState['reminderMode'] => {
    if (mode === 'day-before' || mode === 'week-before' || mode === 'both' || mode === 'none') {
      return mode;
    }
    return 'none';
  };

  const normalizeReminderOverride = (mode: unknown): ReminderMode | undefined => {
    if (mode === 'use-export-default' || mode === 'none' || mode === 'day-before' || mode === 'week-before' || mode === 'both') {
      return mode;
    }
    return undefined;
  };

  const normalizeImportedEvents = (items: unknown[]): CalendarEvent[] => {
    return items
      .filter((item): item is CalendarEvent => {
        const candidate = item as CalendarEvent;
        return !!candidate && typeof candidate.title === 'string' && typeof candidate.type === 'string' && !!candidate.hebrewDate;
      })
      .map((event) => ({
        id: event.id || Math.random().toString(36).substr(2, 9),
        title: event.title,
        type: event.type,
        hebrewDate: {
          day: Number(event.hebrewDate.day) || 1,
          month: event.hebrewDate.month || 'ניסן',
          year: Number(event.hebrewDate.year) || 5784,
          afterSunset: !!event.hebrewDate.afterSunset
        },
        reminderOverride: normalizeReminderOverride(event.reminderOverride)
      }));
  };

  useEffect(() => {
    onExportSettingsChange((prev) => {
      const stillValid = prev.selectedEventTypes.filter(type => uniqueEventTypes.includes(type));
      const newTypes = uniqueEventTypes.filter(type => !stillValid.includes(type));
      const nextSelected = prev.selectedEventTypes.length === 0
        ? uniqueEventTypes
        : [...stillValid, ...newTypes];

      const isSame =
        nextSelected.length === prev.selectedEventTypes.length &&
        nextSelected.every((type, idx) => type === prev.selectedEventTypes[idx]);

      if (isSame) {
        return prev;
      }

      return { ...prev, selectedEventTypes: nextSelected };
    });
  }, [uniqueEventTypes]);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        if (file.name.endsWith('.ics')) {
          const lines = text.split(/\r?\n/);
          const newEvents: CalendarEvent[] = [];

          const importedSettings: ExportSettingsState = {
            selectedSchema: 'ics',
            reminderMode: 'none',
            selectedEventTypes: []
          };

          let currentEvent: Partial<CalendarEvent> | null = null;
          let currentEventHasHebrewDate = false;
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('X-EXPORT-EVENT-TYPES:')) {
              importedSettings.selectedEventTypes = trimmed.substring('X-EXPORT-EVENT-TYPES:'.length)
                .split(',')
                .map(t => t.trim())
                .filter(t => !!t && t !== 'none');
            } else if (trimmed.startsWith('X-EXPORT-REMINDER-MODE:')) {
              importedSettings.reminderMode = normalizeReminderMode(trimmed.substring('X-EXPORT-REMINDER-MODE:'.length));
            } else if (trimmed === 'BEGIN:VEVENT') {
              currentEvent = { id: Math.random().toString(36).substr(2, 9), type: 'birthday', hebrewDate: { day: 1, month: 'ניסן', year: 5784, afterSunset: false } };
              currentEventHasHebrewDate = false;
            } else if (trimmed === 'END:VEVENT' && currentEvent) {
              if (currentEvent.title && currentEventHasHebrewDate) newEvents.push(currentEvent as CalendarEvent);
              currentEvent = null;
              currentEventHasHebrewDate = false;
            } else if (currentEvent && trimmed.startsWith('UID:')) {
              currentEvent.id = normalizeImportedUid(trimmed.substring(4));
            } else if (currentEvent && trimmed.startsWith('SUMMARY:')) {
              currentEvent.title = trimmed.substring(8);
            } else if (currentEvent && trimmed.startsWith('CATEGORIES:')) {
              currentEvent.type = trimmed.substring(11);
            } else if (currentEvent && trimmed.startsWith('X-HEBREW-DATE:')) {
              const parts = trimmed.substring('X-HEBREW-DATE:'.length).split(' ');
              if (parts.length >= 3) {
                const day = parseInt(parts[0], 10);
                const year = parseInt(parts[parts.length - 1], 10);
                const month = parts.slice(1, parts.length - 1).join(' ');
                if (!isNaN(day) && !isNaN(year) && month) {
                  currentEvent.hebrewDate = { day, month, year, afterSunset: currentEvent.hebrewDate?.afterSunset ?? false };
                  currentEventHasHebrewDate = true;
                }
              }
            } else if (currentEvent && trimmed.startsWith('X-AFTER-SUNSET:')) {
              if (currentEvent.hebrewDate) currentEvent.hebrewDate.afterSunset = trimmed.substring('X-AFTER-SUNSET:'.length).toLowerCase() === 'true';
            } else if (currentEvent && trimmed.startsWith('X-REMINDER-OVERRIDE:')) {
              currentEvent.reminderOverride = normalizeReminderOverride(trimmed.substring('X-REMINDER-OVERRIDE:'.length));
            }
          }

          if (newEvents.length > 0) {
            onImport?.({ events: newEvents, exportSettings: importedSettings });
          } else {
            alert('לא נמצאו אירועים בקובץ ה-ICS.');
          }
        } else {
          alert('פורמט קובץ לא נתמך. נא להעלות קובץ מסוג .ics');
        }
      } catch (err) {
        alert('שגיאה בפענוח הקובץ.');
      }
    };
    reader.readAsText(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const toggleEventType = (type: string) => {
    onExportSettingsChange(prev => ({
      ...prev,
      selectedEventTypes: prev.selectedEventTypes.includes(type)
        ? prev.selectedEventTypes.filter(t => t !== type)
        : [...prev.selectedEventTypes, type]
    }));
  };

  const exportEvents = useMemo(() => {
    if (selectedEventTypes.length === 0) {
      return [];
    }
    return events.filter(e => selectedEventTypes.includes(e.type));
  }, [events, selectedEventTypes]);

  const reminderRules = useMemo(() => buildReminderRules(reminderMode), [reminderMode]);

  const getEventReminderMode = (event: CalendarEvent): ReminderMode => {
    if (!event.reminderOverride || event.reminderOverride === 'use-export-default') {
      return reminderMode;
    }
    return event.reminderOverride;
  };

  const getEventReminderRules = (event: CalendarEvent) => buildReminderRules(getEventReminderMode(event));

  const now = new Date().toISOString();

  const hebrewToEnglishMonth: Record<string, string> = {
    'ניסן': 'Nisan',
    'אייר': 'Iyyar',
    'סיוון': 'Sivan',
    'תמוז': 'Tamuz',
    'אב': 'Av',
    'אלול': 'Elul',
    'תשרי': 'Tishrei',
    'חשוון': 'Cheshvan',
    'כסלו': 'Kislev',
    'טבת': 'Tevet',
    'שבט': 'Shvat',
    'אדר': 'Adar 1',
    'אדר א׳': 'Adar 1',
    'אדר ב׳': 'Adar 2'
  };

  const formatIcsDate = (date: Date) => {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}${m}${d}`;
  };

  const formatIcsUtcDateTime = (date: Date) => {
    const y = date.getUTCFullYear();
    const m = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    const d = `${date.getUTCDate()}`.padStart(2, '0');
    const hh = `${date.getUTCHours()}`.padStart(2, '0');
    const mm = `${date.getUTCMinutes()}`.padStart(2, '0');
    const ss = `${date.getUTCSeconds()}`.padStart(2, '0');
    return `${y}${m}${d}T${hh}${mm}${ss}Z`;
  };

  const resolveAlarmDate = (eventDate: Date, rule: ReminderRule) => {
    const triggerMatch = /^-P(\d+)D$/.exec(rule.trigger);
    const dayOffset = triggerMatch ? Number(triggerMatch[1]) : 0;
    const alarmDate = addDays(eventDate, -dayOffset);

    if (rule.time) {
      const [hours, minutes] = rule.time.split(':').map(Number);
      alarmDate.setHours(hours || 0, minutes || 0, 0, 0);
    }

    return alarmDate;
  };

  const buildIcsReminders = (summary: string, eventDate: Date, eventReminderRules: ReminderRule[]) => {
    const escapedDescription = escapeIcsText(summary);

    return eventReminderRules.map((rule) => {
      const lines = [
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapedDescription}`,
      ];

      if (rule.time) {
        lines.push(`TRIGGER;VALUE=DATE-TIME:${formatIcsUtcDateTime(resolveAlarmDate(eventDate, rule))}`);
      } else {
        lines.push(`TRIGGER;RELATED=START:${rule.trigger}`);
      }

      lines.push('END:VALARM');
      return lines.join('\n');
    }).join('\n');
  };

  const resolveEventGregorianDate = (event: CalendarEvent) => {
    try {
      const month = hebrewToEnglishMonth[event.hebrewDate.month] || 'Nisan';
      const hd = new HDate(event.hebrewDate.day, month, event.hebrewDate.year);
      return hd.greg();
    } catch {
      return new Date();
    }
  };

  const icsConfigEvents = exportEvents.map(e => {
    const exportBaseId = normalizeExportBaseId(e.id);
    const eventReminderMode = getEventReminderMode(e);
    const eventReminderRules = getEventReminderRules(e);
    const eventDate = resolveEventGregorianDate(e);
    const dtStart = formatIcsDate(eventDate);
    const dtEnd = formatIcsDate(addDays(eventDate, 1));
    const dtStamp = formatIcsUtcDateTime(new Date());
    const escapedSummary = escapeIcsText(e.title);
    const escapedCategory = escapeIcsText(e.type);
    const icsReminders = buildIcsReminders(e.title, eventDate, eventReminderRules);
    const reminderSection = icsReminders ? `${icsReminders}\n` : '';

    return `BEGIN:VEVENT
UID:${exportBaseId}@hc4gc-source
DTSTAMP:${dtStamp}
DTSTART;VALUE=DATE:${dtStart}
DTEND;VALUE=DATE:${dtEnd}
SUMMARY:${escapedSummary}
CATEGORIES:${escapedCategory}
X-HC4GC-ENTRY-TYPE:SOURCE
X-HEBREW-DATE:${e.hebrewDate.day} ${e.hebrewDate.month} ${e.hebrewDate.year}
X-AFTER-SUNSET:${e.hebrewDate.afterSunset ? 'true' : 'false'}
X-REMINDER-OVERRIDE:${e.reminderOverride || 'use-export-default'}
X-EFFECTIVE-REMINDER-MODE:${eventReminderMode}
${reminderSection}END:VEVENT`;
  }).join('\n');

  const icsGeneratedEvents = exportEvents.flatMap(e => {
    const exportBaseId = normalizeExportBaseId(e.id);
    const eventReminderRules = getEventReminderRules(e);
    const eventTypeLabel = getEventTypeSyncLabel(e.type);
    const month = hebrewToEnglishMonth[e.hebrewDate.month] || 'Nisan';
    const eventsForHundredYears: string[] = [];

    for (let i = 0; i < 100; i++) {
      const occurrence = i;
      const targetHebrewYear = e.hebrewDate.year + i;

      try {
        const hd = new HDate(e.hebrewDate.day, month, targetHebrewYear);
        const eventDate = hd.greg();
        const dtStart = formatIcsDate(eventDate);
        const dtEnd = formatIcsDate(addDays(eventDate, 1));
        const dtStamp = formatIcsUtcDateTime(new Date());
        const summary = `${eventTypeLabel} ל${e.title} (${occurrence})`;
        const escapedSummary = escapeIcsText(summary);
        const escapedCategory = escapeIcsText(e.type);
        const icsReminders = buildIcsReminders(summary, eventDate, eventReminderRules);
        const reminderSection = icsReminders ? `${icsReminders}\n` : '';

        eventsForHundredYears.push(`BEGIN:VEVENT
UID:${exportBaseId}-${targetHebrewYear}-${occurrence}@hc4gc
DTSTAMP:${dtStamp}
DTSTART;VALUE=DATE:${dtStart}
DTEND;VALUE=DATE:${dtEnd}
SUMMARY:${escapedSummary}
CATEGORIES:${escapedCategory}
X-HC4GC-ENTRY-TYPE:GENERATED
TRANSP:TRANSPARENT
${reminderSection}END:VEVENT`);
      } catch {
        // Skip invalid dates in years where the Hebrew date does not exist.
      }
    }

    return eventsForHundredYears;
  }).join('\n');

  const icsGlobalReminderIds = reminderRules.map(rule => rule.id).join(',') || 'none';

  const icsPreview = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HC4GC//NONSGML App//EN
CALSCALE:GREGORIAN
X-EXPORT-SCHEMA:${selectedSchema.toUpperCase()}
X-EXPORT-EVENT-TYPES:${selectedEventTypes.join(',') || 'none'}
X-EXPORT-REMINDER-MODE:${reminderMode}
X-EXPORT-REMINDERS:${icsGlobalReminderIds}
${icsConfigEvents}
${icsGeneratedEvents}
END:VCALENDAR`;

  const previews = { ics: icsPreview };

  const downloadIcsFile = (fileName?: string) => {
    const content = previews.ics;
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'calendar_export.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownload = () => {
    downloadIcsFile();
  };

  const handleGoogleCalendarSync = () => {
    const fileStamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadIcsFile(`hc4gc_sync_${fileStamp}.ics`);
    window.open('https://calendar.google.com/calendar/u/0/r/settings/export', '_blank', 'noopener,noreferrer');
    alert('קובץ ICS נוצר והורד. בחלון גוגל קלנדר שנפתח, בחר Import ובחר את הקובץ שהורד.');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(previews[selectedSchema]);
    alert('הועתק ללוח!');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8 text-right">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1">כלי ניהול נתונים</p>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">ייצוא וייבוא נתוני לוח שנה</h1>
        <p className="text-slate-500 max-w-2xl">נהל את המידע הליטורגי שלך בדיוק מרבי. הורד וייבא נתונים בפורמט iCalendar (ICS) לעבודה מול יומן גוגל.</p>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-right">
            <div className="flex items-center gap-3 mb-6">
               <ArrowLeftRight className="text-blue-600" size={20} />
              <h3 className="font-bold text-lg">הגדרות ייצוא</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">כלול סוגי אירועים</label>
                <div className="flex flex-wrap gap-2 justify-start">
                  {uniqueEventTypes.length === 0 && (
                    <span className="text-xs text-slate-400">אין סוגי אירועים זמינים כרגע</span>
                  )}
                  {uniqueEventTypes.map(type => {
                    const selected = selectedEventTypes.includes(type);
                    return (
                      <button
                        type="button"
                        key={type}
                        onClick={() => toggleEventType(type)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-colors",
                          selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        )}
                      >
                        {getEventTypeLabel(type)}
                        {selected ? <Check size={14} /> : <Plus size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">תזכורות לאירועים מיוצאים</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'none', label: 'ללא תזכורות', desc: 'לא תתווסף תזכורת לקבצים המיוצאים' },
                    { id: 'day-before', label: 'יום לפני בשעה 19:00', desc: 'תזכורת אחת בערב שלפני האירוע' },
                    { id: 'week-before', label: 'שבוע לפני', desc: 'תזכורת אחת 7 ימים לפני האירוע' },
                    { id: 'both', label: 'גם וגם', desc: 'שבוע לפני וגם יום לפני ב-19:00' },
                  ].map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onExportSettingsChange(prev => ({ ...prev, reminderMode: option.id as Exclude<ReminderMode, 'use-export-default'> }))}
                      className={cn(
                        "text-right p-3 rounded-lg border transition-colors",
                        reminderMode === option.id ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <span className="block text-xs font-bold text-slate-900">{option.label}</span>
                      <span className="block text-[10px] text-slate-500 mt-1">{option.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
           </section>

          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-right">
             <div className="flex items-center gap-3 mb-4">
              <ArrowLeftRight className="text-blue-600" size={20} />
              <h3 className="font-bold text-lg">ייבוא נתונים</h3>
            </div>
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
               <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud className="text-blue-600" size={24} />
              </div>
              <p className="text-sm font-bold text-slate-900 mb-1">גרור קובץ ICS לכאן</p>
               <p className="text-[10px] text-slate-500 mb-4">או לחץ לבחירת קובץ מהמחשב</p>
              <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors pointer-events-none">
                 בחר קובץ
               </button>
               <input type="file" ref={fileInputRef} className="hidden" accept=".ics" onChange={handleFileSelect} />
            </div>
           </section>

           <div className="pt-2">
            <button onClick={handleDownload} className="w-full bg-gradient-to-r from-blue-600 to-blue-800 p-4 rounded-xl text-white font-bold flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all group">
               <Download className="group-hover:translate-y-1 transition-transform" size={20} />
              בצע הורדת נתונים
            </button>
              <button onClick={handleGoogleCalendarSync} className="w-full mt-3 bg-white border border-blue-200 text-blue-700 p-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-sm hover:bg-blue-50 active:scale-[0.98] transition-all group">
                <ArrowLeftRight className="group-hover:rotate-6 transition-transform" size={20} />
                סנכרון לוח שנה
              </button>
            <p className="text-center mt-3 text-[11px] text-slate-400 uppercase tracking-widest opacity-60">נפח משוער: 442 KB</p>
           </div>
         </div>

         <div className="col-span-12 lg:col-span-7 flex flex-col h-full min-h-0">
           <div className="h-[560px] lg:h-[calc(100vh-210px)] bg-slate-900 rounded-xl overflow-hidden shadow-2xl flex flex-col min-h-0">
             <div className="bg-white/5 px-6 py-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                   <div className="w-2.5 h-2.5 rounded-full bg-red-400/40"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/40"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/40"></div>
                </div>
                 <span className="mr-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">תצוגה מקדימה של {selectedSchema.toUpperCase()}</span>
               </div>
               <button onClick={handleCopy} className="text-slate-500 hover:text-white transition-colors">
                <Copy size={18} />
              </button>
            </div>
             <div className="p-8 font-mono text-sm leading-relaxed text-blue-100/80 overflow-auto flex-1 min-h-0 text-left" dir="ltr">
              <pre><code>{previews[selectedSchema]}</code></pre>
            </div>
            <div className="mt-auto bg-white/5 px-6 py-3 flex items-center gap-4 border-t border-white/5">
               <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
               <span className="text-[10px] text-slate-500 font-medium">אימות בזמן אמת: המבנה תקין</span>
            </div>
           </div>
          <div className="mt-6 flex gap-4 p-4 rounded-xl bg-blue-50 border border-blue-100 text-right">
             <Info className="text-blue-600 shrink-0" size={20} />
             <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-900 block mb-1">הערת מפתח</strong>
               כפתור הסנכרון יוצר קובץ ICS לפי הגדרות הייצוא שבחרת ופותח את מסך הייבוא של Google Calendar כדי להשלים את הייבוא.
             </p>
           </div>
         </div>
      </div>
     </div>
  );
};

// --- Main App ---

export default function App() {
  const APP_STORAGE_KEY = 'hc4gc.appState.v1';
  const LEGACY_EVENTS_STORAGE_KEY = 'hc4gc.events.v1';
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appState, setAppState] = useState<PersistedAppState>(() => {
    try {
      const raw = window.localStorage.getItem(APP_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedAppState>;
        return {
          events: Array.isArray(parsed.events) ? parsed.events : [],
          exportSettings: {
            ...DEFAULT_EXPORT_SETTINGS,
            ...(parsed.exportSettings || {}),
            selectedEventTypes: Array.isArray(parsed.exportSettings?.selectedEventTypes) ? parsed.exportSettings.selectedEventTypes : []
          }
        };
      }

      // Backward compatibility with previous events-only storage.
      const legacyRaw = window.localStorage.getItem(LEGACY_EVENTS_STORAGE_KEY);
      if (legacyRaw) {
        const parsedLegacy = JSON.parse(legacyRaw);
        return {
          events: Array.isArray(parsedLegacy) ? parsedLegacy : [],
          exportSettings: DEFAULT_EXPORT_SETTINGS
        };
      }
    } catch {
      // Ignore storage parse errors and continue with defaults.
    }
    return {
      events: [],
      exportSettings: DEFAULT_EXPORT_SETTINGS
    };
  });
  const events = appState.events;
  const exportSettings = appState.exportSettings;
  const setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>> = (updater) => {
    setAppState(prev => ({
      ...prev,
      events: typeof updater === 'function' ? (updater as (prevEvents: CalendarEvent[]) => CalendarEvent[])(prev.events) : updater
    }));
  };
  const setExportSettings: React.Dispatch<React.SetStateAction<ExportSettingsState>> = (updater) => {
    setAppState(prev => ({
      ...prev,
      exportSettings: typeof updater === 'function'
        ? (updater as (prevExportSettings: ExportSettingsState) => ExportSettingsState)(prev.exportSettings)
        : updater
    }));
  };
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(appState));
    } catch {
      // Ignore storage errors (private mode/quota issues) and keep app functional.
    }
  }, [appState]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleSaveEvent = (newEvent: CalendarEvent) => {
    if (editingEvent) {
      setEvents(events.map(e => e.id === newEvent.id ? newEvent : e));
      setEditingEvent(null);
    } else {
      setEvents([...events, newEvent]);
    }
    setActiveTab('dashboard');
  };

  const handleEdit = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setActiveTab('add-event');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק אירוע זה?')) {
      setEvents(events.filter(e => e.id !== id));
    }
  };

  const handleClearAll = () => {
    if (events.length === 0) {
      alert('הרשימה כבר ריקה.');
      return;
    }
    if (window.confirm('למחוק את כל האירועים מהרשימה?')) {
      setEvents([]);
      setEditingEvent(null);
      setActiveTab('dashboard');
    }
  };

  const handleImportEvents = (payload: ImportPayload) => {
    setEvents(payload.events);
    if (payload.exportSettings) {
      setExportSettings({
        selectedSchema: payload.exportSettings.selectedSchema,
        reminderMode: payload.exportSettings.reminderMode,
        selectedEventTypes: payload.exportSettings.selectedEventTypes
      });
    }
    alert(`יובאו בהצלחה ${payload.events.length} אירועים!`);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView events={events} onAddClick={() => setActiveTab('add-event')} onEdit={handleEdit} onDelete={handleDelete} onClearAll={handleClearAll} />;
      case 'calendar':
        return <CalendarView events={events} />;
      case 'add-event':
        return <AddEventView 
                 events={events} 
                 initialData={editingEvent}
                 onSave={handleSaveEvent} 
                 onCancel={() => {
                   setEditingEvent(null);
                   setActiveTab('dashboard');
                 }} 
               />;
      case 'import-export':
        return <ImportExportView events={events} onImport={handleImportEvents} exportSettings={exportSettings} onExportSettingsChange={setExportSettings} />;
      default:
        return <DashboardView events={events} onAddClick={() => setActiveTab('add-event')} onEdit={handleEdit} onDelete={handleDelete} onClearAll={handleClearAll} />;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'יומן עברי ליומן גוגל';
      case 'calendar': return 'לוח שנה';
      case 'add-event': return 'הוספת אירוע';
      case 'import-export': return 'ייצוא וייבוא';
      default: return 'HC4GC';
    }
  };

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen flex font-['Assistant',_sans-serif]" dir="rtl">
      {isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/35 backdrop-blur-[1px] z-40 md:hidden"
          aria-label="סגור תפריט"
        />
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        isMobileMenuOpen={isMobileMenuOpen}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
      />
      
      <main className={cn(
        "flex-1 flex flex-col min-h-screen transition-all duration-300 mr-0",
        isSidebarCollapsed ? "md:mr-20" : "md:mr-64"
      )}>
        <TopBar title={getTitle()} onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="w-full mt-auto py-4 border-t border-slate-200 bg-slate-50 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center px-4 sm:px-8">
          <div className="text-slate-400 font-inter text-[11px] uppercase tracking-widest">
            © 2024 HC4GC • מערכת פעילה
          </div>
          <div className="flex gap-6 flex-wrap">
            <button className="text-slate-400 hover:text-blue-800 font-inter text-[11px] uppercase tracking-widest transition-colors opacity-80 hover:opacity-100">סטטוס</button>
            <button className="text-slate-400 hover:text-blue-800 font-inter text-[11px] uppercase tracking-widest transition-colors opacity-80 hover:opacity-100">פרטיות</button>
            <button className="text-slate-400 hover:text-blue-800 font-inter text-[11px] uppercase tracking-widest transition-colors opacity-80 hover:opacity-100">תנאים</button>
          </div>
        </footer>
      </main>

      {/* Floating Action Button */}
      {activeTab !== 'add-event' && (
        <button 
          onClick={() => {
            setActiveTab('add-event');
            setIsMobileMenuOpen(false);
          }}
          className={cn(
            "fixed bottom-5 left-5 md:bottom-8 md:left-8 h-12 w-12 md:h-14 md:w-14 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-2xl flex items-center justify-center group active:scale-95 transition-all z-50",
            isMobileMenuOpen && "opacity-0 pointer-events-none"
          )}
        >
          <Plus className="group-hover:rotate-90 transition-transform" size={24} />
        </button>
      )}
    </div>
  );
}
