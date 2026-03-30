import React from 'react';
import { Shield, ExternalLink } from 'lucide-react';

const ISSUES_URL = 'https://github.com/achiyae/HebrewCalendar/issues';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h3 className="text-base font-bold text-slate-800">{title}</h3>
    <div className="text-sm text-slate-600 space-y-1">{children}</div>
  </div>
);

const OL = ({ items }: { items: React.ReactNode[] }) => (
  <ol className="list-decimal list-inside space-y-1">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ol>
);

export default function PrivacyView() {
  return (
    <section className="p-4 sm:p-8 lg:p-10 space-y-6 max-w-3xl">
      <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wide mb-4">
          <Shield size={14} />
          <span>פרטיות</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">מדיניות הפרטיות של HC4GC</h2>
        <p className="mt-3 text-sm sm:text-base text-slate-300">
          תאריך תחילת תוקף: 30 במרץ 2026
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
        <p className="text-sm text-slate-600">
          מדיניות פרטיות זו מסבירה כיצד HC4GC מטפלת בנתונים בעת השימוש באפליקציה.
        </p>

        <Section title="1. מה האפליקציה עושה">
          <p>HC4GC עוזרת לך לנהל אירועי לוח שנה עברי ולייצא/לסנכרן אותם ל-Google Calendar.</p>
        </Section>

        <Section title="2. נתונים שנאספים">
          <p>HC4GC אינה מפעילה שרת לאחסון נתוני האירועים האישיים שלך.</p>
          <p className="mt-2">האפליקציה עשויה לעבד את הנתונים הבאים בדפדפן שלך:</p>
          <OL items={[
            'מידע על אירועים שהזנת (לדוגמה: כותרת, סוג אירוע, תאריך עברי, הגדרות תזכורת).',
            'הגדרות אפליקציה (לדוגמה: העדפות ייצוא).',
            'אסימון גישה זמני של Google OAuth במהלך סשן סנכרון.',
          ]} />
        </Section>

        <Section title="3. היכן מאוחסנים הנתונים">
          <OL items={[
            'נתוני האירועים וההגדרות שלך מאוחסנים באופן מקומי בדפדפן שלך (Local Storage).',
            'הנתונים נשארים במכשיר/דפדפן שלך אלא אם בחרת לייצא/לסנכרן.',
            'אם תמחק את אחסון הדפדפן, ייתכן שנתוני האפליקציה המקומיים יימחקו.',
          ]} />
        </Section>

        <Section title="4. גישה ל-Google Calendar">
          <p>אם אתה משתמש בסנכרון אוטומטי עם Google, HC4GC מבקשת הרשאת Google OAuth לניהול לוחות שנה/אירועים בחשבון Google שלך.</p>
          <OL items={[
            <>היקף OAuth בשימוש: <code className="bg-slate-100 px-1 rounded text-xs">https://www.googleapis.com/auth/calendar</code></>,
            'הגישה משמשת רק לביצוע פעולות שביקשת (כגון יצירת לוח שנה וייבוא אירועים).',
            'לא נעשה שימוש ב-OAuth Client Secret או מפתחות פרטיים של חשבון שירות באפליקציה זו.',
          ]} />
        </Section>

        <Section title="5. ייצוא וייבוא ידני">
          <OL items={[
            'ניתן לייצא אירועים לקובץ ICS.',
            'ניתן לייבא את קובץ ה-ICS ידנית ל-Google Calendar.',
            'קבצים מיוצאים מטופלים על ידי הדפדפן/מכשיר שלך וכל שירות שאליו תעלה אותם.',
          ]} />
        </Section>

        <Section title="6. אזהרה לגבי לוח שנה קיים">
          <p>בעת שימוש בסנכרון אוטומטי עם שם לוח שנה שכבר קיים בחשבון Google שלך, האפליקציה מזהירה אותך לפני מחיקה/יצירה מחדש של אותו לוח שנה. אתה אחראי לאישור פעולה זו.</p>
        </Section>

        <Section title="7. שירותי צד שלישי">
          <p>HC4GC עשויה לתקשר עם שירותי צד שלישי רק כאשר אתה בוחר במפורש בתכונות הדורשות זאת, כגון:</p>
          <OL items={[
            'Google Calendar API',
            'Google OAuth',
          ]} />
          <p className="mt-2">השימוש בשירותים אלה כפוף גם לתנאים ומדיניות הפרטיות שלהם.</p>
        </Section>

        <Section title="8. ילדים ונתונים רגישים">
          <p>אל תאחסן מידע אישי רגיש מאוד בכותרות/תיאורים של אירועים. האפליקציה מיועדת לניהול לוח שנה ואירועי מחזור חיים כלליים.</p>
        </Section>

        <Section title="9. הבחירות שלך">
          <p>באפשרותך:</p>
          <OL items={[
            'לערוך או למחוק אירועים באפליקציה.',
            'לנקות את האחסון המקומי בדפדפן.',
            'להימנע מסנכרון Google ולהשתמש רק בתהליכי עבודה מקומיים/יצוא.',
          ]} />
        </Section>

        <Section title="10. הערת אבטחה">
          <p>אף שיטת אחסון/שידור אלקטרונית אינה מאובטחת ב-100%. שמור על אבטחת המכשיר והדפדפן שלך, ובדוק את הנתונים לפני הסנכרון.</p>
        </Section>

        <Section title="11. שינויים במדיניות זו">
          <p>מדיניות זו עשויה להתעדכן מעת לעת. תאריך התחילה לעיל משקף את הגרסה האחרונה.</p>
        </Section>

        <Section title="12. יצירת קשר ותמיכה">
          <p>לשאלות פרטיות, דיווח על באגים או בקשות תמיכה, פתח issue:</p>
          <a
            href={ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:underline font-medium"
          >
            github.com/achiyae/HebrewCalendar/issues
            <ExternalLink size={13} />
          </a>
        </Section>
      </div>
    </section>
  );
}
