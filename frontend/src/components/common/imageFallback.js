// Inline fallback keeps illustration slots polished if a deployed asset URL is stale or unavailable.
const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 260"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff4d7"/><stop offset="1" stop-color="#fffaf0"/></linearGradient></defs><rect width="640" height="260" rx="24" fill="url(#bg)"/><circle cx="500" cy="62" r="34" fill="#fde7b0"/><path d="M0 208 Q130 174 248 207 T640 194 V260 H0Z" fill="#e8f1df"/><path d="M20 230H620" stroke="#d7e1d0" stroke-width="5" stroke-linecap="round"/><g transform="translate(220 68)"><rect x="0" y="16" width="230" height="112" rx="22" fill="#f59e0b"/><rect x="16" y="30" width="198" height="47" rx="9" fill="#fffaf0"/><path d="M30 39h45v29H30zM84 39h45v29H84zM138 39h45v29h-45z" fill="#cfe4ef"/><rect x="18" y="86" width="194" height="22" rx="8" fill="#d97706"/><circle cx="52" cy="130" r="19" fill="#0f172a"/><circle cx="52" cy="130" r="8" fill="#f8fafc"/><circle cx="180" cy="130" r="19" fill="#0f172a"/><circle cx="180" cy="130" r="8" fill="#f8fafc"/><rect x="197" y="85" width="20" height="13" rx="4" fill="#fff4d7"/></g><path d="M108 172l16-20 16 20" fill="none" stroke="#f59e0b" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="124" cy="190" r="7" fill="#0f172a"/><path d="M486 143h46m-23-23v46" stroke="#fbbf24" stroke-width="5" stroke-linecap="round"/></svg>`;
export const BUS_ILLUSTRATION_FALLBACK = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(fallbackSvg)}`;
export function handleIllustrationError(event) {
  const image = event.currentTarget;
  if (image.dataset.fallbackApplied === 'true') return;
  image.dataset.fallbackApplied = 'true';
  image.src = BUS_ILLUSTRATION_FALLBACK;
}
