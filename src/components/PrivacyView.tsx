import React, { useMemo } from 'react';

export default function PrivacyView() {
  const privacyPolicyUrl = useMemo(() => new URL('privacy/index.html?embedded=1', window.location.href).toString(), []);

  return (
    <section className="h-[calc(100vh-5rem)] p-4 sm:p-6 lg:p-8">
      <div className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <iframe
          title="LuachSync Privacy Policy"
          src={privacyPolicyUrl}
          className="block h-full w-full bg-white"
        />
      </div>
    </section>
  );
}
