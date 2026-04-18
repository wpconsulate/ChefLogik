// Staff page — primary focus of the redesign

const STATUS_LABEL = { active: 'Active', inactive: 'Inactive', invited: 'Invited' };

const StaffPage = ({ data, onToast }) => {
  const { STAFF, ROLES, BRANCHES } = data;

  const [query, setQuery]       = React.useState('');
  const [roleFilter, setRole]   = React.useState('all');
  const [branchFilter, setBr]   = React.useState('all');
  const [statusTab, setStatus]  = React.useState('all');
  const [sort, setSort]         = React.useState({ key: 'name', dir: 'asc' });
  const [page, setPage]         = React.useState(1);
  const [perPage]               = React.useState(12);
  const [selected, setSelected] = React.useState(new Set());
  const [detailId, setDetailId] = React.useState(null);
  const [editing, setEditing]   = React.useState(false);
  const [showInvite, setShowInvite] = React.useState(false);
  const [staff, setStaff]       = React.useState(STAFF);

  const roleById = Object.fromEntries(ROLES.map(r => [r.id, r]));
  const branchById = Object.fromEntries(BRANCHES.map(b => [b.id, b]));

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = staff.filter(u => {
      if (roleFilter !== 'all'   && u.role !== roleFilter)     return false;
      if (branchFilter !== 'all' && u.branch !== branchFilter) return false;
      if (statusTab !== 'all'    && u.status !== statusTab)    return false;
      if (q) {
        const hay = (u.firstName + ' ' + u.lastName + ' ' + u.email + ' ' + (roleById[u.role]?.name||'')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const cmp = {
      name: (a, b) => (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName),
      email: (a, b) => a.email.localeCompare(b.email),
      role: (a, b) => (roleById[a.role]?.name||'').localeCompare(roleById[b.role]?.name||''),
      branch: (a, b) => (branchById[a.branch]?.name||'').localeCompare(branchById[b.branch]?.name||''),
      status: (a, b) => a.status.localeCompare(b.status),
      lastActive: (a, b) => new Date(b.lastActive) - new Date(a.lastActive),
      hours: (a, b) => a.hoursThisWeek - b.hoursThisWeek,
    }[sort.key] || (() => 0);
    rows.sort((a, b) => sort.dir === 'asc' ? cmp(a, b) : -cmp(a, b));
    return rows;
  }, [staff, query, roleFilter, branchFilter, statusTab, sort]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  React.useEffect(() => { setPage(1); }, [query, roleFilter, branchFilter, statusTab]);

  const counts = React.useMemo(() => ({
    all:      staff.length,
    active:   staff.filter(u => u.status === 'active').length,
    inactive: staff.filter(u => u.status === 'inactive').length,
    invited:  staff.filter(u => u.status === 'invited').length,
  }), [staff]);

  const onShift = Math.round(counts.active * 0.42);

  const allPageSelected = pageRows.length > 0 && pageRows.every(r => selected.has(r.id));
  const someSelected = pageRows.some(r => selected.has(r.id));
  const toggleAllPage = () => {
    const ns = new Set(selected);
    if (allPageSelected) pageRows.forEach(r => ns.delete(r.id));
    else pageRows.forEach(r => ns.add(r.id));
    setSelected(ns);
  };
  const toggleOne = (id) => {
    const ns = new Set(selected);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    setSelected(ns);
  };

  const toggleSort = (key) => {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };

  const detail = detailId ? staff.find(u => u.id === detailId) : null;

  const handleDelete = (id) => {
    setStaff(s => s.filter(u => u.id !== id));
    setSelected(sel => { const ns = new Set(sel); ns.delete(id); return ns; });
    if (detailId === id) setDetailId(null);
    onToast('Staff member removed');
  };

  const bulkDeactivate = () => {
    setStaff(s => s.map(u => selected.has(u.id) ? { ...u, status: 'inactive' } : u));
    onToast(`${selected.size} ${selected.size === 1 ? 'member' : 'members'} deactivated`);
    setSelected(new Set());
  };

  return (
    <div className="page">
      {/* Heading */}
      <div className="page-head">
        <div>
          <h1 className="page-title">Staff</h1>
          <div className="page-subtitle">Manage team members, roles and access across all branches.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn">
            <Icon name="shield" size={15} />
            Roles & permissions
          </button>
          <button className="btn">
            <Icon name="download" size={15} />
            Export
          </button>
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
            <Icon name="plus" size={15} stroke={2.2} />
            Invite staff
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="stat-grid">
        <StatCard label="Total staff"    value={counts.all}      delta="+4"  deltaUp trend={[8,10,9,12,13,14,15,16,16,18,19,20]} icon="customers" />
        <StatCard label="Active"         value={counts.active}   delta="97%" deltaUp trend={[10,12,11,13,14,15,15,16,17,18,19,20]} icon="dot" />
        <StatCard label="On shift now"   value={onShift}         delta="3 branches" trend={[4,5,3,6,8,9,10,11,9,8,10,11]}  icon="clock" />
        <StatCard label="Pending invites" value={counts.invited} delta={counts.invited > 0 ? 'Review' : 'None'} trend={[0,1,1,0,2,1,2,3,2,1,2,1]} icon="mail" />
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['all','active','inactive','invited'].map(t => (
          <button key={t} className={'tab' + (statusTab === t ? ' active' : '')} onClick={() => setStatus(t)}>
            {t === 'all' ? 'All' : STATUS_LABEL[t]}
            <span className="pill">{counts[t]}</span>
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <SegmentedView />
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="left">
          <label className="field w-search">
            <Icon name="search" size={15} />
            <input
              placeholder="Search by name, email, role…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </label>
          <label className="field">
            <Icon name="tag" size={15} />
            <select value={roleFilter} onChange={e => setRole(e.target.value)}>
              <option value="all">All roles</option>
              {ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <label className="field">
            <Icon name="branches" size={15} />
            <select value={branchFilter} onChange={e => setBr(e.target.value)}>
              <option value="all">All branches</option>
              {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        </div>
        <div className="right">
          <button className="btn">
            <Icon name="filter" size={15} />
            More filters
          </button>
          <div className="segment" title="Sort direction">
            <button
              className={sort.dir === 'asc' ? 'active' : ''}
              onClick={() => setSort(s => ({ ...s, dir: 'asc' }))}>
              <Icon name="arrowUp" size={13} />
            </button>
            <button
              className={sort.dir === 'desc' ? 'active' : ''}
              onClick={() => setSort(s => ({ ...s, dir: 'desc' }))}>
              <Icon name="arrowDown" size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th className="checkbox-col">
                <Checkbox
                  checked={allPageSelected}
                  indeterminate={someSelected && !allPageSelected}
                  onChange={toggleAllPage}
                />
              </th>
              <ThSort label="Name"        k="name"       sort={sort} toggle={toggleSort} />
              <ThSort label="Role"        k="role"       sort={sort} toggle={toggleSort} />
              <ThSort label="Branch"      k="branch"     sort={sort} toggle={toggleSort} />
              <ThSort label="Status"      k="status"     sort={sort} toggle={toggleSort} />
              <ThSort label="Hours / wk"  k="hours"      sort={sort} toggle={toggleSort} align="right" />
              <ThSort label="Last active" k="lastActive" sort={sort} toggle={toggleSort} />
              <th className="actions-col"></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="empty">
                    <div className="icon-wrap"><Icon name="search" size={18} /></div>
                    <div className="title">No results</div>
                    <div>Try clearing filters or searching a different name.</div>
                  </div>
                </td>
              </tr>
            )}
            {pageRows.map(u => (
              <StaffRow
                key={u.id}
                user={u}
                role={roleById[u.role]}
                branch={branchById[u.branch]}
                selected={selected.has(u.id)}
                onToggle={() => toggleOne(u.id)}
                onOpen={() => { setDetailId(u.id); setEditing(false); }}
                onEdit={() => { setDetailId(u.id); setEditing(true); }}
                onDelete={() => handleDelete(u.id)}
              />
            ))}
          </tbody>
        </table>

        <div className="pagination">
          <div>
            {total === 0
              ? 'No staff'
              : <>Showing <strong>{(page - 1) * perPage + 1}</strong>–<strong>{Math.min(page * perPage, total)}</strong> of <strong>{total}</strong></>}
          </div>
          <div className="pager">
            <button className="btn sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <Icon name="chevronLeft" size={14} /> Prev
            </button>
            {pageNumbers(page, totalPages).map((p, i) => p === '…'
              ? <span key={'gap' + i} style={{ color: 'var(--text-soft)', padding: '0 4px' }}>…</span>
              : <button key={p} className={'page-num' + (p === page ? ' active' : '')} onClick={() => setPage(p)}>{p}</button>
            )}
            <button className="btn sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next <Icon name="chevronRight" size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bulk-bar">
          <div><strong>{selected.size}</strong> selected</div>
          <button className="btn sm" onClick={bulkDeactivate}>Deactivate</button>
          <button className="btn sm">Assign role</button>
          <button className="btn sm">Change branch</button>
          <button className="btn sm">Message</button>
          <button className="close iconbtn" onClick={() => setSelected(new Set())}>
            <Icon name="x" size={15} />
          </button>
        </div>
      )}

      {/* Detail panel */}
      <StaffDetailPanel
        user={detail}
        role={detail ? roleById[detail.role] : null}
        branch={detail ? branchById[detail.branch] : null}
        editing={editing}
        roles={ROLES}
        branches={BRANCHES}
        onClose={() => setDetailId(null)}
        onEditToggle={() => setEditing(e => !e)}
        onSave={(patch) => {
          setStaff(s => s.map(u => u.id === detail.id ? { ...u, ...patch } : u));
          setEditing(false);
          onToast('Changes saved');
        }}
        onDelete={(id) => handleDelete(id)}
      />

      {/* Invite drawer */}
      <InviteDrawer
        open={showInvite}
        roles={ROLES}
        branches={BRANCHES}
        onClose={() => setShowInvite(false)}
        onSubmit={(form) => {
          const id = 'u' + (staff.length + 100);
          const [first, ...rest] = (form.name || 'New Hire').split(' ');
          setStaff(s => [{
            id,
            firstName: first,
            lastName: rest.join(' ') || '—',
            email: form.email,
            phone: '',
            role: form.role,
            branch: form.branch,
            status: 'invited',
            startedAt: new Date().toISOString().slice(0,10),
            lastActive: new Date().toISOString(),
            payRate: 20,
            hoursThisWeek: 0,
          }, ...s]);
          setShowInvite(false);
          onToast(`Invite sent to ${form.email}`);
        }}
      />
    </div>
  );
};

// --- Helpers --------------------------------------------------------

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1];
  if (current > 3) out.push('…');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) out.push(i);
  if (current < total - 2) out.push('…');
  out.push(total);
  return out;
}

function formatAgo(iso) {
  const d = new Date(iso), now = new Date();
  const mins = Math.floor((now - d) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + 'd ago';
  return d.toLocaleDateString();
}

const ThSort = ({ label, k, sort, toggle, align }) => (
  <th
    className={'sortable' + (sort.key === k ? (sort.dir === 'asc' ? ' sorted-asc' : ' sorted-desc') : '')}
    onClick={() => toggle(k)}
    style={align === 'right' ? { textAlign: 'right' } : null}
  >
    {label}
    <span className="sort">
      {sort.key === k
        ? (sort.dir === 'asc' ? <Icon name="chevronUp" size={12} /> : <Icon name="chevronDown" size={12} />)
        : <Icon name="chevronsUpDown" size={12} />}
    </span>
  </th>
);

const StatCard = ({ label, value, delta, deltaUp, trend, icon }) => (
  <div className="stat">
    <div className="stat-label">
      <Icon name={icon} size={14} /> {label}
    </div>
    <div className="stat-value">
      {value}
      {delta && <span className={'stat-delta' + (deltaUp ? ' up' : '')}>{delta}</span>}
    </div>
    <div className="stat-trend">
      <Sparkline values={trend} color="var(--accent-600)" />
    </div>
  </div>
);

const SegmentedView = () => {
  const [v, setV] = React.useState('list');
  return (
    <div className="segment">
      <button className={v === 'list' ? 'active' : ''} onClick={() => setV('list')}>
        <Icon name="menu" size={13} /> List
      </button>
      <button className={v === 'grid' ? 'active' : ''} onClick={() => setV('grid')}>
        <Icon name="dashboard" size={13} /> Grid
      </button>
    </div>
  );
};

const StaffRow = ({ user, role, branch, selected, onToggle, onOpen, onEdit, onDelete }) => {
  return (
    <tr
      className={selected ? 'selected' : ''}
      onClick={onOpen}
    >
      <td className="checkbox-col" onClick={e => e.stopPropagation()}>
        <Checkbox checked={selected} onChange={onToggle} />
      </td>
      <td>
        <div className="name-cell">
          <Avatar person={user} />
          <div className="main">
            <div className="name">
              {user.firstName} {user.lastName}
              {user.isYou && <span className="you-tag">You</span>}
            </div>
            <div className="sub">{user.email}</div>
          </div>
        </div>
      </td>
      <td>
        <span className="chip">
          <span className="role-dot" style={{ background: role?.color }} />
          {role?.name || '—'}
        </span>
      </td>
      <td style={{ color: 'var(--text-muted)' }}>{branch?.name || '—'}</td>
      <td>
        <span className={'status ' + user.status}>
          <span className="status-dot" />
          {STATUS_LABEL[user.status]}
        </span>
      </td>
      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
        {user.hoursThisWeek}h
      </td>
      <td style={{ color: 'var(--text-muted)' }}>{formatAgo(user.lastActive)}</td>
      <td className="actions-col" onClick={e => e.stopPropagation()}>
        <div className="row-actions">
          <button className="iconbtn" title="View" onClick={onOpen}><Icon name="eye" size={15} /></button>
          <button className="iconbtn" title="Edit" onClick={onEdit}><Icon name="pencil" size={15} /></button>
          <button className="iconbtn" title="More"><Icon name="more" size={15} /></button>
        </div>
      </td>
    </tr>
  );
};

// --- Detail panel ---------------------------------------------------

const StaffDetailPanel = ({ user, role, branch, editing, roles, branches, onClose, onEditToggle, onSave, onDelete }) => {
  const [form, setForm] = React.useState(null);

  React.useEffect(() => {
    if (user) setForm({ role: user.role, branch: user.branch, status: user.status, hoursThisWeek: user.hoursThisWeek, payRate: user.payRate });
  }, [user?.id, editing]);

  return (
    <>
      <div className={'panel-overlay' + (user ? ' open' : '')} onClick={onClose} />
      <aside className={'panel' + (user ? ' open' : '')} aria-hidden={!user}>
        {user && (
          <>
            <div className="panel-head">
              <Avatar person={user} size="lg" />
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>
                  {user.firstName} {user.lastName}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  {role?.name} · {branch?.name}
                </div>
              </div>
              <button className="iconbtn panel-close" onClick={onClose}>
                <Icon name="x" size={17} />
              </button>
            </div>

            <div className="panel-body">
              {!editing ? (
                <>
                  <dl className="kv-grid">
                    <dt>Email</dt>
                    <dd style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {user.email}
                      <Icon name="externalLink" size={12} style={{ color: 'var(--text-soft)' }} />
                    </dd>
                    <dt>Phone</dt><dd>{user.phone || '—'}</dd>
                    <dt>Role</dt>
                    <dd>
                      <span className="chip">
                        <span className="role-dot" style={{ background: role?.color }} />
                        {role?.name}
                      </span>
                    </dd>
                    <dt>Branch</dt><dd>{branch?.name} · {branch?.city}</dd>
                    <dt>Status</dt>
                    <dd>
                      <span className={'status ' + user.status}>
                        <span className="status-dot" />
                        {STATUS_LABEL[user.status]}
                      </span>
                    </dd>
                    <dt>Started</dt><dd>{new Date(user.startedAt).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' })}</dd>
                    <dt>Pay rate</dt><dd>${user.payRate}/hr</dd>
                    <dt>Hours this week</dt><dd>{user.hoursThisWeek}h</dd>
                    <dt>Last active</dt><dd>{formatAgo(user.lastActive)}</dd>
                  </dl>

                  <div className="panel-section">
                    <h4>Permissions</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {['View orders','Edit menu','Manage shifts','Close register','Run reports'].map((p, i) => (
                        <span key={p} className="chip" style={{ background: i < 3 ? 'var(--accent-50)' : 'var(--surface-2)', color: i < 3 ? 'var(--accent-700)' : 'var(--text-muted)' }}>
                          {i < 3 && <Icon name="check" size={11} stroke={2.4} />}
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="panel-section">
                    <h4>Recent activity</h4>
                    <div className="timeline">
                      {[
                        ['Clocked in',        'Today, 9:02 AM'],
                        ['Updated menu item', 'Yesterday, 4:18 PM'],
                        ['Closed 12 orders',  '2 days ago'],
                        ['Changed password',  'Last week'],
                      ].map(([what, when]) => (
                        <div key={what} className="timeline-item">
                          <div className="timeline-dot" />
                          <div>
                            <div>{what}</div>
                            <div className="when">{when}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                form && (
                  <>
                    <div className="panel-section" style={{ marginTop: 0 }}>
                      <h4>Role</h4>
                      <label className="field" style={{ width: '100%' }}>
                        <Icon name="tag" size={15} />
                        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="panel-section">
                      <h4>Branch</h4>
                      <label className="field" style={{ width: '100%' }}>
                        <Icon name="branches" size={15} />
                        <select value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })}>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name} · {b.city}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="panel-section">
                      <h4>Status</h4>
                      <div className="segment" style={{ width: '100%' }}>
                        {['active','inactive','invited'].map(s => (
                          <button
                            key={s}
                            className={form.status === s ? 'active' : ''}
                            onClick={() => setForm({ ...form, status: s })}
                            style={{ flex: 1, justifyContent: 'center' }}>
                            {STATUS_LABEL[s]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="panel-section">
                      <h4>Compensation</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <label className="field">
                          <span style={{color:'var(--text-soft)'}}>$</span>
                          <input type="number" value={form.payRate} onChange={e => setForm({ ...form, payRate: +e.target.value })} />
                          <span style={{color:'var(--text-soft)', fontSize: 12}}>/hr</span>
                        </label>
                        <label className="field">
                          <Icon name="clock" size={15} />
                          <input type="number" value={form.hoursThisWeek} onChange={e => setForm({ ...form, hoursThisWeek: +e.target.value })} />
                          <span style={{color:'var(--text-soft)', fontSize: 12}}>hrs/wk</span>
                        </label>
                      </div>
                    </div>
                  </>
                )
              )}
            </div>

            <div className="panel-foot">
              {editing ? (
                <>
                  <button className="btn" onClick={onEditToggle}>Cancel</button>
                  <button className="btn btn-primary" onClick={() => onSave(form)}>Save changes</button>
                </>
              ) : (
                <>
                  <button className="btn btn-danger-ghost" onClick={() => onDelete(user.id)}>
                    <Icon name="trash" size={14} /> Remove
                  </button>
                  <div style={{ flex: 1 }} />
                  <button className="btn">
                    <Icon name="mail" size={14} /> Message
                  </button>
                  <button className="btn btn-primary" onClick={onEditToggle}>
                    <Icon name="pencil" size={14} /> Edit
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
};

// --- Invite drawer --------------------------------------------------

const InviteDrawer = ({ open, roles, branches, onClose, onSubmit }) => {
  const [form, setForm] = React.useState({ name: '', email: '', role: 'server', branch: 'downtown' });
  React.useEffect(() => { if (open) setForm({ name: '', email: '', role: 'server', branch: 'downtown' }); }, [open]);

  return (
    <>
      <div className={'panel-overlay' + (open ? ' open' : '')} onClick={onClose} />
      <aside className={'panel' + (open ? ' open' : '')} aria-hidden={!open}>
        <div className="panel-head">
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>Invite staff</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Send an email invite to join your team.</div>
          </div>
          <button className="iconbtn panel-close" onClick={onClose}><Icon name="x" size={17} /></button>
        </div>
        <div className="panel-body">
          <div className="panel-section" style={{ marginTop: 0 }}>
            <h4>Name</h4>
            <label className="field" style={{ width: '100%' }}>
              <Icon name="customers" size={15} />
              <input placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </label>
          </div>
          <div className="panel-section">
            <h4>Email</h4>
            <label className="field" style={{ width: '100%' }}>
              <Icon name="mail" size={15} />
              <input placeholder="name@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </label>
          </div>
          <div className="panel-section">
            <h4>Role</h4>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 6 }}>
              {roles.map(r => (
                <button
                  key={r.id}
                  className="btn"
                  onClick={() => setForm({ ...form, role: r.id })}
                  style={{
                    justifyContent: 'flex-start',
                    borderColor: form.role === r.id ? 'var(--accent-500)' : 'var(--border)',
                    boxShadow: form.role === r.id ? '0 0 0 3px var(--accent-100)' : 'none',
                  }}>
                  <span className="role-dot" style={{ background: r.color, width: 8, height: 8, borderRadius: 99 }} />
                  {r.name}
                </button>
              ))}
            </div>
          </div>
          <div className="panel-section">
            <h4>Branch</h4>
            <label className="field" style={{ width: '100%' }}>
              <Icon name="branches" size={15} />
              <select value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })}>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name} · {b.city}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="panel-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!form.email}
            onClick={() => onSubmit(form)}>
            <Icon name="userAdd" size={14} /> Send invite
          </button>
        </div>
      </aside>
    </>
  );
};

Object.assign(window, { StaffPage });
