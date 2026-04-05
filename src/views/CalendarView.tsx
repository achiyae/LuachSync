import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { HDate, HebrewCalendar, flags } from '@hebcal/core';
import { addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { getHebrewMonthSpan, hebrewMonthsMap } from '../lib/helpers';
import { CalendarEvent } from '../types';
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
              { type: 'yahrzeit', color: 'bg-red-600', label: 'ימי זיכרון' },
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


export default CalendarView;

