const paths = {
  bus: <><rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M8 3.5V2h8v1.5M5 9h14M7 20.5v1M17 20.5v1M4 7v8M20 7v8"/><circle cx="8.5" cy="16.5" r="1"/><circle cx="15.5" cy="16.5" r="1"/></>,
  home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v12h5v-7h4v7h5V9"/></>,
  history: <><path d="M3 12a9 9 0 1 0 2.7-6.4L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
  play: <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="currentColor"/>,
  "play-circle": <><circle cx="12" cy="12" r="9.5"/><path d="m10 8 6 4-6 4Z" fill="currentColor" stroke="currentColor"/></>,
  "check-circle": <><circle cx="12" cy="12" r="9.5"/><path d="m7 12 3.1 3.1L17 8"/></>,
  "flag-checkered": <><path d="M5 21V3"/><path d="M5 4h14l-4 4 4 4H5"/><path d="M5 4h5v4H5m5 0h5v4h-5"/></>,
  phone: <><path d="M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-5-2-2 3a14 14 0 0 1-7-7l3-2-2-5Z"/></>,
  "id-card": <><rect x="2.5" y="4.5" width="19" height="15" rx="2"/><circle cx="8" cy="10" r="2.3"/><path d="M4.5 16c.8-2.3 6.2-2.3 7 0M14 9h4M14 13h4"/></>,
  switch: <><path d="M4 7h15l-3-3M20 17H5l3 3"/><path d="M16 4l3 3-3 3M8 14l-3 3 3 3"/></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>,
  "arrow-left": <path d="M19 12H5m7 7-7-7 7-7"/>,
  "chevron-down": <path d="m6 9 6 6 6-6"/>,
  "chevron-up": <path d="m6 15 6-6 6 6"/>,
  sliders: <><path d="M4 7h8M16 7h4M4 17h4M12 17h8"/><circle cx="14" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></>,
  "calendar-clock": <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18"/><circle cx="15.5" cy="15.5" r="3.5"/><path d="M15.5 13.5v2.2l1.5 1"/></>,
  navigation: <><path d="m12 22 2.7-7.3L22 12 2 2l10 20Z"/><path d="m12 22 0-10"/></>,
  target: <><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/></>,
  flag: <><path d="M5 21V4"/><path d="M5 4c6-4 9 4 15 0v11c-6 4-9-4-15 0"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  lock: <><rect x="4.5" y="10" width="15" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></>,
  pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/></>,
  route: <><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 6h4a3 3 0 0 1 3 3v6.5M8 7.5l7 7"/></>,
  activity: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M17 11a4 4 0 0 0 0-8M21 21v-2a4 4 0 0 0-3-3.87"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
  'eye-off': <><path d="m3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6.5 0 10 6 10 6a16.7 16.7 0 0 1-3.1 3.7M6.2 6.2C3.5 8 2 12 2 12s3.5 6 10 6a10 10 0 0 0 3-.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>,
  alert: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01"/></>,
  'chevron-right': <path d="m9 18 6-6-6-6"/>,
  'arrow-right': <><path d="M4 12h15M13 5l7 7-7 7"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  x: <path d="m6 6 12 12M18 6 6 18"/>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.2 1-1.3 2.2-1.5-.5a7.8 7.8 0 0 1-1.7 1l-.3 1.6h-2.6l-.3-1.6a7.8 7.8 0 0 1-1.7-1l-1.5.5-1.3-2.2 1.2-1a7.5 7.5 0 0 1 0-2l-1.2-1L8 9.8l1.5.5a7.8 7.8 0 0 1 1.7-1l.3-1.6h2.6l.3 1.6a7.8 7.8 0 0 1 1.7 1l1.5-.5 1.3 2.2-1.2 1a7.5 7.5 0 0 1 0 2Z"/></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3"/></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2"/></>,
};

export default function Icon({ name, size = 20, strokeWidth = 2, className = "", ...props }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...props}
    >
      {paths[name] ?? paths.info}
    </svg>
  );
}
