export type AppIconName = 'home' | 'products' | 'install' | 'profile' | 'game' | 'deck' | 'rules' | 'settings' | 'pause' | 'finish' | 'microphone' | 'search'

export function AppIcon({ name, className = '' }: { name: AppIconName; className?: string }) {
  return (
    <svg className={`app-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      {name === 'home' && <><path d="M3 11.2 12 4l9 7.2" /><path d="M5.5 10v9.5h13V10M9.5 19.5v-6h5v6" /></>}
      {name === 'products' && <><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>}
      {name === 'install' && <><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5" /><path d="M4 17v3h16v-3" /></>}
      {name === 'profile' && <><circle cx="12" cy="8" r="4" /><path d="M4.5 21c.7-4.1 3.2-6.2 7.5-6.2s6.8 2.1 7.5 6.2" /></>}
      {name === 'game' && <><rect x="5" y="3" width="12" height="17" rx="2.5" transform="rotate(-6 11 11.5)" /><path d="m15.5 5.5 3.2.4a2 2 0 0 1 1.7 2.2l-1.1 9.4" /></>}
      {name === 'deck' && <><rect x="3.5" y="5" width="13" height="15" rx="2.5" /><path d="M7.5 2.8h11a2 2 0 0 1 2 2v12" /></>}
      {name === 'rules' && <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22Z" /><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22Z" /></>}
      {name === 'settings' && <><circle cx="12" cy="12" r="3.1" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.05.05-2.86 2.86-.05-.05A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.08A1.7 1.7 0 0 0 8.54 19.4a1.7 1.7 0 0 0-1.88.34l-.05.05-2.86-2.86.05-.05A1.7 1.7 0 0 0 4.14 15a1.7 1.7 0 0 0-1.54-1H2.5v-4h.1a1.7 1.7 0 0 0 1.54-1 1.7 1.7 0 0 0-.34-1.88l-.05-.05 2.86-2.86.05.05A1.7 1.7 0 0 0 8.54 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.08A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.05-.05 2.86 2.86-.05.05A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.54 1H21v4h-.06a1.7 1.7 0 0 0-1.54 1Z" /></>}
      {name === 'pause' && <><path d="M8.5 5v14M15.5 5v14" /></>}
      {name === 'finish' && <><path d="M6 21V4" /><path d="M7 5h10l-2 3 2 3H7" /></>}
      {name === 'microphone' && <><rect x="8" y="2.5" width="8" height="13" rx="4" /><path d="M5 11.5a7 7 0 0 0 14 0M12 18.5v3M8.5 21.5h7" /></>}
      {name === 'search' && <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>}
    </svg>
  )
}
