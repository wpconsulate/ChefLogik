// Sidebar + Topbar + Layout shell

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',    icon: 'dashboard' },
  { id: 'orders',       label: 'Orders',       icon: 'orders',    count: 14 },
  { id: 'menu',         label: 'Menu',         icon: 'menu' },
  { id: 'reservations', label: 'Reservations', icon: 'reservations', count: 32 },
  { id: 'events',       label: 'Events',       icon: 'events' },
  { id: 'inventory',    label: 'Inventory',    icon: 'inventory' },
  { id: 'customers',    label: 'Customers',    icon: 'customers' },
];
const NAV_ITEMS_2 = [
  { id: 'staff',      label: 'Staff',      icon: 'staff' },
  { id: 'shifts',     label: 'Shifts',     icon: 'shifts' },
  { id: 'attendance', label: 'Attendance', icon: 'attendance' },
];
const NAV_ITEMS_3 = [
  { id: 'branches',  label: 'Branches',  icon: 'branches' },
  { id: 'analytics', label: 'Analytics', icon: 'analytics' },
  { id: 'settings',  label: 'Settings',  icon: 'settings' },
];

const Sidebar = ({ page, onNav, sidebar, onToggleSidebar }) => {
  const renderItem = (it) => (
    <button
      key={it.id}
      className={'nav-item' + (page === it.id ? ' active' : '')}
      onClick={() => onNav(it.id)}
      title={it.label}
    >
      <Icon name={it.icon} size={17} stroke={1.7} />
      <span className="label">{it.label}</span>
      {it.count != null && <span className="count">{it.count}</span>}
    </button>
  );
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">C</div>
        <div className="brand-name">ChefLogik</div>
      </div>
      <nav className="nav">
        <div className="nav-section">Operations</div>
        {NAV_ITEMS.map(renderItem)}
        <div className="nav-section">Team</div>
        {NAV_ITEMS_2.map(renderItem)}
        <div className="nav-section">Organization</div>
        {NAV_ITEMS_3.map(renderItem)}
      </nav>
      <div className="sidebar-foot">
        <button
          className="nav-item sidebar-collapse-btn"
          onClick={onToggleSidebar}
          title={sidebar === 'compact' ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Icon name={sidebar === 'compact' ? 'chevronRight' : 'chevronLeft'} size={16} />
          <span className="label">{sidebar === 'compact' ? 'Expand' : 'Collapse'}</span>
        </button>
      </div>
    </aside>
  );
};

const Topbar = ({ page, branch, branches, onChangeBranch, onToggleTheme, theme, user, accent, onChangeAccent, density, onChangeDensity, messages, onNav }) => {
  const title = {
    dashboard: 'Dashboard', orders: 'Orders', menu: 'Menu',
    reservations: 'Reservations', events: 'Events', inventory: 'Inventory',
    customers: 'Customers', staff: 'Staff', shifts: 'Shifts',
    attendance: 'Attendance', branches: 'Branches', analytics: 'Analytics',
    settings: 'Settings',
  }[page] || 'Dashboard';

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [branchOpen, setBranchOpen] = React.useState(false);
  const menuRef = React.useRef(null);
  const branchRef = React.useRef(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  React.useEffect(() => {
    if (!branchOpen) return;
    const onDoc = (e) => { if (branchRef.current && !branchRef.current.contains(e.target)) setBranchOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [branchOpen]);

  const selected = branch ? branches.find(b => b.id === branch) : null;
  const branchLabel = selected ? selected.name : 'All branches';

  const THEMES = [
    { id: 'indigo',      name: 'Indigo',      color: '#4f46e5' },
    { id: 'deep-ocean',  name: 'Ocean',       color: '#3c5160' },
    { id: 'luna',        name: 'Luna',        color: '#26658c' },
    { id: 'forest',      name: 'Forest',      color: '#163832' },
    { id: 'green',       name: 'Mint',        color: '#059669' },
    { id: 'porcelain',   name: 'Porcelain',   color: '#c4a69b' },
    { id: 'black-glaze', name: 'Black Glaze', color: '#233835' },
    { id: 'neutral',     name: 'Mono',        color: '#0f1115' },
  ];

  return (
    <header className="topbar">
      <div className="crumbs">
        <span>Blue Elephant Group</span>
        <Icon name="chevronRight" size={14} />
        <span className="current">{title}</span>
      </div>
      <div className="topbar-search">
        <Icon name="search" size={15} />
        <input placeholder="Search staff, orders, menu…" />
        <span className="kbd">⌘K</span>
      </div>
      <div className="topbar-actions">
        <div className="branch-switch-wrap" ref={branchRef}>
          <button
            className={'branch-switch' + (branchOpen ? ' open' : '') + (selected ? ' has-selection' : '')}
            title="Switch branch"
            onClick={() => setBranchOpen(o => !o)}>
            <span className="dot" />
            <span>{branchLabel}</span>
            <Icon name={branchOpen ? 'chevronUp' : 'chevronDown'} size={14} />
          </button>
          {branchOpen && (
            <div className="branch-menu" role="menu">
              <button
                className={'branch-menu-item all' + (!selected ? ' active' : '')}
                onClick={() => { onChangeBranch(null); setBranchOpen(false); }}>
                <span className="branch-menu-check">
                  {!selected && <Icon name="check" size={13} stroke={3} />}
                </span>
                <span className="branch-menu-label">All branches</span>
                <span className="branch-menu-hint">{branches.length}</span>
              </button>
              <div className="branch-menu-sep" />
              {branches.map(b => (
                <button
                  key={b.id}
                  className={'branch-menu-item' + (selected?.id === b.id ? ' active' : '')}
                  onClick={() => { onChangeBranch(b.id); setBranchOpen(false); }}>
                  <span className="branch-menu-check">
                    {selected?.id === b.id && <Icon name="check" size={13} stroke={3} />}
                  </span>
                  <span className="branch-menu-label">
                    {b.name}
                    <span className="branch-menu-sub">{b.city}</span>
                  </span>
                </button>
              ))}
              {selected && (
                <>
                  <div className="branch-menu-sep" />
                  <button
                    className="branch-menu-item clear"
                    onClick={() => { onChangeBranch(null); setBranchOpen(false); }}>
                    <span className="branch-menu-check"><Icon name="x" size={13} stroke={2.4} /></span>
                    <span className="branch-menu-label">Clear selection</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <button className="iconbtn" title="Toggle theme" onClick={onToggleTheme}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
        </button>
        <MessagesDropdown messages={messages} />
        <button className="iconbtn" title="Notifications">
          <Icon name="bell" size={17} />
          <span className="dot" />
        </button>
        <div className="user-menu-wrap" ref={menuRef}>
          <button className={'user-chip' + (menuOpen ? ' open' : '')} onClick={() => setMenuOpen(o => !o)}>
            <Avatar person={user} />
            <div className="meta">
              <div className="name">{user.firstName} {user.lastName}</div>
              <div className="role">Owner</div>
            </div>
            <Icon name={menuOpen ? 'chevronUp' : 'chevronDown'} size={14} />
          </button>
          {menuOpen && (
            <div className="user-menu" role="menu">
              <div className="user-menu-head">
                <div className="name">{user.firstName} {user.lastName}</div>
                <div className="email">emma@blueelephant.com</div>
              </div>
              <div className="user-menu-section">
                <div className="user-menu-section-title">
                  <Icon name="tag" size={13} /> Palette
                </div>
                <div className="theme-swatches">
                  {THEMES.map(t => (
                    <button
                      key={t.id}
                      className={'theme-swatch' + (accent === t.id ? ' active' : '')}
                      onClick={() => onChangeAccent(t.id)}
                      title={t.name}>
                      <span className="circle" style={{ background: t.color }}>
                        {accent === t.id && <Icon name="check" size={14} stroke={3} />}
                      </span>
                      <span className="name">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="user-menu-section">
                <div className="user-menu-section-title">
                  <Icon name="sliders" size={13} /> Density
                </div>
                <div className="segment density-segment">
                  {['airy','balanced','dense'].map(v => (
                    <button
                      key={v}
                      className={density === v ? 'active' : ''}
                      onClick={() => onChangeDensity(v)}>
                      {v[0].toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="user-menu-items">
                <button className="user-menu-item" onClick={() => setMenuOpen(false)}>
                  <Icon name="customers" size={16} />
                  <span>My Profile</span>
                </button>
                <button className="user-menu-item danger" onClick={() => setMenuOpen(false)}>
                  <Icon name="externalLink" size={16} />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const MessagesDropdown = ({ messages }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const unreadCount = messages.filter(m => m.unread).length;

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="msg-wrap" ref={ref}>
      <button className={'iconbtn msg-trigger' + (open ? ' open' : '')} title="Messages" onClick={() => setOpen(o => !o)}>
        <Icon name="message" size={17} />
        {unreadCount > 0 && <span className="msg-badge">{unreadCount}</span>}
      </button>
      {open && (
        <div className="msg-menu" role="menu">
          <div className="msg-menu-head">
            <div>
              <div className="msg-menu-title">Messages</div>
              <div className="msg-menu-sub">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </div>
            </div>
            <button className="msg-menu-action">Mark all read</button>
          </div>
          <div className="msg-list">
            {messages.map(m => (
              <button key={m.id} className={'msg-row' + (m.unread ? ' unread' : '')}>
                <div className="msg-avatar">
                  <Avatar person={m.person} />
                  {m.unread && <span className="msg-unread-dot" />}
                </div>
                <div className="msg-body">
                  <div className="msg-row-head">
                    <span className="msg-name">{m.person.first} {m.person.last}</span>
                    <span className="msg-time">{m.time}</span>
                  </div>
                  <div className="msg-channel">{m.channel}</div>
                  <div className="msg-preview">{m.preview}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="msg-menu-foot">
            <button className="msg-menu-foot-btn">
              <span>Open inbox</span>
              <Icon name="chevronRight" size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { Sidebar, Topbar });
