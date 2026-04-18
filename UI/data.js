// Mock data for ChefLogik dashboard
(function () {
  const FIRST = ['Emma','Liam','Olivia','Noah','Ava','Ethan','Sophia','Mason','Isabella','Logan','Mia','Lucas','Amelia','Oliver','Harper','Elijah','Evelyn','James','Abigail','Benjamin','Emily','Alexander','Ella','William','Scarlett','Daniel','Grace','Henry','Chloe','Jack','Victoria','Owen','Riley','Samuel','Aria','Wyatt','Lily','Jackson','Zoey','Levi','Hannah','Sebastian','Layla','David','Nora','Carter','Penelope','Julian','Camila','Anthony'];
  const LAST  = ['Chen','Patel','Rodriguez','Kim','Nguyen','Johnson','Garcia','Smith','Martinez','Lee','Brown','Davis','Wilson','Taylor','Anderson','Thomas','Moore','Jackson','Martin','Thompson','White','Harris','Clark','Lewis','Walker','Hall','Allen','Young','King','Wright','Lopez','Hill','Scott','Green','Adams','Baker','Nelson','Carter','Mitchell','Perez','Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards','Collins','Stewart','Sanchez'];
  const ROLES = [
    { id: 'owner',     name: 'Owner',         color: '#7c3aed' },
    { id: 'manager',   name: 'Manager',       color: '#0ea5e9' },
    { id: 'head-chef', name: 'Head Chef',     color: '#f97316' },
    { id: 'sous-chef', name: 'Sous Chef',     color: '#f59e0b' },
    { id: 'line-cook', name: 'Line Cook',     color: '#10b981' },
    { id: 'server',    name: 'Server',        color: '#06b6d4' },
    { id: 'host',      name: 'Host',          color: '#8b5cf6' },
    { id: 'bartender', name: 'Bartender',     color: '#ef4444' },
    { id: 'busser',    name: 'Busser',        color: '#64748b' },
  ];
  const BRANCHES = [
    { id: 'downtown',  name: 'Downtown',        city: 'San Francisco' },
    { id: 'mission',   name: 'Mission',         city: 'San Francisco' },
    { id: 'oakland',   name: 'Oakland',         city: 'Oakland' },
    { id: 'berkeley',  name: 'Berkeley',        city: 'Berkeley' },
  ];

  // Deterministic pseudo-random so layout is stable across reloads
  let seed = 7;
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }

  const STAFF = [];
  // Anchor the first few to match the original screenshot
  const anchors = [
    { first: 'Emma', last: 'Chen', email: 'emma@blueelephant.com', role: 'owner', branch: 'downtown', status: 'active', isYou: true },
    { first: 'Marcus', last: 'Okafor', email: 'headchef1@blueelephant.com', role: 'head-chef', branch: 'downtown', status: 'active' },
    { first: 'Priya', last: 'Shah', email: 'manager1@blueelephant.com', role: 'manager', branch: 'mission', status: 'active' },
  ];
  anchors.forEach(a => STAFF.push({
    id: 'u' + (STAFF.length + 1),
    firstName: a.first, lastName: a.last,
    email: a.email,
    phone: '(415) 555-01' + String(10 + STAFF.length).slice(-2),
    role: a.role, branch: a.branch, status: a.status,
    startedAt: '2023-0' + (1 + (STAFF.length % 8)) + '-15',
    lastActive: hoursAgo(STAFF.length),
    isYou: !!a.isYou,
    payRate: [45, 38, 32][STAFF.length] || 22,
    hoursThisWeek: 32 + STAFF.length,
  }));

  // Fill to 58 more
  for (let i = 0; i < 58; i++) {
    const first = pick(FIRST);
    const last  = pick(LAST);
    const role  = pick(ROLES.slice(1)); // not owner
    const branch = pick(BRANCHES);
    const stat  = rnd() < 0.82 ? 'active' : (rnd() < 0.5 ? 'inactive' : 'invited');
    STAFF.push({
      id: 'u' + (STAFF.length + 1),
      firstName: first, lastName: last,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@blueelephant.com`,
      phone: '(415) 555-' + String(1000 + Math.floor(rnd() * 8999)).slice(-4),
      role: role.id, branch: branch.id,
      status: stat,
      startedAt: `202${3 + Math.floor(rnd()*3)}-${String(1+Math.floor(rnd()*12)).padStart(2,'0')}-${String(1+Math.floor(rnd()*28)).padStart(2,'0')}`,
      lastActive: hoursAgo(Math.floor(rnd() * 400)),
      payRate: 18 + Math.floor(rnd() * 30),
      hoursThisWeek: Math.floor(rnd() * 45),
    });
  }

  function hoursAgo(h) {
    const d = new Date();
    d.setHours(d.getHours() - h);
    return d.toISOString();
  }

  // Orders mock (for stub page)
  const ORDERS = [];
  for (let i = 0; i < 24; i++) {
    ORDERS.push({
      id: '#' + (10482 - i),
      guest: pick(FIRST) + ' ' + pick(LAST).charAt(0) + '.',
      table: 'T' + (1 + Math.floor(rnd() * 24)),
      items: 1 + Math.floor(rnd() * 8),
      total: (20 + rnd() * 180).toFixed(2),
      status: pick(['preparing','served','paid','new','preparing','served']),
      branch: pick(BRANCHES).id,
      opened: Math.floor(rnd() * 120) + 'm ago',
    });
  }

  // --- Message threads (for topbar preview) ---
  const MESSAGES = [
    {
      id: 'm1',
      person: STAFF.find(s => s.first === 'Marcus' && s.last === 'Okafor') || STAFF[1],
      preview: 'Line 3 is backed up on the duck confit — can we 86 it for tonight?',
      time: '2m',
      unread: true,
      channel: 'Kitchen • Downtown',
    },
    {
      id: 'm2',
      person: STAFF.find(s => s.first === 'Priya' && s.last === 'Shah') || STAFF[2],
      preview: 'Uploaded the Q2 labor-cost sheet. Numbers look better than we thought.',
      time: '18m',
      unread: true,
      channel: 'Managers',
    },
    {
      id: 'm3',
      person: STAFF[4] || STAFF[0],
      preview: 'Can you approve my shift swap with Jordan on Sat?',
      time: '1h',
      unread: true,
      channel: 'Direct',
    },
    {
      id: 'm4',
      person: STAFF[6] || STAFF[0],
      preview: 'Order #4412 was comped — attaching the manager note.',
      time: '3h',
      unread: false,
      channel: 'Front of House',
    },
    {
      id: 'm5',
      person: STAFF[9] || STAFF[0],
      preview: 'New supplier quote for produce is ready for review.',
      time: 'Yesterday',
      unread: false,
      channel: 'Inventory',
    },
  ];

  window.CL_DATA = { STAFF, ROLES, BRANCHES, ORDERS, MESSAGES };
})();
