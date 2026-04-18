// Main app shell — composes pages and wires shared state

const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "balanced",
  "sidebar": "full",
  "accent": "green",
  "theme": "light"
}/*EDITMODE-END*/;

function App() {
  const [page, setPage]         = useState(() => localStorage.getItem('cl_page') || 'staff');
  const [branch, setBranch]     = useState(() => localStorage.getItem('cl_branch') || null);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [tweaks, setTweaks]     = useState(() => {
    try { return { ...TWEAK_DEFAULTS, ...(JSON.parse(localStorage.getItem('cl_tweaks') || '{}')) }; }
    catch { return { ...TWEAK_DEFAULTS }; }
  });
  const [toast, setToast]       = useState(null);
  const [editModeHost, setEditHost] = useState(false);

  // apply tweaks → root attributes
  useEffect(() => {
    const r = document.documentElement;
    r.dataset.density = tweaks.density;
    r.dataset.sidebar = tweaks.sidebar;
    r.dataset.accent  = tweaks.accent;
    r.dataset.theme   = tweaks.theme;
    localStorage.setItem('cl_tweaks', JSON.stringify(tweaks));
  }, [tweaks]);

  useEffect(() => { localStorage.setItem('cl_page', page); }, [page]);
  useEffect(() => {
    if (branch) localStorage.setItem('cl_branch', branch);
    else localStorage.removeItem('cl_branch');
  }, [branch]);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), 2200);
  };

  const updateTweak = (k, v) => {
    setTweaks(t => {
      const next = { ...t, [k]: v };
      if (editModeHost) {
        window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
      }
      return next;
    });
  };

  // Edit-mode host integration
  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === '__activate_edit_mode')   { setEditHost(true); setTweaksOpen(true); }
      if (d.type === '__deactivate_edit_mode') { setEditHost(false); setTweaksOpen(false); }
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const user = { firstName: 'Emma', lastName: 'Chen' };
  const data = window.CL_DATA;

  let pageEl;
  switch (page) {
    case 'dashboard':    pageEl = <DashboardPage data={data} onToast={showToast} onNav={setPage} />; break;
    case 'staff':        pageEl = <StaffPage     data={data} onToast={showToast} />; break;
    case 'orders':       pageEl = <OrdersPage    data={data} onToast={showToast} />; break;
    case 'menu':         pageEl = <StubPage title="Menu"         subtitle="Items, categories, modifiers and pricing." icon="menu" />; break;
    case 'reservations': pageEl = <StubPage title="Reservations" subtitle="Upcoming bookings and waitlist management." icon="reservations" />; break;
    case 'events':       pageEl = <StubPage title="Events"       subtitle="Private events, catering and special nights." icon="events" />; break;
    case 'inventory':    pageEl = <StubPage title="Inventory"    subtitle="Stock, purchase orders and suppliers." icon="inventory" />; break;
    case 'customers':    pageEl = <StubPage title="Customers"    subtitle="Guest profiles, loyalty and marketing." icon="customers" />; break;
    case 'shifts':       pageEl = <StubPage title="Shifts"       subtitle="Schedule, swaps and time-off." icon="shifts" />; break;
    case 'attendance':   pageEl = <StubPage title="Attendance"   subtitle="Clock-ins, timesheets and approvals." icon="attendance" />; break;
    case 'branches':     pageEl = <StubPage title="Branches"     subtitle="Locations, hours and configuration." icon="branches" />; break;
    case 'analytics':    pageEl = <StubPage title="Analytics"    subtitle="Revenue, trends and custom reports." icon="analytics" />; break;
    case 'settings':     pageEl = <StubPage title="Settings"     subtitle="Organization, billing and integrations." icon="settings" />; break;
    default:             pageEl = <DashboardPage data={data} onToast={showToast} onNav={setPage} />;
  }

  return (
    <div className="app">
      <Sidebar
        page={page}
        onNav={setPage}
        sidebar={tweaks.sidebar}
        onToggleSidebar={() => updateTweak('sidebar', tweaks.sidebar === 'compact' ? 'full' : 'compact')}
      />
      <div className="main">
        <Topbar
          page={page}
          branch={branch}
          branches={data.BRANCHES}
          onChangeBranch={setBranch}
          user={user}
          theme={tweaks.theme}
          accent={tweaks.accent}
          density={tweaks.density}
          onChangeAccent={(v) => updateTweak('accent', v)}
          onChangeDensity={(v) => updateTweak('density', v)}
          messages={data.MESSAGES}
          onNav={setPage}
          onToggleTheme={() => updateTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark')}
        />
        {pageEl}
      </div>

      <div className={'toast' + (toast ? ' show' : '')}>{toast}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
