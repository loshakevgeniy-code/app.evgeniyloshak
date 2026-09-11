export type AppIconName = 'home' | 'products' | 'install' | 'profile' | 'game' | 'deck' | 'rules' | 'settings' | 'pause' | 'finish' | 'microphone'

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
      {name === 'settings' && <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4M18.7 18.7l-1.4-1.4M6.7 6.7 5.3 5.3" /></>}
      {name === 'pause' && <><path d="M8.5 5v14M15.5 5v14" /></>}
      {name === 'finish' && <><path d="M6 6 18 18M18 6 6 18" /></>}
      {name === 'microphone' && <><rect x="8" y="2.5" width="8" height="13" rx="4" /><path d="M5 11.5a7 7 0 0 0 14 0M12 18.5v3M8.5 21.5h7" /></>}
    </svg>
  )
}
