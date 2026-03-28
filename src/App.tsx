/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, FormEvent } from 'react';
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
  MoreVertical,
  Cake,
  Heart,
  Church,
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
import { HDate, Zmanim, Location, getSedra } from '@hebcal/core';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { cn } from './lib/utils';
import { CalendarEvent, EventType } from './types';

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
  const navItems = [
    { id: 'dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
    { id: 'calendar', label: 'לוח שנה', icon: CalendarIcon },
    { id: 'add-event', label: 'הוספת אירוע', icon: PlusCircle },
    { id: 'import-export', label: 'ייצוא וייבוא', icon: ArrowLeftRight },
  ];

  return (
    <aside className="h-screen w-64 fixed right-0 top-0 border-l border-slate-200 bg-slate-100 flex flex-col p-4 gap-2 z-50 overflow-y-auto">
      <div className="mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-blue-600 flex items-center justify-center text-white">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="font-bold text-blue-900 leading-tight">סופר מהיר</h2>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 opacity-70">מערכת לוח שנה עברי</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out text-right",
              activeTab === item.id 
                ? "bg-white text-blue-700 font-bold shadow-sm" 
                : "text-slate-600 hover:text-blue-600 hover:bg-slate-200"
            )}
          >
            <item.icon size={18} />
            <span className="text-sm tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-200 pt-4 flex flex-col gap-1">
        <button className="w-full mb-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg font-semibold text-sm shadow-sm hover:opacity-90 active:scale-95 transition-all">
          סנכרון לוח שנה
        </button>
        <button className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-slate-200 rounded-lg transition-all text-right w-full">
          <Settings size={18} />
          <span className="text-sm tracking-wide">הגדרות</span>
        </button>
        <button className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-slate-200 rounded-lg transition-all text-right w-full">
          <HelpCircle size={18} />
          <span className="text-sm tracking-wide">תמיכה</span>
        </button>
      </div>
    </aside>
  );
};

const TopBar = ({ title }: { title: string }) => {
  return (
    <header className="w-full sticky top-0 z-40 bg-slate-50 flex justify-between items-center px-6 py-3 border-b border-slate-200/50">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold tracking-tight text-blue-900">{title}</h1>
      </div>
      <div className="flex-1 max-w-xl mx-8">
        <div className="relative flex items-center">
          <Search className="absolute right-3 text-slate-400" size={18} />
          <input 
            className="w-full bg-slate-100 border-none rounded-full py-2 pr-10 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all text-right"
            dir="rtl"
            placeholder="חיפוש אירועים, תאריכים או שמות..."
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full hover:bg-slate-200/50 transition-colors text-slate-500">
          <Bell size={20} />
        </button>
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

const DashboardView = ({ events, onAddClick }: { events: CalendarEvent[], onAddClick: () => void }) => {
  const today = new Date();
  const hDate = new HDate(today);
  
  const zmanim = useMemo(() => {
    const loc = new Location(31.7683, 35.2137, true, 'Asia/Jerusalem'); // Jerusalem
    const z = new Zmanim(loc, today, false);
    const formatTime = (d: Date | null) => d ? format(d, 'hh:mm a') : '--:--';
    return {
      alotHaShachar: formatTime(z.alotHaShachar()),
      netzHaChama: formatTime(z.neitzHaChama()),
      sofZmanKriasShema: formatTime(z.sofZmanShmaMGA()),
      chatzos: formatTime(z.chatzot()),
      shkiya: formatTime(z.shkiah()),
    };
  }, [today]);

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1 font-semibold">השקפה יומית</p>
          <h2 className="text-4xl font-bold text-slate-900">{hDate.renderGematriya()}</h2>
          <p className="text-slate-500 font-medium">
            {format(today, 'EEEE, d MMMM yyyy')} • פרשת {getSedra(hDate.getFullYear(), false).lookup(hDate)?.parsha?.join('-') || 'אין פרשה'}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-300 transition-colors">
            תצוגת חודש
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

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <button className="px-4 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold whitespace-nowrap">כל האירועים</button>
        <button className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-full text-xs font-semibold whitespace-nowrap hover:bg-slate-300 transition-colors">ימי הולדת</button>
        <button className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-full text-xs font-semibold whitespace-nowrap hover:bg-slate-300 transition-colors">ימי נישואין</button>
        <button className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-full text-xs font-semibold whitespace-nowrap hover:bg-slate-300 transition-colors">אזכרות</button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <h3 className="text-xs uppercase tracking-[0.15em] text-slate-500 font-bold">אזכרות ושמחות קרובות</h3>
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                אין אירועים קרובים. לחץ על "אירוע חדש" כדי להתחיל.
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="group bg-white p-6 rounded-xl transition-all hover:bg-slate-50 flex items-start gap-6 border border-transparent hover:border-slate-200 shadow-sm">
                  <div className={cn(
                    "flex flex-col items-center justify-center w-16 h-16 rounded-lg shrink-0",
                    event.type === 'yahrzeit' ? "bg-purple-100 text-purple-800" : 
                    event.type === 'birthday' ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"
                  )}>
                    <span className="text-xs font-bold leading-none">מאי</span>
                    <span className="text-2xl font-extrabold">24</span>
                  </div>
                  <div className="flex-1 text-right">
                    <div className="flex justify-between items-center mb-1">
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] font-bold uppercase rounded tracking-wider",
                        event.type === 'yahrzeit' ? "bg-purple-200 text-purple-900" : 
                        event.type === 'birthday' ? "bg-orange-200 text-orange-900" : "bg-blue-200 text-blue-900"
                      )}>
                        {event.type === 'yahrzeit' ? 'אזכרה' : event.type === 'birthday' ? 'יום הולדת' : 'יום נישואין'}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{event.hebrewDate.day} {event.hebrewDate.month}</span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">{event.title}</h4>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">{event.description}</p>
                  </div>
                  <div className="shrink-0">
                    <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-blue-50 p-6 rounded-xl space-y-4 border border-blue-100">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-blue-900">מאי 2024 / אייר תשפ״ד</h4>
              <div className="flex gap-2">
                <ChevronRight className="text-slate-400 cursor-pointer" size={18} />
                <ChevronLeft className="text-slate-400 cursor-pointer" size={18} />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center">
              {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(day => (
                <span key={day} className="text-[10px] font-bold text-slate-400">{day}</span>
              ))}
              {Array.from({ length: 31 }).map((_, i) => (
                <span key={i} className={cn(
                  "text-xs py-1 rounded-full cursor-pointer hover:bg-blue-200 transition-colors",
                  i + 1 === 14 ? "bg-blue-600 text-white font-bold" : "text-slate-700"
                )}>
                  {i + 1}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-xs uppercase tracking-[0.15em] text-slate-500 font-bold mb-4">זמני היום (ירושלים)</h4>
            <div className="space-y-3">
              {[
                { label: 'עלות השחר', value: zmanim.alotHaShachar },
                { label: 'נץ החמה', value: zmanim.netzHaChama },
                { label: 'סוף זמן קריאת שמע', value: zmanim.sofZmanKriasShema },
                { label: 'חצות היום', value: zmanim.chatzos },
                { label: 'שקיעת החמה', value: zmanim.shkiya },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  <span className="text-sm font-bold text-blue-600">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-blue-600 p-6 text-white">
            <div className="relative z-10">
              <h4 className="font-extrabold text-xl leading-tight">התראת <br/>יזכור</h4>
              <p className="text-xs text-blue-100 mt-2">קבלו תזכורות אוטומטיות להדלקת נר נשמה.</p>
              <button className="mt-4 px-3 py-1.5 bg-white text-blue-700 text-[11px] font-bold rounded uppercase tracking-wider hover:bg-blue-50 transition-colors">
                הפעל עכשיו
              </button>
            </div>
            <Sparkles className="absolute -left-4 -bottom-4 text-[120px] opacity-10 rotate-12" />
          </div>
        </div>
      </div>
    </div>
  );
};

const AddEventView = ({ onSave, onCancel }: { onSave: (e: CalendarEvent) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    title: '',
    type: 'birthday' as EventType,
    day: 1,
    month: 'ניסן',
    year: 5784,
    description: ''
  });

  const months = [
    'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול', 'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב׳'
  ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      id: Math.random().toString(36).substr(2, 9),
      title: formData.title,
      type: formData.type,
      hebrewDate: {
        day: formData.day,
        month: formData.month,
        year: formData.year
      },
      description: formData.description
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-10">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 opacity-60">ניהול ארכיון</span>
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
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'birthday', label: 'יום הולדת', icon: Cake },
                  { id: 'anniversary', label: 'יום נישואין', icon: Heart },
                  { id: 'yahrzeit', label: 'יארצייט', icon: Church },
                ].map((type) => (
                  <label key={type.id} className="cursor-pointer">
                    <input 
                      type="radio" 
                      name="event_type" 
                      className="hidden peer" 
                      checked={formData.type === type.id}
                      onChange={() => setFormData({ ...formData, type: type.id as EventType })}
                    />
                    <div className="text-center py-4 border border-slate-200 rounded-lg peer-checked:bg-blue-50 peer-checked:border-blue-600 peer-checked:text-blue-700 transition-all">
                      <type.icon className="mx-auto mb-1" size={20} />
                      <span className="text-[11px] font-semibold">{type.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">שם מלא</label>
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
              <p className="text-[10px] text-slate-400 italic">כלול שם עברי מלא לדיוק הלכתי במידת הצורך.</p>
            </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="w-1.5 h-6 bg-slate-400 rounded-full"></span>
              בחירת תאריך עברי
            </h3>
            <div className="flex bg-slate-100 rounded-lg p-1 text-[10px] font-bold">
              <button type="button" className="px-3 py-1 bg-white rounded shadow-sm text-blue-600 uppercase tracking-tighter">ישראל</button>
              <button type="button" className="px-3 py-1 text-slate-400 uppercase tracking-tighter">חוץ לארץ</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">חודש עברי</label>
              <select 
                className="w-full bg-slate-50 border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500/20 text-sm appearance-none text-right"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
              >
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">יום (1-30)</label>
              <input 
                className="w-full bg-slate-50 border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500/20 text-sm text-right"
                type="number" min="1" max="30"
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">שנה עברית</label>
              <input 
                className="w-full bg-slate-50 border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500/20 text-sm text-right"
                placeholder="תשפ״ד"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                type="number"
              />
            </div>
          </div>
          <div className="mt-8 p-4 bg-blue-50 rounded-lg flex gap-4 items-start">
            <Lightbulb className="text-blue-600 mt-0.5" size={20} />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-tight text-blue-700 mb-1">לוגיקת חישוב</h4>
              <p className="text-xs text-slate-600 leading-relaxed">בחירה ב'ישראל' תתאים את החגים (כגון סוכות ופסח) למנהגי היום האחד בארץ. ימי הולדת וימי זיכרון מחושבים על פי מעבר השקיעה של התאריך שנבחר.</p>
            </div>
          </div>
        </section>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-slate-50 p-6 rounded-xl border border-slate-200 flex items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 leading-none">{formData.month}</span>
              <span className="text-2xl font-extrabold text-blue-900">{formData.day}</span>
            </div>
            <div>
              <h4 className="font-bold text-slate-900">סיכום תצוגה מקדימה</h4>
              <p className="text-xs text-slate-500">תאריך גרגוריאני מחושב: 26 באפריל, 2024</p>
              <p className="text-xs text-slate-500 italic">פרשת אחרי מות</p>
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
  
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="p-6 flex-1 flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold mb-1">אדר א' - אדר ב' תשפ"ד</p>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">{format(currentMonth, 'MMMM yyyy')}</h2>
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
            return (
              <div key={i} className={cn(
                "min-h-[120px] p-3 border-l border-b border-slate-50 hover:bg-slate-50 transition-colors flex flex-col gap-2 group",
                isToday && "bg-blue-50/30 ring-1 ring-inset ring-blue-200"
              )}>
                <div className="flex justify-between items-start">
                  <span className={cn(
                    "text-xs font-bold",
                    isToday ? "text-blue-600 px-1.5 py-0.5 bg-blue-100 rounded" : "text-slate-900"
                  )}>{format(day, 'd')}</span>
                  <span className="text-[10px] font-bold text-slate-400">{hDate.renderGematriya()}</span>
                </div>
                <div className="flex flex-col gap-1">
                  {/* Mock events for visual fidelity */}
                  {i === 10 && <div className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded-full truncate font-bold">ראש חודש</div>}
                  {i === 22 && <div className="text-[10px] px-2 py-0.5 bg-red-600 text-white font-bold rounded-full truncate">פורים</div>}
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
              { color: 'bg-blue-600', label: 'חגים ומועדים' },
              { color: 'bg-blue-300', label: 'ימי הולדת' },
              { color: 'bg-red-600', label: 'אזכרות' },
              { color: 'bg-purple-300', label: 'אישי' },
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
            <p className="text-lg font-bold">פורים</p>
            <p className="text-xs text-slate-500">עוד 13 ימים (23 במרץ)</p>
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
    </div>
  );
};

const ImportExportView = () => {
  const xmlPreview = `<?xml version="1.0" encoding="UTF-8"?>
<scribe_calendar version="2.4">
  <metadata>
    <generated_at>2024-05-20T10:30Z</generated_at>
    <scope>5784</scope>
    <location>Jerusalem</location>
  </metadata>

  <events>
    <event id="772" type="holiday">
      <title>Rosh Hashanah</title>
      <date>
        <hebrew>01 Tishrei 5784</hebrew>
        <gregorian>2023-09-16</gregorian>
      </date>
    </event>
    
    // ... [Additional records omitted]
  </events>
</scribe_calendar>`;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8 text-right">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1">כלי ניהול נתונים</p>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">ייצוא וייבוא נתוני לוח שנה</h1>
        <p className="text-slate-500 max-w-2xl">נהל את המידע הליטורגי שלך בדיוק מרבי. הורד נתונים בפורמטים תקניים או ייבא קבצי XML קיימים לעיבוד במערכת.</p>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-right">
            <div className="flex items-center gap-3 mb-6">
              <ArrowLeftRight className="text-blue-600" size={20} />
              <h3 className="font-bold text-lg">טווח אירועים לייצוא</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">טווח תאריכים</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 px-3 py-2 rounded border border-slate-100">
                    <span className="block text-[10px] text-slate-400">התחלה</span>
                    <span className="text-sm font-medium">א' תשרי ה'תשפ״ד</span>
                  </div>
                  <div className="bg-slate-50 px-3 py-2 rounded border border-slate-100">
                    <span className="block text-[10px] text-slate-400">סיום</span>
                    <span className="text-sm font-medium">כ״ט אלול ה'תשפ״ד</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">כלול סוגי אירועים</label>
                <div className="flex flex-wrap gap-2 justify-start">
                  <span className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-medium flex items-center gap-2">
                    זמנים <Check size={14} />
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium flex items-center gap-2">
                    חגים <Check size={14} />
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium flex items-center gap-2 cursor-pointer hover:bg-slate-200 transition-colors">
                    פרשיות <Plus size={14} />
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-right">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="text-blue-600" size={20} />
              <h3 className="font-bold text-lg">מבנה פלט</h3>
            </div>
            <div className="space-y-3">
              {[
                { id: 'xml', label: 'מבנה XML סטנדרטי (v2.4)', desc: 'מומלץ עבור יישומי אינטרנט וספריית סופר' },
                { id: 'ics', label: 'iCalendar (.ics)', desc: 'מתאים ל-Google Calendar, Outlook ו-Apple' },
                { id: 'json', label: 'נתונים גולמיים (JSON)', desc: 'זוגות מפתח-ערך לא מעובדים לניתוח נתונים' },
              ].map((schema) => (
                <label key={schema.id} className="relative flex items-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input type="radio" name="schema" className="text-blue-600 focus:ring-blue-500 w-4 h-4 ml-4" defaultChecked={schema.id === 'xml'} />
                  <div>
                    <span className="block text-sm font-bold text-slate-900">{schema.label}</span>
                    <span className="block text-[11px] text-slate-500">{schema.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-right">
            <div className="flex items-center gap-3 mb-4">
              <ArrowLeftRight className="text-blue-600" size={20} />
              <h3 className="font-bold text-lg">ייבוא נתונים</h3>
            </div>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud className="text-blue-600" size={24} />
              </div>
              <p className="text-sm font-bold text-slate-900 mb-1">גרור קובץ XML לכאן</p>
              <p className="text-[10px] text-slate-500 mb-4">או לחץ לבחירת קובץ מהמחשב</p>
              <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors">
                בחר קובץ
              </button>
            </div>
          </section>

          <div className="pt-2">
            <button className="w-full bg-gradient-to-r from-blue-600 to-blue-800 p-4 rounded-xl text-white font-bold flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all group">
              <Download className="group-hover:translate-y-1 transition-transform" size={20} />
              בצע הורדת נתונים
            </button>
            <p className="text-center mt-3 text-[11px] text-slate-400 uppercase tracking-widest opacity-60">נפח משוער: 442 KB</p>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 flex flex-col h-full min-h-[600px]">
          <div className="flex-1 bg-slate-900 rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-white/5 px-6 py-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/40"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/40"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/40"></div>
                </div>
                <span className="mr-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">תצוגה מקדימה של XML</span>
              </div>
              <button className="text-slate-500 hover:text-white transition-colors">
                <Copy size={18} />
              </button>
            </div>
            <div className="p-8 font-mono text-sm leading-relaxed text-blue-100/80 overflow-y-auto h-full text-left" dir="ltr">
              <pre><code>{xmlPreview}</code></pre>
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
              סכמת XML זו משתמשת בתקן ISO 8601 עבור ערכי זמן ובהרחבות מותאמות אישית עבור תאריכים ליטורגיים עבריים. לשילוב קל עם יומנים אישיים, מומלץ להשתמש בפורמט iCalendar החדש שהוספנו.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: '1',
      title: 'אברהם בן תרח',
      type: 'yahrzeit',
      hebrewDate: { day: 16, month: 'אייר', year: 5784 },
      description: 'יום השנה ה-25. נהוג להדליק נר נשמה לפני השקיעה ביום חמישי.'
    },
    {
      id: '2',
      title: 'שרה רבקה גולדשטיין',
      type: 'birthday',
      hebrewDate: { day: 25, month: 'אייר', year: 5784 },
      description: 'חוגגת 12 (בת מצווה). התאריך העברי הוא תאריך החגיגה המרכזי.'
    },
    {
      id: '3',
      title: 'החתונה של דוד ולאה',
      type: 'anniversary',
      hebrewDate: { day: 2, month: 'סיוון', year: 5784 },
      description: 'יום נישואין ה-15. נחגג לפי התאריך העברי מאז שנת תשס״ט.'
    }
  ]);

  const handleSaveEvent = (newEvent: CalendarEvent) => {
    setEvents([...events, newEvent]);
    setActiveTab('dashboard');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView events={events} onAddClick={() => setActiveTab('add-event')} />;
      case 'calendar':
        return <CalendarView events={events} />;
      case 'add-event':
        return <AddEventView onSave={handleSaveEvent} onCancel={() => setActiveTab('dashboard')} />;
      case 'import-export':
        return <ImportExportView />;
      default:
        return <DashboardView events={events} onAddClick={() => setActiveTab('add-event')} />;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'הסופר המודרני';
      case 'calendar': return 'לוח שנה';
      case 'add-event': return 'הוספת אירוע';
      case 'import-export': return 'ייצוא וייבוא';
      default: return 'הסופר המודרני';
    }
  };

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen flex font-['Assistant',_sans-serif]" dir="rtl">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 mr-64 flex flex-col min-h-screen">
        <TopBar title={getTitle()} />
        
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

        <footer className="w-full mt-auto py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center px-8">
          <div className="text-slate-400 font-inter text-[11px] uppercase tracking-widest">
            © 2024 הסופר המודרני • מערכת פעילה
          </div>
          <div className="flex gap-6">
            <button className="text-slate-400 hover:text-blue-800 font-inter text-[11px] uppercase tracking-widest transition-colors opacity-80 hover:opacity-100">סטטוס</button>
            <button className="text-slate-400 hover:text-blue-800 font-inter text-[11px] uppercase tracking-widest transition-colors opacity-80 hover:opacity-100">פרטיות</button>
            <button className="text-slate-400 hover:text-blue-800 font-inter text-[11px] uppercase tracking-widest transition-colors opacity-80 hover:opacity-100">תנאים</button>
          </div>
        </footer>
      </main>

      {/* Floating Action Button */}
      {activeTab !== 'add-event' && (
        <button 
          onClick={() => setActiveTab('add-event')}
          className="fixed bottom-8 left-8 h-14 w-14 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-2xl flex items-center justify-center group active:scale-95 transition-all z-50"
        >
          <Plus className="group-hover:rotate-90 transition-transform" size={24} />
        </button>
      )}
    </div>
  );
}
