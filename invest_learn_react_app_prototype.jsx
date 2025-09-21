import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// NOTE: This single-file React app is a prototype meant to run inside a modern React project
// with Tailwind CSS configured and the following packages available:
// framer-motion, recharts, lucide-react, @/components/ui from shadcn (optional)

// Default export is the App component so this file can be used as a page or root component.

export default function InvestLearnApp() {
  const [route, setRoute] = useState("/home");
  const [user, setUser] = useState(() => loadFromStorage("user") || defaultUser());
  const [market, setMarket] = useState(() => generateMarketData());
  const [selectedAsset, setSelectedAsset] = useState("ACME");
  const [isSubModalOpen, setSubModalOpen] = useState(false);

  useEffect(() => {
    saveToStorage("user", user);
  }, [user]);

  useEffect(() => {
    // simple market tick simulator every 5s
    const interval = setInterval(() => {
      setMarket(prev => simulateMarketTick(prev));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const assetList = useMemo(() => Object.keys(market.assets), [market]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white text-slate-800">
      <div className="max-w-6xl mx-auto p-6">
        <Header user={user} onRoute={setRoute} onOpenSub={() => setSubModalOpen(true)} />

        <main className="mt-6">
          {route === "/home" && (
            <Home
              user={user}
              market={market}
              onStart={() => setRoute("/learn")}
              onTrade={() => setRoute("/trade")}
              onSelectAsset={setSelectedAsset}
            />
          )}

          {route === "/learn" && (
            <Learn
              user={user}
              onCompleteLesson={(xp) => setUser({ ...user, xp: user.xp + xp })}
              onBack={() => setRoute("/home")}
            />
          )}

          {route === "/trade" && (
            <Trade
              user={user}
              market={market}
              selectedAsset={selectedAsset}
              onTrade={(update) => setUser({ ...user, ...update })}
              onBack={() => setRoute("/home")}
            />
          )}

          {route === "/profile" && (
            <Profile user={user} onBack={() => setRoute("/home")} onReset={() => { saveToStorage("user", null); setUser(defaultUser()); }} />
          )}

          <div className="mt-8">
            <Leaderboard users={[user, sampleUser("Riley"), sampleUser("Jamal")]} />
          </div>
        </main>

        {isSubModalOpen && (
          <SubscriptionModal onClose={() => setSubModalOpen(false)} onSubscribe={() => { setUser({ ...user, premium: true }); setSubModalOpen(false); }} />
        )}
      </div>
    </div>
  );
}

/* ----------------------------------
   Helper: Storage, defaults, market
   ----------------------------------*/

function saveToStorage(key, data) {
  try {
    if (data === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (e) {
    console.warn("Storage error", e);
  }
}

function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("Load storage error", e);
    return null;
  }
}

function defaultUser() {
  return {
    id: "you",
    name: "You",
    cash: 10000,
    portfolio: {},
    xp: 0,
    premium: false,
    achievements: [],
  };
}

function sampleUser(name) {
  return {
    id: name.toLowerCase(),
    name,
    balance: Math.round(5000 + Math.random() * 20000),
  };
}

function generateMarketData() {
  // create a few synthetic assets with starting prices and history
  const assets = {
    ACME: makeAsset("ACME", 120),
    NOVA: makeAsset("NOVA", 42),
    SPARK: makeAsset("SPARK", 8.5),
    ORION: makeAsset("ORION", 320),
  };
  return { timestamp: Date.now(), assets };
}

function makeAsset(ticker, start) {
  const history = Array.from({ length: 30 }).map((_, i) => ({
    t: Date.now() - (29 - i) * 3600 * 1000,
    price: round2(start * (1 + (Math.random() - 0.45) * 0.02 * i / 30)),
  }));
  return { ticker, price: start, history };
}

function simulateMarketTick(market) {
  const next = { ...market, timestamp: Date.now(), assets: { ...market.assets } };
  Object.keys(next.assets).forEach(k => {
    const a = { ...next.assets[k] };
    const last = a.history[a.history.length - 1]?.price ?? a.price;
    // small random walk plus occasional jump
    const change = last * (Math.random() * 0.02 - 0.01) + (Math.random() < 0.02 ? (Math.random() * 10 - 5) : 0);
    const nextPrice = Math.max(0.1, round2(last + change));
    a.price = nextPrice;
    a.history = [...a.history.slice(-99), { t: Date.now(), price: nextPrice }];
    next.assets[k] = a;
  });
  return next;
}

function round2(v) { return Math.round(v * 100) / 100; }

/* ------------------
   Header
   ------------------*/
function Header({ user, onRoute, onOpenSub }) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="text-2xl font-bold">Invest & Learn</div>
        <div className="text-sm text-slate-500">Gamified paper trading + lessons</div>
      </div>

      <nav className="flex items-center gap-3">
        <button className="btn-link" onClick={() => onRoute("/home")}>Home</button>
        <button className="btn-link" onClick={() => onRoute("/learn")}>Learn</button>
        <button className="btn-link" onClick={() => onRoute("/trade")}>Trade</button>
        <button className="btn-link" onClick={() => onRoute("/profile")}>Profile</button>
        <button className="ml-4 rounded-md border px-3 py-1 text-sm" onClick={onOpenSub}>Upgrade</button>
        <div className="ml-4 text-right">
          <div className="text-sm">{user.name}</div>
          <div className="text-xs text-slate-500">${Math.round(user.cash)}</div>
        </div>
      </nav>
    </header>
  );
}

/* ------------------
   Home
   ------------------*/
function Home({ user, market, onStart, onTrade, onSelectAsset }) {
  const assets = Object.values(market.assets);
  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="col-span-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white rounded-2xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Portfolio Snapshot</h2>
              <p className="text-sm text-slate-500">Practice trading, build confidence, earn XP.</p>
            </div>
            <div>
              <button className="rounded-md border px-3 py-1 text-sm mr-2" onClick={onStart}>Learn</button>
              <button className="rounded-md bg-slate-900 text-white px-3 py-1 text-sm" onClick={onTrade}>Paper Trade</button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Cash" value={`$${Math.round(user.cash)}`} />
            <StatCard label="XP" value={user.xp} />
            <StatCard label="Achievements" value={user.achievements.length} />
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-slate-600">Market Movers</h3>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
              {assets.map(a => (
                <div key={a.ticker} className="p-3 border rounded-md cursor-pointer" onClick={() => onSelectAsset(a.ticker)}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{a.ticker}</div>
                    <div className="font-medium">${a.price}</div>
                  </div>
                  <div className="text-xs text-slate-500">{a.history.length}h</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <aside className="col-span-1">
        <div className="p-4 bg-white rounded-2xl shadow">
          <h4 className="font-semibold">Quick Lesson</h4>
          <p className="text-sm text-slate-600 mt-2">What is risk management? Learn to size positions and protect your capital.</p>
          <button className="mt-4 w-full rounded-md border px-3 py-2" onClick={onStart}>Read</button>
        </div>

        <div className="mt-4 p-4 bg-white rounded-2xl shadow">
          <h4 className="font-semibold">Daily Challenge</h4>
          <p className="text-sm text-slate-600 mt-2">Make a paper trade and complete the challenge to earn 50 XP.</p>
          <button className="mt-4 w-full rounded-md bg-indigo-600 text-white px-3 py-2" onClick={onTrade}>Take Challenge</button>
        </div>
      </aside>
    </section>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="p-3 bg-slate-50 rounded-md">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

/* ------------------
   Learn
   ------------------*/

const LESSONS = [
  { id: 1, title: "Intro to Investing", xp: 25, body: "What is an asset? How markets work in simple terms." },
  { id: 2, title: "Risk Management", xp: 40, body: "Position sizing, stop losses, and keeping your edge." },
  { id: 3, title: "Reading Charts", xp: 35, body: "Price action basics and trend identification." },
];

function Learn({ user, onCompleteLesson, onBack }) {
  const [index, setIndex] = useState(0);
  const lesson = LESSONS[index];
  return (
    <div className="p-6 bg-white rounded-2xl shadow">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Learn — {lesson.title}</h2>
          <p className="text-sm text-slate-500">Earn XP as you complete lessons.</p>
        </div>
        <div>
          <button className="btn-link" onClick={onBack}>Back</button>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-base text-slate-700">{lesson.body}</p>

        <div className="mt-6 flex gap-3">
          <button className="rounded-md bg-indigo-600 text-white px-4 py-2" onClick={() => { onCompleteLesson(lesson.xp); nextLesson(setIndex, index); }}>Complete & Earn {lesson.xp} XP</button>
          <button className="rounded-md border px-4 py-2" onClick={() => nextLesson(setIndex, index)}>Skip</button>
        </div>
      </div>
    </div>
  );
}

function nextLesson(setIndex, idx) {
  if (idx + 1 < LESSONS.length) setIndex(idx + 1);
  else setIndex(0);
}

/* ------------------
   Trade (Paper trading)
   ------------------*/
function Trade({ user, market, selectedAsset, onTrade, onBack }) {
  const asset = market.assets[selectedAsset];
  const [qty, setQty] = useState(1);
  const [side, setSide] = useState("buy");

  function handleExecute() {
    const price = asset.price;
    const cost = round2(price * qty);
    if (side === "buy") {
      if (cost > user.cash) return alert("Not enough cash");
      const newPortfolio = { ...user.portfolio };
      newPortfolio[selectedAsset] = (newPortfolio[selectedAsset] || 0) + qty;
      onTrade({ cash: round2(user.cash - cost), portfolio: newPortfolio, xp: user.xp + 5 });
    } else {
      const holding = user.portfolio[selectedAsset] || 0;
      if (qty > holding) return alert("Not enough shares to sell");
      const newPortfolio = { ...user.portfolio };
      newPortfolio[selectedAsset] = holding - qty;
      if (newPortfolio[selectedAsset] <= 0) delete newPortfolio[selectedAsset];
      onTrade({ cash: round2(user.cash + cost), portfolio: newPortfolio, xp: user.xp + 2 });
    }
  }

  const chartData = asset.history.map(h => ({ time: new Date(h.t).toLocaleTimeString(), price: h.price }));

  return (
    <div className="p-6 bg-white rounded-2xl shadow grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{asset.ticker} — ${asset.price}</h3>
            <div className="text-sm text-slate-500">Live-sim price · synthetic market</div>
          </div>
          <div>
            <button className="rounded-md border px-3 py-1" onClick={onBack}>Back</button>
          </div>
        </div>

        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="time" hide />
              <YAxis domain={[dataMin => Math.max(0, dataMin * 0.95), dataMax => dataMax * 1.05]} hide />
              <Tooltip />
              <Line type="monotone" dataKey="price" stroke="#8884d8" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 border rounded-md">
            <div className="text-xs text-slate-500">Balance</div>
            <div className="text-lg font-semibold">${Math.round(user.cash)}</div>
          </div>

          <div className="p-3 border rounded-md">
            <div className="text-xs text-slate-500">Holding</div>
            <div className="text-lg font-semibold">{user.portfolio[selectedAsset] || 0} shares</div>
          </div>

          <div className="p-3 border rounded-md">
            <div className="text-xs text-slate-500">Estimated Value</div>
            <div className="text-lg font-semibold">${round2((user.portfolio[selectedAsset] || 0) * asset.price)}</div>
          </div>
        </div>
      </div>

      <aside className="p-4 border rounded-md">
        <div className="mb-3">
          <label className="text-sm">Side</label>
          <select className="w-full mt-1 p-2 border rounded" value={side} onChange={(e) => setSide(e.target.value)}>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="text-sm">Quantity</label>
          <input type="number" className="w-full mt-1 p-2 border rounded" value={qty} min={1} onChange={(e) => setQty(Number(e.target.value))} />
        </div>

        <div className="mb-3">
          <div className="text-xs text-slate-500">Estimated Cost</div>
          <div className="text-lg font-semibold">${round2(qty * asset.price)}</div>
        </div>

        <button className="w-full rounded-md bg-green-600 text-white px-3 py-2" onClick={handleExecute}>Execute Paper Trade</button>

        <div className="mt-4 text-xs text-slate-500">Paper trading only — no real funds involved in this prototype.</div>
      </aside>
    </div>
  );
}

/* ------------------
   Profile
   ------------------*/
function Profile({ user, onBack, onReset }) {
  return (
    <div className="p-6 bg-white rounded-2xl shadow">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Profile</h2>
          <p className="text-sm text-slate-500">{user.name} · XP: {user.xp}</p>
        </div>
        <div>
          <button className="btn-link" onClick={onBack}>Back</button>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold">Achievements</h3>
        <div className="mt-3 flex gap-2">
          {user.achievements.length ? user.achievements.map(a => (
            <div key={a} className="p-2 border rounded">{a}</div>
          )) : <div className="text-sm text-slate-500">No achievements yet — trade and learn to unlock badges.</div>}
        </div>

        <div className="mt-6">
          <h3 className="font-semibold">Danger Zone</h3>
          <div className="mt-2 text-sm text-slate-500">Reset your progress or clear local data.</div>
          <div className="mt-3 flex gap-3">
            <button className="rounded-md border px-3 py-1" onClick={onReset}>Reset Progress</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------
   Leaderboard
   ------------------*/
function Leaderboard({ users }) {
  return (
    <div className="p-4 bg-white rounded-2xl shadow">
      <h4 className="font-semibold">Leaderboard (sample)</h4>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {users.map(u => (
          <div key={u.id} className="p-3 border rounded-md">
            <div className="font-semibold">{u.name}</div>
            <div className="text-sm text-slate-500">${u.balance ?? Math.round(u.cash ?? 0)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------
   Subscription Modal
   ------------------*/
function SubscriptionModal({ onClose, onSubscribe }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-6 z-10 w-full max-w-md">
        <h3 className="text-lg font-semibold">Upgrade to Premium</h3>
        <p className="text-sm text-slate-600 mt-2">Premium unlocks extra lessons, simulated advanced scenarios, and exclusive challenges.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button className="rounded-md border px-3 py-2" onClick={onClose}>Not now</button>
          <button className="rounded-md bg-indigo-600 text-white px-3 py-2" onClick={onSubscribe}>Subscribe — $4.99/mo</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------
   Utilities
   ------------------*/
function generateChartPoints(start, points = 30, volatility = 0.02) {
  let v = start;
  const data = [];
  for (let i = 0; i < points; i++) {
    v = Math.max(0.1, v * (1 + (Math.random() - 0.5) * volatility));
    data.push({ t: i, price: round2(v) });
  }
  return data;
}

/* ------------------
   Styles (Tailwind classes assumed)
   ------------------*/
// Basic utility: btn-link

// end of file
