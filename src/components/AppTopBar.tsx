import React from 'react';
import { Github, HelpCircle, Menu } from 'lucide-react';

const REPOSITORY_URL = 'https://github.com/achiyae/HebrewCalendar';

type AppTopBarProps = {
  title: string;
  onOpenMobileMenu: () => void;
  onOpenSupport: () => void;
};

const AppTopBar = ({ title, onOpenMobileMenu, onOpenSupport }: AppTopBarProps) => {
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
        <a
          href={REPOSITORY_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub repository"
          aria-label="GitHub repository"
          className="p-2 rounded-full hover:bg-slate-200/50 transition-colors text-slate-500"
        >
          <Github size={20} />
        </a>
        <button
          onClick={onOpenSupport}
          title="תמיכה"
          aria-label="תמיכה"
          className="p-2 rounded-full hover:bg-slate-200/50 transition-colors text-slate-500"
        >
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

export default AppTopBar;
