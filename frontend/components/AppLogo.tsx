export function AppLogo() {
  return (
    <div className="inline-flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br from-[#0f82ff] via-[#5d5dff] to-[#7f3cff] text-white shadow-[0_18px_50px_rgba(15,130,255,0.18)]">
        <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
          <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.18" />
          <path
            d="M33 17c-9.94 0-15 7.14-15 16.29 0 9.58 6.45 16.13 15 16.13 3.68 0 6.42-1.44 8.15-3.36a1.87 1.87 0 0 0 0-2.67l-1.51-1.5a1.57 1.57 0 0 0-2.28 0c-1.2 1.21-2.83 1.9-4.36 1.9-3.49 0-5.57-2.45-5.57-6.67 0-4.56 2.25-7.54 5.77-7.54 2.2 0 3.62.86 4.75 2.15 1.14 1.3 1.76 3.1 1.76 5.3 0 .92.83 1.77 1.75 1.77h2.41c.9 0 1.18-1.02.7-1.61-1.7-2.03-3.18-4.85-3.18-8.36C48 24.08 42.94 17 33 17Zm-2.12 10.7a1.83 1.83 0 1 0 1.83 1.83 1.83 1.83 0 0 0-1.83-1.83Z"
            fill="white"
          />
        </svg>
      </div>
      <div className="space-y-0.5">
        <p className="text-base font-semibold tracking-tight text-text">GrowEasy CRM</p>
        <p className="text-xs uppercase tracking-[0.24em] text-text-faint">AI CSV Importer</p>
      </div>
    </div>
  );
}
