import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Bell, Cake, Flame, Heart, Info, PlusCircle, Star } from 'lucide-react';
import { HDate, gematriya, gematriyaStrToNum, getSedra } from '@hebcal/core';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { hebrewMonthsMap, hebrewToEnglishMonth } from '../lib/helpers';
import { CalendarEvent, EventType, ReminderMode } from '../types';
const REMINDER_MODE_OPTIONS: Array<{ id: ReminderMode; label: string; desc: string }> = [
  { id: 'use-export-default', label: 'השתמש בהגדרת הייצוא', desc: 'האירוע ישתמש בתזכורות שתוגדרנה במסך הייצוא.' },
  { id: 'none', label: 'ללא תזכורות', desc: 'האירוע הזה ייוצא ללא תזכורות, גם אם בייצוא מוגדר אחרת.' },
  { id: 'day-before', label: 'יום לפני בשעה 19:00', desc: 'עוקף את ברירת המחדל של הייצוא עבור האירוע הזה בלבד.' },
  { id: 'week-before', label: 'שבוע לפני', desc: 'עוקף את ברירת המחדל של הייצוא עבור האירוע הזה בלבד.' },
  { id: 'both', label: 'גם שבוע לפני וגם יום לפני ב-19:00', desc: 'עוקף את ברירת המחדל של הייצוא עבור האירוע הזה בלבד.' }
];

const AddEventView = ({ events, initialData, onSave, onCancel }: { events: CalendarEvent[], initialData?: CalendarEvent | null, onSave: (e: CalendarEvent) => void, onCancel: () => void }) => {
  const normalizeHebrewYear = (yearStr: string) => {
    const cleanYearStr = yearStr.replace(/^ה['״"]?(?=[א-ת])/g, '');
    let y = gematriyaStrToNum(cleanYearStr);
    if (!Number.isFinite(y) || y <= 0) {
      return null;
    }
    if (y < 3000) y += 5000;
    return y;
  };

  const getGregorianDateFromHebrewInput = (day: number, month: string, yearStr: string, afterSunset: boolean) => {
    try {
      const year = normalizeHebrewYear(yearStr);
      if (!year) return null;
      const hd = new HDate(day, hebrewToEnglishMonth[month] || 'Nisan', year);
      const targetHd = afterSunset ? hd.prev() : hd;
      return format(targetHd.greg(), 'yyyy-MM-dd');
    } catch {
      return null;
    }
  };

  const getHebrewInputFromGregorianDate = (gregorianDate: string, afterSunset: boolean) => {
    try {
      const [y, m, d] = gregorianDate.split('-').map(Number);
      if (!y || !m || !d) return null;
      const baseDate = new Date(y, m - 1, d);
      if (baseDate.getFullYear() !== y || baseDate.getMonth() !== m - 1 || baseDate.getDate() !== d) {
        return null;
      }

      let hd = new HDate(baseDate);
      if (afterSunset) hd = hd.next();

      return {
        day: hd.getDate(),
        month: hebrewMonthsMap[hd.getMonthName()] || hd.getMonthName(),
        yearStr: gematriya(hd.getFullYear())
      };
    } catch {
      return null;
    }
  };

  const initialGregorianDate = initialData
    ? getGregorianDateFromHebrewInput(
      initialData.hebrewDate.day,
      initialData.hebrewDate.month,
      gematriya(initialData.hebrewDate.year),
      initialData.hebrewDate.afterSunset
    ) || format(new Date(), 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd');

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    type: (initialData?.type || 'birthday') as EventType,
    customType: '',
    dateMode: 'hebrew' as 'hebrew' | 'gregorian',
    day: initialData?.hebrewDate.day || 1,
    month: initialData?.hebrewDate.month || 'ניסן',
    yearStr: initialData?.hebrewDate.year ? gematriya(initialData.hebrewDate.year) : (gematriya(5786) || 'תשפ״ו'),
    gregorianDate: initialGregorianDate,
    afterSunset: initialData?.hebrewDate.afterSunset || false,
    reminderOverride: (initialData?.reminderOverride || 'use-export-default') as ReminderMode
  });

  const months = [
    'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב׳', 'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול'
  ];

  const uniqueCustomTypes = useMemo(() => {
    return Array.from(new Set(events.map(e => e.type).filter(t => !['birthday', 'anniversary', 'yahrzeit'].includes(t))));
  }, [events]);

  useEffect(() => {
    if (formData.dateMode !== 'hebrew') return;
    const syncedGregorianDate = getGregorianDateFromHebrewInput(
      formData.day,
      formData.month,
      formData.yearStr,
      formData.afterSunset
    );
    if (!syncedGregorianDate || syncedGregorianDate === formData.gregorianDate) return;
    setFormData(prev => ({ ...prev, gregorianDate: syncedGregorianDate }));
  }, [formData.dateMode, formData.day, formData.month, formData.yearStr, formData.afterSunset, formData.gregorianDate]);

  useEffect(() => {
    if (formData.dateMode !== 'gregorian') return;
    const syncedHebrew = getHebrewInputFromGregorianDate(formData.gregorianDate, formData.afterSunset);
    if (!syncedHebrew) return;
    if (
      syncedHebrew.day === formData.day &&
      syncedHebrew.month === formData.month &&
      syncedHebrew.yearStr === formData.yearStr
    ) {
      return;
    }
    setFormData(prev => ({
      ...prev,
      day: syncedHebrew.day,
      month: syncedHebrew.month,
      yearStr: syncedHebrew.yearStr
    }));
  }, [formData.dateMode, formData.gregorianDate, formData.afterSunset, formData.day, formData.month, formData.yearStr]);
  
  const previewDate = useMemo(() => {
    if (formData.dateMode === 'hebrew') {
        try {
            const y = normalizeHebrewYear(formData.yearStr);
            if (!y) {
              throw new Error('Invalid Hebrew year');
            }
            const hd = new HDate(formData.day, hebrewToEnglishMonth[formData.month] || 'Nisan', y);
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
                value: `${gematriya(hd.getDate())} ב${hebrewMonthsMap[hd.getMonthName()] || hd.getMonthName()} ${gematriya(hd.getFullYear())}`,
                sedra: getSedra(hd.getFullYear(), true).lookup(hd)?.parsha?.join('-') || 'אין פרשה',
                hd: hd,
                previewDayStr: gematriya(hd.getDate()),
                previewMonthStr: hebrewMonthsMap[hd.getMonthName()] || hd.getMonthName()
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
        month: hebrewMonthsMap[m] || 'ניסן',
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
                  { id: 'yahrzeit', label: 'יום זיכרון', icon: Flame },
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
                  data-testid="add-event-hebrew-year"
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


export default AddEventView;

