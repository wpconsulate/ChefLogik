// Stub pages for other routes + Dashboard overview

const DashboardPage = ({ data, onToast, onNav }) => {
  const { STAFF, ORDERS } = data;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Good afternoon, Emma</h1>
          <div className="page-subtitle">Here's what's happening across Blue Elephant Group today.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn"><Icon name="calendar" size={15} /> Today</button>
          <button className="btn"><Icon name="download" size={15} /> Export</button>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Revenue today"   value="$12,482" delta="+8.2%"  deltaUp trend={[4,5,6,8,7,9,11,10,12,13,14,15]} icon="analytics" />
        <StatCard label="Orders"          value="187"     delta="+12"    deltaUp trend={[10,12,14,13,16,17,15,18,20,19,22,24]} icon="orders" />
        <StatCard label="Avg ticket"      value="$66.75"  delta="−2.1%"  trend={[16,17,15,14,13,15,14,12,13,11,12,12]} icon="tag" />
        <StatCard label="On shift now"    value="14"      delta="3 branches" trend={[8,9,10,12,14,15,14,13,14,13,14,14]} icon="customers" />
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Revenue · last 14 days</div>
              <div className="card-sub">Combined across all branches</div>
            </div>
            <div className="segment">
              <button>1D</button>
              <button>1W</button>
              <button className="active">14D</button>
              <button>1M</button>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <RevenueChart />
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Branch performance</div>
              <div className="card-sub">Revenue today</div>
            </div>
          </div>
          {[
            ['Downtown',  9840, 12000, '#10b981'],
            ['Mission',   6210, 9000,  '#0ea5e9'],
            ['Oakland',   4380, 7500,  '#f59e0b'],
            ['Berkeley',  2920, 6000,  '#8b5cf6'],
          ].map(([name, val, target, color]) => (
            <div key={name} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ fontWeight: 500 }}>{name}</span>
                <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  ${val.toLocaleString()} <span style={{ color: 'var(--text-soft)' }}>/ ${target.toLocaleString()}</span>
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: (val / target * 100) + '%', height: '100%', background: color, borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Recent orders</div>
              <div className="card-sub">Last 24 hours</div>
            </div>
            <button className="btn sm" onClick={() => onNav('orders')}>
              View all <Icon name="chevronRight" size={13} />
            </button>
          </div>
          <table className="table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ background: 'transparent' }}>Order</th>
                <th style={{ background: 'transparent' }}>Guest</th>
                <th style={{ background: 'transparent' }}>Items</th>
                <th style={{ background: 'transparent' }}>Status</th>
                <th style={{ background: 'transparent', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {ORDERS.slice(0, 6).map(o => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-muted)' }}>{o.id}</td>
                  <td>{o.guest}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{o.items} items</td>
                  <td><span className={'ostatus ' + o.status}>{o.status}</span></td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>${o.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Team activity</div>
              <div className="card-sub">Recent clock-ins and changes</div>
            </div>
          </div>
          <div className="activity-list">
            {STAFF.slice(0, 7).map((u, i) => (
              <div key={u.id} className="activity-item">
                <Avatar person={u} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div>
                    <strong>{u.firstName} {u.lastName}</strong>{' '}
                    <span style={{ color: 'var(--text-muted)' }}>
                      {['clocked in','updated the menu','closed 4 orders','started a shift','went on break','joined the team','updated availability'][i]}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>{['Downtown','Mission','Oakland','Berkeley'][i % 4]}</div>
                </div>
                <div className="when">{['2m','12m','34m','1h','2h','3h','yesterday'][i]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const RevenueChart = () => {
  // Stacked-ish area chart, 14 days
  const days = 14;
  const revA = [1800,2100,1950,2400,2800,3100,2600,2200,2500,2900,3300,3600,3100,3900];
  const revB = [1200,1400,1300,1700,1900,2100,1800,1500,1700,2000,2200,2400,2100,2600];
  const max = Math.max(...revA.map((v,i) => v + revB[i])) * 1.1;
  const w = 720, h = 220, pad = 32;
  const x = (i) => pad + (i / (days - 1)) * (w - pad * 2);
  const y = (v) => h - pad - (v / max) * (h - pad * 2);

  const areaA = `M${x(0)},${y(revA[0])} ` + revA.map((v, i) => `L${x(i)},${y(v)}`).join(' ') +
                ` L${x(days - 1)},${h - pad} L${x(0)},${h - pad} Z`;
  const areaB = `M${x(0)},${y(revA[0] + revB[0])} ` + revA.map((v, i) => `L${x(i)},${y(v + revB[i])}`).join(' ') +
                ' ' + revA.map((v, i) => `L${x(days - 1 - i)},${y(revA[days - 1 - i])}`).join(' ') + ' Z';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      {[0.25, 0.5, 0.75].map(t => (
        <line key={t} x1={pad} x2={w - pad} y1={pad + t * (h - pad * 2)} y2={pad + t * (h - pad * 2)} stroke="var(--border)" strokeDasharray="2 3" />
      ))}
      <path d={areaA} fill="var(--accent-600)" opacity="0.25" />
      <path d={areaB} fill="var(--accent-600)" opacity="0.12" />
      <path
        d={`M${x(0)},${y(revA[0])} ` + revA.map((v, i) => `L${x(i)},${y(v)}`).join(' ')}
        fill="none" stroke="var(--accent-600)" strokeWidth="2"
      />
      {revA.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === days - 1 ? 4 : 0} fill="var(--accent-600)" stroke="var(--surface)" strokeWidth="2" />
      ))}
      {[0, Math.floor(days / 2), days - 1].map(i => (
        <text key={i} x={x(i)} y={h - 10} fontSize="10.5" textAnchor="middle" fill="var(--text-soft)">
          {['Apr 5', 'Apr 11', 'Apr 18'][[0, Math.floor(days / 2), days - 1].indexOf(i)]}
        </text>
      ))}
    </svg>
  );
};

const OrdersPage = ({ data, onToast }) => {
  const { ORDERS } = data;
  const [tab, setTab] = React.useState('all');
  const filtered = tab === 'all' ? ORDERS : ORDERS.filter(o => o.status === tab);
  const counts = { all: ORDERS.length, ...Object.fromEntries(['new','preparing','served','paid'].map(s => [s, ORDERS.filter(o => o.status === s).length])) };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Orders</h1>
          <div className="page-subtitle">Live orders across all branches.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn"><Icon name="filter" size={15} /> Filters</button>
          <button className="btn btn-primary"><Icon name="plus" size={15} /> New order</button>
        </div>
      </div>
      <div className="tabs">
        {['all','new','preparing','served','paid'].map(t => (
          <button key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
            <span className="pill">{counts[t]}</span>
          </button>
        ))}
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Order</th><th>Guest</th><th>Table</th><th>Items</th><th>Status</th><th>Opened</th><th style={{textAlign:'right'}}>Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} onClick={() => onToast(`Opened ${o.id}`)}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-muted)' }}>{o.id}</td>
                <td>{o.guest}</td>
                <td><span className="chip">{o.table}</span></td>
                <td style={{ color: 'var(--text-muted)' }}>{o.items}</td>
                <td><span className={'ostatus ' + o.status}>{o.status}</span></td>
                <td style={{ color: 'var(--text-muted)' }}>{o.opened}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>${o.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StubPage = ({ title, subtitle, icon }) => (
  <div className="page">
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        <div className="page-subtitle">{subtitle}</div>
      </div>
    </div>
    <div className="card" style={{ padding: '60px 30px', textAlign: 'center' }}>
      <div className="icon-wrap" style={{ width: 56, height: 56, background: 'var(--accent-50)', color: 'var(--accent-700)', margin: '0 auto 12px' }}>
        <Icon name={icon} size={24} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{title} module</div>
      <div style={{ color: 'var(--text-muted)', maxWidth: 380, margin: '0 auto' }}>
        This module follows the same layout as Staff — tabs, filters, sortable table, detail panels.
      </div>
    </div>
  </div>
);

Object.assign(window, { DashboardPage, OrdersPage, StubPage });
