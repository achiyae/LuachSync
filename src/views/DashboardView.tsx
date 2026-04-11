import React, { useMemo, useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, MoreVertical, Plus, Search } from 'lucide-react';
import { HDate, HebrewCalendar, Location, Zmanim, getSedra, gematriya } from '@hebcal/core';
import { addDays, addMonths, eachDayOfInterval, endOfMonth, format, getDay, isSameDay, startOfMonth, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { getHebrewMonthSpan, hebrewMonthsMap } from '../lib/helpers';
import { CalendarEvent } from '../types';

const FALLBACK_TIME = '--:--';

const safeFormatClockTime = (date: Date | null | undefined) => date ? format(date, 'HH:mm') : FALLBACK_TIME;

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
    try {
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

      let candle = FALLBACK_TIME;
      let havdalah = FALLBACK_TIME;

      for (const ev of evs) {
        const desc = ev.getDesc();
        if (desc === 'Candle lighting') {
          // @ts-ignore
          candle = safeFormatClockTime(ev.eventTime);
        } else if (desc === 'Havdalah') {
          // @ts-ignore
          havdalah = safeFormatClockTime(ev.eventTime);
        }
      }

      return { candle, havdalah };
    } catch (error) {
      console.error('Failed to calculate Shabbat zmanim', error);
      return { candle: FALLBACK_TIME, havdalah: FALLBACK_TIME };
    }
  }, [selectedDate, locationState]);

  const zmanim = useMemo(() => {
    try {
      const loc = new Location(locationState.lat, locationState.long, true, locationState.tz, locationState.name, 'IL');
      const z = new Zmanim(loc, selectedDate, false);
      return {
        alotHaShachar: safeFormatClockTime(z.alotHaShachar()),
        netzHaChama: safeFormatClockTime(z.neitzHaChama()),
        sofZmanKriasShema: safeFormatClockTime(z.sofZmanShmaMGA()),
        chatzos: safeFormatClockTime(z.chatzot()),
        shkiya: safeFormatClockTime(z.shkiah()),
        candleLighting: shabbatZmanim.candle,
        havdalah: shabbatZmanim.havdalah
      };
    } catch (error) {
      console.error('Failed to calculate daily zmanim', error);
      return {
        alotHaShachar: FALLBACK_TIME,
        netzHaChama: FALLBACK_TIME,
        sofZmanKriasShema: FALLBACK_TIME,
        chatzos: FALLBACK_TIME,
        shkiya: FALLBACK_TIME,
        candleLighting: shabbatZmanim.candle,
        havdalah: shabbatZmanim.havdalah
      };
    }
  }, [selectedDate, locationState, shabbatZmanim]);

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1 font-semibold">השקפה יומית</p>
          <h2 data-testid="dashboard-daily-hebrew-date" className="text-4xl font-bold text-slate-900">{hDate.renderGematriya()}</h2>
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
              {t === 'yahrzeit' ? 'ימי זיכרון' : t === 'birthday' ? 'ימי הולדת' : t === 'anniversary' ? 'ימי נישואין' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <h3 className="text-xs uppercase tracking-[0.15em] text-slate-500 font-bold">אירועים</h3>
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
                const monthLabel = hebrewMonthsMap[monthName] || event.nextOccur.getMonthName('h') || monthName;
                return (
                <div
                  key={event.id}
                  data-testid="dashboard-event-card"
                  className={cn("group p-6 rounded-xl transition-all flex items-start gap-6 border shadow-sm", isToday ? "bg-blue-50 border-blue-200" : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200")}
                >
                  <div className={cn(
                    "flex flex-col items-center justify-center w-20 h-20 rounded-lg shrink-0",
                    event.type === 'yahrzeit' ? "bg-purple-100 text-purple-800" : 
                    event.type === 'birthday' ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"
                  )}
                    data-testid="dashboard-event-date-badge"
                  >
                    <span className="text-[10px] font-bold leading-none">{event.type === 'yahrzeit' ? 'יום זיכרון' : event.type === 'birthday' ? 'יום הולדת' : event.type === 'anniversary' ? 'יום נישואין' : event.type}</span>
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
                          {event.type === 'yahrzeit' ? 'יום זיכרון' : event.type === 'birthday' ? 'יום הולדת' : event.type === 'anniversary' ? 'יום נישואין' : event.type}
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
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500" dir="rtl">
                      {event.hebrewDate.year > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-slate-400">תאריך מקורי:</span>
                          {gematriya(event.hebrewDate.day)} {event.hebrewDate.month} {gematriya(event.hebrewDate.year % 1000)}
                        </span>
                      )}
                      {event.hebrewDate.year > 0 && event.nextOccur.getFullYear() - event.hebrewDate.year > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-slate-400">מופע:</span>
                          {event.nextOccur.getFullYear() - event.hebrewDate.year}
                        </span>
                      )}
                    </div>
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
          <div data-testid="dashboard-mini-calendar" className="bg-blue-50 p-6 rounded-xl space-y-4 border border-blue-100">
            <div className="flex justify-between items-center">
              <div className="flex gap-1 bg-blue-100/50 p-1 rounded-lg">
                <button data-testid="mini-calendar-prev-month" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="p-1 hover:bg-white rounded-md transition-colors text-slate-500 hover:text-blue-600 shadow-sm">
                  <ChevronRight size={16} />
                </button>
                <button data-testid="mini-calendar-today" onClick={() => { setCalendarMonth(new Date()); setSelectedDate(new Date()); }} className="px-2 py-1 font-bold text-[11px] hover:bg-white rounded-md transition-colors text-slate-500 hover:text-blue-600 shadow-sm">
                  היום
                </button>
                <button data-testid="mini-calendar-next-month" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-1 hover:bg-white rounded-md transition-colors text-slate-500 hover:text-blue-600 shadow-sm">
                  <ChevronLeft size={16} />
                </button>
              </div>
              <h4 data-testid="dashboard-mini-calendar-month" className="font-bold text-blue-900" dir="ltr">{format(calendarMonth, 'MMMM yyyy', { locale: he })} / {getHebrewMonthSpan(calendarMonth)}</h4>
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
                    data-testid={`mini-calendar-day-${format(date, 'yyyy-MM-dd')}`}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "text-xs py-1 rounded-full cursor-pointer hover:bg-blue-200 transition-colors relative flex flex-col items-center justify-center h-8 w-8 mx-auto",
                      isSelected ? "bg-blue-600 text-white font-bold shadow-sm" : isToday ? "text-blue-600 font-bold" : "text-slate-700"
                    )}
                  >
                    <span className="leading-none">{format(date, 'd')}</span>
                    {hasEvent && (
                      <span data-testid="mini-calendar-day-dot" className={cn("absolute bottom-1 w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-blue-600")} />
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


export default DashboardView;

