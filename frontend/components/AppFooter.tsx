export function AppFooter() {
  return (
    <footer className="border-t border-border bg-surface px-6 py-8 text-sm text-text-muted">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Made with love by <a href="https://www.linkedin.com/in/afzal-surti-9904b2287/" target="_blank" rel="noreferrer" className="text-accent hover:text-accent/80">Afzal N. Surti</a>
        </p>
        <p className="max-w-xl text-xs leading-relaxed text-text-faint">
          GrowEasy CRM is a lightweight import assistant for mapping CSV leads into your CRM schema. Upload, preview, extract, and download clean CRM-ready data in one flow.
        </p>
      </div>
    </footer>
  );
}
