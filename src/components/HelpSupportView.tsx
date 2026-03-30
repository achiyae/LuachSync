import React from 'react';
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  Download,
  ExternalLink,
  LifeBuoy,
  MessageCircleQuestion,
  RefreshCw,
  Upload,
} from 'lucide-react';

const ISSUES_URL = 'http://github.com/achiyae/HebrewCalendar/issues';

export default function HelpSupportView() {
  return (
    <section className="p-4 sm:p-8 lg:p-10 space-y-6 max-w-5xl">
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wide mb-4">
          <LifeBuoy size={14} />
          <span>תמיכה</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">מדריך שימוש מלא ב-HC4GC</h2>
        <p className="mt-3 text-sm sm:text-base text-blue-100 max-w-2xl">
          העמוד הזה מרכז את כל מה שצריך כדי לעבוד מהר ונכון: הוספת אירועים, ניהול תזכורות,
          ייצוא/ייבוא וסנכרון ליומן גוגל.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">שלב 1</p>
          <h3 className="mt-1 font-bold text-slate-900">הוספת אירועים</h3>
          <p className="text-sm text-slate-600 mt-1">התחילו במסך הוספת אירוע והגדירו תאריך עברי.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">שלב 2</p>
          <h3 className="mt-1 font-bold text-slate-900">בדיקה בלוח בקרה</h3>
          <p className="text-sm text-slate-600 mt-1">ערכו, סננו וחפשו אירועים לפני ייצוא.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">שלב 3</p>
          <h3 className="mt-1 font-bold text-slate-900">בחירת תזכורות</h3>
          <p className="text-sm text-slate-600 mt-1">הגדירו ברירת מחדל גלובלית או עקיפה לכל אירוע.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">שלב 4</p>
          <h3 className="mt-1 font-bold text-slate-900">ייצוא/סנכרון</h3>
          <p className="text-sm text-slate-600 mt-1">ייצוא ICS או סנכרון אוטומטי ליומן Google.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <CalendarPlus size={18} className="text-blue-700" />
          איך משתמשים באפליקציה בפועל
        </h3>
        <ol className="space-y-3 text-sm sm:text-base text-slate-700 list-decimal pr-5">
          <li>
            עברו למסך <strong>הוספת אירוע</strong> והכניסו שם אירוע, סוג אירוע ותאריך עברי (יום, חודש, שנה).
          </li>
          <li>
            אם תרצו תזכורת שונה לאירוע מסוים, הגדירו <strong>עקיפת תזכורות</strong> באותו מסך.
          </li>
          <li>
            חזרו ל<strong>לוח בקרה</strong> כדי לבדוק את הרשימה, לערוך אירועים או למחוק אירועים שלא צריכים.
          </li>
          <li>
            עברו למסך <strong>ייצוא וייבוא</strong>, בחרו אילו סוגי אירועים לכלול והגדירו תזכורת גלובלית לייצוא.
          </li>
          <li>
            ייצאו לקובץ ICS או השתמשו בסנכרון האוטומטי ל-Google Calendar.
          </li>
        </ol>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <RefreshCw size={18} className="text-blue-700" />
            תזכורות: מה ההבדל בין גלובלי לעקיפה
          </h3>
          <ul className="space-y-2 text-sm sm:text-base text-slate-700 list-disc pr-5">
            <li>במסך ייצוא וייבוא יש הגדרת תזכורת גלובלית לכל האירועים המיוצאים.</li>
            <li>במסך הוספת אירוע ניתן לעקוף את ברירת המחדל לאירוע בודד.</li>
            <li>אם באירוע נבחר "השתמש בהגדרת הייצוא", הוא יקבל את ההגדרה הגלובלית.</li>
            <li>אם באירוע נבחרת אפשרות אחרת, היא תגבר על ההגדרה הגלובלית.</li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Upload size={18} className="text-blue-700" />
            ייבוא וייצוא נתונים
          </h3>
          <ul className="space-y-2 text-sm sm:text-base text-slate-700 list-disc pr-5">
            <li>
              <strong>ייצוא:</strong> יוצר קובץ ICS שאפשר לייבא לכל יומן תומך iCalendar.
            </li>
            <li>
              <strong>ייבוא:</strong> טוען קבצי נתונים לאפליקציה ומחליף את הרשימה הקיימת.
            </li>
            <li>
              <strong>מומלץ:</strong> לפני ייבוא חדש, בצעו ייצוא גיבוי כדי לשמור עותק עדכני.
            </li>
          </ul>
          <div className="inline-flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Download size={14} />
            גיבוי קבוע מונע אובדן מידע במקרה של טעויות ייבוא.
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
        <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
          <AlertTriangle size={18} />
          חשוב לדעת על סנכרון ל-Google Calendar
        </h3>
        <p className="text-sm sm:text-base text-amber-900/90">
          בסנכרון האוטומטי נבחר שם יומן יעד. אם כבר קיים יומן באותו שם בחשבון,
          האפליקציה תציג אזהרה והיומן הקיים יימחק ויווצר מחדש לפני העלאת האירועים.
        </p>
        <ul className="space-y-2 text-sm sm:text-base text-amber-900 list-disc pr-5">
          <li>בדקו היטב את שם היומן לפני אישור הסנכרון.</li>
          <li>אם מדובר ביומן חשוב, שקלו קודם לייצא לקובץ ICS כגיבוי.</li>
          <li>מומלץ לבצע סנכרון ראשון ליומן חדש לבדיקה.</li>
        </ul>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
        <h3 className="text-lg font-bold text-slate-900">שאלות נפוצות</h3>
        <div className="space-y-3 text-sm sm:text-base text-slate-700">
          <p>
            <strong>איפה נשמרים הנתונים?</strong><br />
            הנתונים נשמרים בדפדפן המקומי (Local Storage) של אותו מחשב ואותו דפדפן.
          </p>
          <p>
            <strong>עברתי מחשב או דפדפן, למה האירועים לא הופיעו?</strong><br />
            כי האחסון מקומי. העבירו נתונים באמצעות ייצוא/ייבוא.
          </p>
          <p>
            <strong>איך אדע שהסנכרון הצליח?</strong><br />
            בסיום יוצג סיכום עם כמות האירועים שנוספו וקישור לפתיחת היומן בגוגל.
          </p>
          <p>
            <strong>מה לעשות אם יש שגיאה בסנכרון?</strong><br />
            בדקו הרשאות Google, שם יומן, וחיבור רשת. אם התקלה נמשכת, פתחו issue עם צילום מסך.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <MessageCircleQuestion className="text-blue-700 mt-0.5" size={20} />
          <div>
            <h3 className="text-lg font-bold text-slate-900">פנו אלינו דרך GitHub Issues</h3>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">
              לחצו על הכפתור, פתחו issue חדש, ותארו: מה ניסיתם לעשות, מה קרה בפועל,
              ומה ציפיתם שיקרה. כך אפשר לעזור מהר יותר.
            </p>
          </div>
        </div>

        <a
          href={ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors"
        >
          <span>פתח GitHub Issues</span>
          <ExternalLink size={16} />
        </a>

        <div className="mt-4 inline-flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <CheckCircle2 size={14} />
          קישור התמיכה הרשמי: GitHub Issues בלבד.
        </div>
      </div>
    </section>
  );
}
