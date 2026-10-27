// Íconos de marcas que lucide ya no incluye
export function InstagramGlyph({ className = 'size-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WhatsAppGlyph({ className = 'size-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.04 2.5a9.43 9.43 0 0 0-8.1 14.26L2.6 21.5l4.86-1.3A9.43 9.43 0 1 0 12.04 2.5Zm0 17.2a7.77 7.77 0 0 1-3.96-1.08l-.28-.17-2.88.77.77-2.8-.19-.29a7.78 7.78 0 1 1 6.54 3.57Zm4.27-5.82c-.23-.12-1.38-.68-1.6-.76-.21-.08-.37-.12-.53.12-.15.23-.6.76-.74.92-.14.15-.27.17-.5.06a6.37 6.37 0 0 1-1.88-1.16 7.03 7.03 0 0 1-1.3-1.62c-.14-.23 0-.36.1-.47.1-.11.23-.27.35-.4.11-.14.15-.24.23-.4.08-.15.04-.29-.02-.4-.06-.12-.53-1.27-.72-1.74-.19-.46-.39-.39-.53-.4h-.45a.87.87 0 0 0-.63.29 2.65 2.65 0 0 0-.83 1.97c0 1.16.85 2.29.97 2.45.12.15 1.67 2.55 4.04 3.58.57.24 1 .39 1.35.5.57.18 1.08.15 1.49.1.45-.07 1.38-.57 1.58-1.11.2-.55.2-1.02.14-1.12-.06-.1-.21-.16-.44-.27Z" />
    </svg>
  );
}
