import React from 'react';
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  PlusCircle,
  ArrowLeftRight,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Shield,
} from 'lucide-react';
import { cn } from '../lib/utils';

export type AppTabId = 'dashboard' | 'calendar' | 'add-event' | 'import-export' | 'support' | 'privacy';

type AppShellSidebarProps = {
  activeTab: AppTabId;
  setActiveTab: (tab: AppTabId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
};

const AppShellSidebar = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  onToggleCollapse,
  isMobileMenuOpen,
  onCloseMobileMenu,
}: AppShellSidebarProps) => {
  const navItems: Array<{ id: AppTabId; label: string; icon: React.ComponentType<{ size?: number }> }> = [
    { id: 'dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
    { id: 'calendar', label: 'לוח שנה', icon: CalendarIcon },
    { id: 'add-event', label: 'הוספת אירוע', icon: PlusCircle },
    { id: 'import-export', label: 'ייצוא וייבוא', icon: ArrowLeftRight },
  ];

  return (
    <aside
      className={cn(
        'h-screen fixed right-0 top-0 border-l border-slate-200 bg-slate-100 flex flex-col p-4 gap-2 z-50 overflow-y-auto transition-all duration-300 w-72 max-w-[88vw] md:max-w-none',
        isCollapsed ? 'md:w-20' : 'md:w-64',
        isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
      )}
    >
      <div className="mb-8 px-2">
        <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'justify-between gap-3')}>
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
              'flex items-center px-3 py-2 rounded-lg transition-all duration-200 ease-in-out text-right',
              isCollapsed ? 'justify-center' : 'gap-3',
              activeTab === item.id
                ? 'bg-white text-blue-700 font-bold shadow-sm'
                : 'text-slate-600 hover:text-blue-600 hover:bg-slate-200'
            )}
          >
            <item.icon size={18} />
            {!isCollapsed && <span className="text-sm tracking-wide">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-200 pt-4 flex flex-col gap-1">
        <button
          onClick={() => {
            setActiveTab('support');
            onCloseMobileMenu();
          }}
          title="תמיכה"
          className={cn(
            'flex items-center px-3 py-2 rounded-lg transition-all text-right w-full',
            isCollapsed ? 'justify-center' : 'gap-3',
            activeTab === 'support'
              ? 'bg-white text-blue-700 font-bold shadow-sm'
              : 'text-slate-600 hover:text-blue-600 hover:bg-slate-200'
          )}
        >
          <HelpCircle size={18} />
          {!isCollapsed && <span className="text-sm tracking-wide">תמיכה</span>}
        </button>
        <button
          onClick={() => {
            setActiveTab('privacy');
            onCloseMobileMenu();
          }}
          title="מדיניות פרטיות"
          className={cn(
            'flex items-center px-3 py-2 rounded-lg transition-all text-right w-full',
            isCollapsed ? 'justify-center' : 'gap-3',
            activeTab === 'privacy'
              ? 'bg-white text-blue-700 font-bold shadow-sm'
              : 'text-slate-600 hover:text-blue-600 hover:bg-slate-200'
          )}
        >
          <Shield size={18} />
          {!isCollapsed && <span className="text-sm tracking-wide">מדיניות פרטיות</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppShellSidebar;
