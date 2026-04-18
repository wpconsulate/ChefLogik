// Lightweight icon library (stroke-based, inherits currentColor)
const Icon = ({ name, size = 16, stroke = 1.75, className = '', style }) => {
  const common = {
    width: size, height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: 'icon ' + className,
    style,
    'aria-hidden': true,
  };
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
    orders:    <><path d="M3 6h2l2.5 10.5a2 2 0 0 0 2 1.5h7.5a2 2 0 0 0 2-1.4L21 10H6"/><circle cx="10" cy="20" r="1.2"/><circle cx="17" cy="20" r="1.2"/></>,
    menu:      <><path d="M6 3v18"/><path d="M6 11c2 0 3-1.5 3-4S8 3 6 3"/><path d="M14 3c-1.5 0-2 1-2 3s1 3 3 3h3"/><path d="M18 3v18"/></>,
    reservations: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 3v4"/><path d="M16 3v4"/></>,
    events:    <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    inventory: <><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></>,
    customers: <><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="7" r="2.5"/><path d="M21 17.5c0-2.5-1.7-4.5-4-4.9"/></>,
    staff:     <><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.5-4 3.5-6 7.5-6s7 2 7.5 6"/></>,
    shifts:    <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M7 13h3v3H7z"/><path d="M14 13h3v3h-3z"/></>,
    attendance:<><path d="M4 7h16"/><path d="M4 12h10"/><path d="M4 17h6"/><path d="m16 14 2 2 4-4"/></>,
    branches:  <><path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M10 21v-6h4v6"/></>,
    analytics: <><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20H2"/></>,
    settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.7-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.7 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.7.3h0a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5h0a1.6 1.6 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.7v0a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></>,
    search:    <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    bell:      <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></>,
    message:   <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
    chevronDown: <path d="m6 9 6 6 6-6"/>,
    chevronLeft: <path d="m15 18-6-6 6-6"/>,
    chevronRight:<path d="m9 18 6-6-6-6"/>,
    chevronUp:   <path d="m6 15 6-6 6 6"/>,
    chevronsUpDown: <><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></>,
    plus:      <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    filter:    <><path d="M3 5h18l-7 9v6l-4-2v-4z"/></>,
    download:  <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
    upload:    <><path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/></>,
    eye:       <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
    pencil:    <><path d="M17 3a2.8 2.8 0 1 1 4 4L8 20l-5 1 1-5z"/></>,
    trash:     <><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></>,
    more:      <><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></>,
    userAdd:   <><circle cx="9" cy="8" r="3.5"/><path d="M3 20c.5-3.5 3-6 6-6s5.5 2.5 6 6"/><path d="M19 8v6"/><path d="M16 11h6"/></>,
    mail:      <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    phone:     <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></>,
    check:     <path d="m5 12 5 5 10-11"/>,
    x:         <><path d="m6 6 12 12"/><path d="M18 6 6 18"/></>,
    minus:     <path d="M5 12h14"/>,
    dot:       <circle cx="12" cy="12" r="3"/>,
    calendar:  <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 3v4"/><path d="M16 3v4"/></>,
    clock:     <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    tag:       <><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.2"/></>,
    arrowUp:   <><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></>,
    arrowDown: <><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></>,
    sliders:   <><path d="M4 6h10"/><path d="M18 6h2"/><path d="M4 12h4"/><path d="M12 12h8"/><path d="M4 18h12"/><path d="M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></>,
    command:   <><path d="M18 6a3 3 0 1 0-3 3h3"/><path d="M6 6a3 3 0 1 1 3 3H6"/><path d="M18 18a3 3 0 1 1-3-3h3"/><path d="M6 18a3 3 0 1 0 3-3H6"/><path d="M9 9h6v6H9z"/></>,
    externalLink: <><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></>,
    sun:       <><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.9 19.1 1.4-1.4"/><path d="m17.7 6.3 1.4-1.4"/></>,
    moon:      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>,
    shield:    <path d="M12 2 4 5v7c0 5 4 9 8 10 4-1 8-5 8-10V5z"/>,
  };
  return <svg {...common}>{paths[name] || null}</svg>;
};

// Avatar color palette — hash name to stable color
const AVATAR_COLORS = ['#10b981','#0ea5e9','#6366f1','#f97316','#ef4444','#8b5cf6','#14b8a6','#f59e0b','#ec4899','#64748b'];
function avatarColor(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
const Avatar = ({ person, size = 'md' }) => {
  const name = (person.firstName || '') + ' ' + (person.lastName || '');
  const initials = (person.firstName?.[0] || '') + (person.lastName?.[0] || '');
  const cls = size === 'lg' ? 'avatar lg' : size === 'xl' ? 'avatar xl' : 'avatar';
  return (
    <div className={cls} style={{ background: avatarColor(name) }} title={name}>
      {initials.toUpperCase()}
    </div>
  );
};

const Checkbox = ({ checked, indeterminate, onChange }) => {
  const cls = 'checkbox' + (checked ? ' checked' : '') + (indeterminate && !checked ? ' indeterminate' : '');
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : !!checked}
      className={cls}
      onClick={(e) => { e.stopPropagation(); onChange?.(!checked); }}
    >
      {checked && <Icon name="check" size={12} stroke={3} />}
      {indeterminate && !checked && <Icon name="minus" size={12} stroke={3} />}
    </button>
  );
};

const Sparkline = ({ values = [], color = 'var(--accent-600)', fill = true, height = 28 }) => {
  if (!values.length) return null;
  const w = 120, h = height;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1 || 1);
  const pts = values.map((v, i) => [i * step, h - ((v - min) / range) * (h - 4) - 2]);
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = d + ` L ${w.toFixed(1)},${h} L 0,${h} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h + 'px' }}>
      {fill && <path d={area} fill={color} fillOpacity="0.12" stroke="none" />}
      <path d={d} stroke={color} />
    </svg>
  );
};

// attach globally
Object.assign(window, { Icon, Avatar, Checkbox, Sparkline, avatarColor });
