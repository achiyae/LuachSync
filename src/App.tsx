/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from './lib/utils';
import { CalendarEvent } from './types';
import HelpSupportView from './components/HelpSupportView';
import PrivacyView from './components/PrivacyView';
import TermsView from './components/TermsView';
import AppShellSidebar, { AppTabId } from './components/AppShellSidebar';
import AppTopBar from './components/AppTopBar';
import DashboardView from './views/DashboardView';
import AddEventView from './views/AddEventView';
import CalendarView from './views/CalendarView';
import ImportExportView from './views/ImportExportView';
import { usePersistedAppState } from './hooks/usePersistedAppState';
import { useAppActions } from './hooks/useAppActions';

const TAB_TITLES: Record<AppTabId, string> = {
  dashboard: 'יומן עברי ליומן גוגל',
  calendar: 'לוח שנה',
  'add-event': 'הוספת אירוע',
  'import-export': 'ייצוא וייבוא',
  support: 'תמיכה ועזרה',
  privacy: 'מדיניות פרטיות',
  terms: 'תנאי שימוש',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTabId>('dashboard');
  const { events, exportSettings, setEvents, setExportSettings } = usePersistedAppState();

  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isImportExportSyncing, setIsImportExportSyncing] = useState(false);

  const {
    handleSaveEvent,
    handleEdit,
    handleDelete,
    handleClearAll,
    handleImportEvents,
  } = useAppActions({
    events,
    editingEvent,
    setEvents,
    setExportSettings,
    setEditingEvent,
    setActiveTab,
  });

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const requestTabChange = (nextTab: AppTabId) => {
    if (activeTab === 'import-export' && isImportExportSyncing && nextTab !== 'import-export') {
      const shouldLeave = window.confirm('הסנכרון ליומן גוגל עדיין פעיל. יציאה עכשיו תעצור את התהליך. להמשיך?');
      if (!shouldLeave) {
        return;
      }
    }

    setActiveTab(nextTab);
  };

  const dashboardView = (
    <DashboardView
      events={events}
      onAddClick={() => requestTabChange('add-event')}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onClearAll={handleClearAll}
    />
  );

  const addEventView = (
    <AddEventView
      events={events}
      initialData={editingEvent}
      onSave={handleSaveEvent}
      onCancel={() => {
        setEditingEvent(null);
        setActiveTab('dashboard');
      }}
    />
  );

  const tabContent: Record<AppTabId, React.ReactNode> = {
    dashboard: dashboardView,
    calendar: <CalendarView events={events} />,
    'add-event': addEventView,
    'import-export': (
      <ImportExportView
        events={events}
        onImport={handleImportEvents}
        exportSettings={exportSettings}
        onExportSettingsChange={setExportSettings}
        onSyncingStateChange={setIsImportExportSyncing}
      />
    ),
    support: <HelpSupportView />,
    privacy: <PrivacyView />,
    terms: <TermsView />,
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

      <AppShellSidebar
        activeTab={activeTab}
        setActiveTab={requestTabChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileMenuOpen={isMobileMenuOpen}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
      />

      <main
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-all duration-300 mr-0',
          isSidebarCollapsed ? 'md:mr-20' : 'md:mr-64'
        )}
      >
        <AppTopBar
          title={TAB_TITLES[activeTab]}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenSupport={() => {
            requestTabChange('support');
            setIsMobileMenuOpen(false);
          }}
        />

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {tabContent[activeTab]}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {activeTab !== 'add-event' && (
        <button
          onClick={() => {
            requestTabChange('add-event');
            setIsMobileMenuOpen(false);
          }}
          className={cn(
            'fixed bottom-5 left-5 md:bottom-8 md:left-8 h-12 w-12 md:h-14 md:w-14 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-2xl flex items-center justify-center group active:scale-95 transition-all z-50',
            isMobileMenuOpen && 'opacity-0 pointer-events-none'
          )}
        >
          <Plus className="group-hover:rotate-90 transition-transform" size={24} />
        </button>
      )}
    </div>
  );
}
