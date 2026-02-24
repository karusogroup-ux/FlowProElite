import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "./supabase"; 
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";
import { generateJobPDF } from "./utils/pdfGenerator";
import { 
  Users, LayoutDashboard, Wrench, ListTodo, Plus, Edit2, Trash2, 
  X, Download, Clock, Phone, Mail, MapPin, CheckCircle2, Circle, 
  Settings, CheckSquare, Square, TrendingUp, Search
} from "lucide-react";

// --- CONFIG & CONSTANTS ---

const STATUS_CONFIG = {
  'Quote': { label: 'Quote', color: '#ef4444' },
  'Work Order': { label: 'Work Order', color: '#facc15' },
  'Completed': { label: 'Completed', color: '#22c55e' },
  'Unsuccessful': { label: 'Unsuccessful', color: '#64748b' }
};

const FLAG_CONFIG = {
  quote_sent: { label: 'Quote', color: '#ef4444', pdfType: 'quote' },
  work_order_sent: { label: 'Workorder', color: '#facc15', pdfType: 'workorder' },
  invoice_sent: { label: 'Invoice', color: '#3b82f6', pdfType: 'invoice' },
  report_sent: { label: 'Complete/Report', color: '#22c55e', pdfType: 'report' }
};

// --- SUB-COMPONENTS ---

const LiveClock = React.memo(() => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-2 text-green-500 mb-1">
      <Clock size={12} className="md:w-[14px] md:h-[14px]" />
      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">{time.toLocaleTimeString()}</p>
    </div>
  );
});

const QuickActionButton = ({ label, icon, onClick, color }) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center gap-2 md:gap-3 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] bg-white/[0.03] border border-white/5 active:scale-95 transition-all group w-full">
    <div className={`${color} p-3 md:p-4 rounded-xl md:rounded-2xl text-black shadow-lg group-hover:rotate-6 transition-transform`}>{icon}</div>
    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
  </button>
);

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  return (
    <div className="h-screen bg-black flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="glass p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] w-full max-w-md animate-slide-up border border-white/10">
        <h2 className="text-3xl md:text-4xl font-black text-center mb-2 tracking-tighter uppercase italic">Elite Login</h2>
        <p className="text-center text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-8">Identify Yourself</p>
        
        <div className="space-y-4">
          <div className="space-y-1">
             <label className="text-[9px] font-black uppercase text-green-500 tracking-widest ml-2">Email</label>
             <input 
               type="email" 
               value={email} onChange={(e) => setEmail(e.target.value)}
               className="w-full bg-white/5 border border-white/10 p-4 rounded-xl md:rounded-2xl text-white font-bold outline-none focus:border-green-500 transition-colors"
               placeholder="Enter access email"
             />
          </div>
          
          <div className="space-y-1">
             <label className="text-[9px] font-black uppercase text-green-500 tracking-widest ml-2">Password</label>
             <input 
               type="password" 
               value={password} onChange={(e) => setPassword(e.target.value)}
               className="w-full bg-white/5 border border-white/10 p-4 rounded-xl md:rounded-2xl text-white font-bold outline-none focus:border-green-500 transition-colors"
               placeholder="Enter access code"
             />
          </div>

          <button disabled={loading} className="w-full bg-green-500 text-black font-black p-4 rounded-xl md:rounded-2xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all mt-4 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
            {loading ? 'Authenticating...' : 'Enter Dashboard'}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- MAIN APP ---

export default function App() {
  // State
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isRestrictedUser, setIsRestrictedUser] = useState(false);
  
  const [tab, setTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState({ customers: [], jobs: [], tasks: [], home_tasks: [] });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const haptic = useCallback((ms = 10) => { if (navigator.vibrate) navigator.vibrate(ms); }, []);

  // 1. Check Authentication & User Role
  useEffect(() => {
    const checkUserRole = (user) => {
      setCurrentUser(user);
      // REPLACE with your partner's actual email
      if (user?.email === 'partner@example.com') {
        setIsRestrictedUser(true);
        setTab('home_tasks');
      } else {
        setIsRestrictedUser(false);
      }
    };

    // Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) checkUserRole(session.user);
      setLoading(false);
    });

    // Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) checkUserRole(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Data
  const fetchAll = async () => {
    // Only fetch if logged in
    if (!session) return; 

    const [c, j, t, h] = await Promise.all([
      supabase.from("Customers").select("*").order("name"),
      supabase.from("Jobs").select("*, Customers(*), LineItems(*)").order("job_number", { ascending: false }),
      supabase.from("Tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("home_tasks").select("*").order("created_at", { ascending: false })
    ]);
    
    setData({ 
      customers: c.data || [], 
      jobs: j.data || [], 
      tasks: t.data || [], 
      home_tasks: h.data || [] 
    });
  };

  useEffect(() => {
    if (session) fetchAll();
  }, [session]);

  // 3. Calculated Stats
  const stats = useMemo(() => {
    const activeJobs = data.jobs.filter(j => !j.is_archived);
    const rev = activeJobs.reduce((a, b) => a + Number(b.revenue || 0), 0);
    const cost = activeJobs.reduce((a, b) => a + Number(b.costs || 0), 0);
    return {
      revenue: rev, profit: rev - cost, count: activeJobs.length,
      chart: Object.keys(STATUS_CONFIG).map(s => ({ 
        name: STATUS_CONFIG[s].label, 
        value: activeJobs.filter(j => j.status === s).length 
      }))
    };
  }, [data.jobs]);

  // 4. Dynamic Navigation
  const currentNavItems = isRestrictedUser 
    ? [ { id: "home_tasks", icon: <CheckSquare size={24}/>, label: "Home" } ]
    : [
        { id: "dashboard", icon: <LayoutDashboard size={24}/>, label: "Stats" },
        { id: "jobs", icon: <Wrench size={24}/>, label: "Jobs" },
        { id: "customers", icon: <Users size={24}/>, label: "Clients" },
        { id: "tasks", icon: <ListTodo size={24}/>, label: "Tasks" },
        { id: "home_tasks", icon: <CheckSquare size={24}/>, label: "Home" },
        { id: "settings", icon: <Settings size={24}/>, label: "Archv" }
      ];

  // --- RENDER LOGIC ---

  if (loading) return null; // Or a loading spinner
  if (!session) return <LoginScreen />;

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
      
      <main className="flex-1 overflow-y-auto p-4 md:p-12 pb-28 md:pb-40 pt-[env(safe-area-inset-top)]">
        {/* Elite Header */}
        <header className="flex justify-between items-end mb-6 md:mb-12 px-1 md:px-2">
          <div>
            <LiveClock />
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter italic uppercase underline decoration-green-500 decoration-4 md:decoration-8 underline-offset-4 md:underline-offset-8">
              {tab === 'dashboard' ? 'Overview' : tab === 'home_tasks' ? 'Home' : tab}
            </h2>
          </div>
          <button onClick={() => { haptic(20); setEditingItem(null); setShowAddModal(true); }} 
            className="bg-green-500 p-3 md:p-5 text-black rounded-2xl md:rounded-[2rem] shadow-[0_0_15px_rgba(34,197,94,0.4)] md:shadow-[0_0_25px_rgba(34,197,94,0.4)] active:scale-90 transition-transform mb-1">
            <Plus size={24} className="md:w-7 md:h-7" strokeWidth={3} />
          </button>
        </header>

        {tab === "dashboard" && (
          <div className="space-y-4 md:space-y-8 animate-slide-up">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className="glass p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] relative overflow-hidden group">
                <p className="text-zinc-500 font-bold uppercase text-[9px] md:text-[10px] tracking-[0.2em] mb-1 md:mb-2">Active Revenue</p>
                <p className="text-5xl md:text-7xl font-black text-green-500 tracking-tighter">${stats.revenue.toLocaleString()}</p>
                <TrendingUp size={120} className="md:w-[180px] md:h-[180px] absolute -right-6 -bottom-6 md:-right-10 md:-bottom-10 text-green-500/10 group-hover:scale-110 transition-transform duration-700" />
              </div>
              <div className="glass p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] flex flex-col justify-center">
                <p className="text-zinc-500 font-bold uppercase text-[9px] md:text-[10px] tracking-[0.2em] mb-1 md:mb-2">Net Projected Profit</p>
                <p className="text-4xl md:text-6xl font-black text-white tracking-tighter">${stats.profit.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
               <div className="glass p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] flex flex-col items-center justify-center col-span-2 md:col-span-1">
                 <p className="text-zinc-500 font-black text-[9px] md:text-[10px] uppercase mb-1">Active Jobs</p>
                 <p className="text-4xl md:text-5xl font-black">{stats.count}</p>
               </div>
               <div className="glass p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] col-span-2 flex justify-around items-center gap-3">
                  <QuickActionButton label="Add Job" icon={<Wrench size={20} className="md:w-6 md:h-6"/>} color="bg-green-500" onClick={() => { setTab('jobs'); setShowAddModal(true); }} />
                  <QuickActionButton label="New Client" icon={<Users size={20} className="md:w-6 md:h-6"/>} color="bg-white" onClick={() => { setTab('customers'); setShowAddModal(true); }} />
               </div>
            </div>
          </div>
        )}

        {tab === "jobs" && (
          <div className="space-y-4 md:space-y-6 animate-slide-up max-w-4xl mx-auto">
            <div className="relative group px-1">
              <Search className="absolute left-5 md:left-8 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-green-500 transition-colors" size={18} />
              <input type="text" placeholder="Search project or client..." className="w-full bg-white/5 border border-white/5 p-4 md:p-6 pl-12 md:pl-16 rounded-[1.5rem] md:rounded-[2rem] text-sm md:text-base font-bold outline-none focus:border-green-500/50 transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="space-y-3 md:space-y-4">
              {data.jobs.filter(j => !j.is_archived && (j.title?.toLowerCase().includes(searchQuery.toLowerCase()) || j.Customers?.name?.toLowerCase().includes(searchQuery.toLowerCase()))).map(j => (
                <JobCard key={j.id} job={j} onToggleFlag={async (job, field) => { haptic(15); await supabase.from("Jobs").update({ [field]: !job[field] }).eq("id", job.id); fetchAll(); }} onArchive={async () => { if(window.confirm("Archive?")){ await supabase.from("Jobs").update({ is_archived: true }).eq("id", j.id); fetchAll(); }}} onEdit={() => setEditingItem({ type: 'Jobs', item: j })} />
              ))}
            </div>
          </div>
        )}

        {tab === "customers" && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 animate-slide-up">
            {data.customers.map(c => (
              <div key={c.id} className="glass p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-sm">
                <h4 className="text-xl md:text-2xl font-black mb-3 md:mb-4 tracking-tight">{c.name}</h4>
                <div className="space-y-3 md:space-y-4 text-xs md:text-sm font-bold text-zinc-400">
                  <p className="flex items-center gap-3"><Phone size={16} className="text-green-500 md:w-[18px] md:h-[18px]"/> {c.phone || "---"}</p>
                  <p className="flex items-center gap-3"><Mail size={16} className="text-green-500 md:w-[18px] md:h-[18px]"/> {c.email || "---"}</p>
                  <p className="flex items-center gap-3"><MapPin size={16} className="text-green-500 md:w-[18px] md:h-[18px]"/> {c.address || "---"}</p>
                </div>
                <div className="flex justify-end gap-2 mt-5 md:mt-8 pt-4 md:pt-6 border-t border-white/5">
                  <button onClick={() => setEditingItem({ type: 'Customers', item: c })} className="p-3 md:p-4 bg-white/5 rounded-xl md:rounded-2xl"><Edit2 size={16} className="md:w-5 md:h-5"/></button>
                  <button onClick={async () => { if(window.confirm("Delete client?")){ await supabase.from("Customers").delete().eq("id", c.id); fetchAll(); }}} className="p-3 md:p-4 bg-red-500/10 rounded-xl md:rounded-2xl text-red-500"><Trash2 size={16} className="md:w-5 md:h-5"/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "tasks" && (
          <div className="space-y-2 md:space-y-3 animate-slide-up max-w-2xl mx-auto">
            {data.tasks.map(t => (
              <div key={t.id} className={`glass p-4 md:p-6 rounded-2xl md:rounded-[2rem] flex items-center justify-between transition-all ${t.is_completed ? 'opacity-30 grayscale' : ''}`}>
                <div className="flex items-center gap-3 md:gap-5 cursor-pointer flex-1" onClick={async () => { haptic(15); await supabase.from("Tasks").update({ is_completed: !t.is_completed }).eq("id", t.id); fetchAll(); }}>
                  {t.is_completed ? <CheckCircle2 className="text-green-500 shrink-0" size={24} /> : <Circle className="text-zinc-700 shrink-0" size={24}/>}
                  <span className={`text-base md:text-lg ${t.is_completed ? 'line-through' : 'font-bold'}`}>{t.task_text}</span>
                </div>
                <button onClick={async () => { if(window.confirm("Delete?")){ await supabase.from("Tasks").delete().eq("id", t.id); fetchAll(); }}} className="p-2 md:p-3 text-zinc-600 hover:text-red-500 ml-2"><Trash2 size={18} className="md:w-5 md:h-5"/></button>
              </div>
            ))}
          </div>
        )}

        {tab === "home_tasks" && (
          <div className="space-y-2 md:space-y-3 animate-slide-up max-w-2xl mx-auto">
            <h3 className="text-2xl font-black text-center mb-4 text-green-500 uppercase">Home Tasks</h3>
            {data.home_tasks?.map(t => (
              <div key={t.id} className={`glass p-4 md:p-6 rounded-2xl md:rounded-[2rem] flex items-center justify-between transition-all ${t.is_complete ? 'opacity-30 grayscale' : ''}`}>
                <div className="flex items-center gap-3 md:gap-5 cursor-pointer flex-1" onClick={async () => { haptic(15); await supabase.from("home_tasks").update({ is_complete: !t.is_complete }).eq("id", t.id); fetchAll(); }}>
                  {t.is_complete ? <CheckCircle2 className="text-green-500 shrink-0" size={24} /> : <Circle className="text-zinc-700 shrink-0" size={24}/>}
                  <span className={`text-base md:text-lg ${t.is_complete ? 'line-through' : 'font-bold'}`}>{t.task_name}</span>
                </div>
                <button onClick={async () => { if(window.confirm("Delete?")){ await supabase.from("home_tasks").delete().eq("id", t.id); fetchAll(); }}} className="p-2 md:p-3 text-zinc-600 hover:text-red-500 ml-2"><Trash2 size={18} className="md:w-5 md:h-5"/></button>
              </div>
            ))}
             {(!data.home_tasks || data.home_tasks.length === 0) && <div className="text-center text-zinc-500 mt-10">No home tasks active.</div>}
          </div>
        )}

        {tab === "settings" && (
           <div className="animate-slide-up space-y-4 md:space-y-6">
           <h3 className="text-xl md:text-2xl font-black px-2">Archive</h3>
           {data.jobs.filter(j => j.is_archived).map(j => (
               <div key={j.id} className="glass p-4 md:p-6 rounded-2xl md:rounded-3xl flex justify-between items-center opacity-50">
                    <p className="font-black text-sm md:text-base">#{j.job_number} - {j.title}</p>
                    <button onClick={async () => { await supabase.from("Jobs").update({ is_archived: false }).eq("id", j.id); fetchAll(); }} className="px-4 py-2 md:px-6 bg-white text-black rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase">Restore</button>
               </div>
           ))}
           <div className="pt-8">
             <button onClick={() => supabase.auth.signOut()} className="w-full p-4 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase">Logout</button>
           </div>
       </div>
        )}
      </main>

      {/* Floating Elite Dock */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 h-16 glass rounded-[2rem] flex justify-around items-center z-50 px-2 shadow-2xl">
        {currentNavItems.map(item => (
          <button key={item.id} onClick={() => { haptic(10); setTab(item.id); }} 
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${tab === item.id ? "tab-active scale-110" : "text-zinc-600"}`}>
            {React.cloneElement(item.icon, { size: 20, strokeWidth: tab === item.id ? 2.5 : 2 })}
            <span className="text-[7px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Modal & Logic */}
      {(showAddModal || editingItem) && (
        <Modal 
          type={editingItem ? editingItem.type : (tab === 'dashboard' || tab === 'settings' ? 'Jobs' : tab.charAt(0).toUpperCase() + tab.slice(1))} 
          item={editingItem?.item} customers={data.customers}
          onClose={() => { setShowAddModal(false); setEditingItem(null); }}
          onSuccess={() => { setShowAddModal(false); setEditingItem(null); fetchAll(); haptic([10, 50]); }}
        />
      )}
    </div>
  );
}

function JobCard({ job, onToggleFlag, onArchive, onEdit }) {
  const jobStatus = STATUS_CONFIG[job.status] ? job.status : 'Quote';

  return (
    <div className="glass p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] border-white/5 hover:border-white/20 transition-all duration-500 group relative">
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 md:gap-3 mb-1">
               <span className="text-green-500 font-black text-[10px] md:text-xs">#{job.job_number}</span>
               <h4 className="text-lg md:text-2xl font-black tracking-tight">{job.title}</h4>
            </div>
            <p className="text-zinc-500 font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-1.5 md:gap-2">
              <Users size={12} className="text-green-500 md:w-3.5 md:h-3.5"/> {job.Customers?.name || "Private Client"}
            </p>
          </div>
          <div 
            className="px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl text-[8px] md:text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10" 
            style={{ color: STATUS_CONFIG[jobStatus]?.color || '#ffffff' }}
          >
            {STATUS_CONFIG[jobStatus]?.label || jobStatus}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <div className="p-4 md:p-6 bg-white/[0.02] rounded-2xl md:rounded-[2rem] border border-white/5">
            <p className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase mb-1 md:mb-2">Revenue</p>
            <p className="text-xl md:text-2xl font-black text-green-500 tracking-tighter">${Number(job.revenue || 0).toLocaleString()}</p>
          </div>
          <div className="p-4 md:p-6 bg-white/[0.02] rounded-2xl md:rounded-[2rem] border border-white/5 text-right">
            <p className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase mb-1 md:mb-2">Cost</p>
            <p className="text-xl md:text-2xl font-black text-red-500/80 tracking-tighter">${Number(job.costs || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 md:gap-2">
          {Object.keys(FLAG_CONFIG).map(key => {
            const active = job[key];
            return (
              <div key={key} className="flex items-center gap-1">
                <button onClick={() => onToggleFlag(job, key)}
                  className={`flex items-center gap-1.5 md:gap-2 px-3 py-2 md:px-5 md:py-3 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-tighter transition-all 
                  ${active ? 'bg-white text-black' : 'bg-white/5 text-zinc-500 hover:bg-white/10'}`}>
                  {active ? <CheckSquare size={12} className="md:w-3.5 md:h-3.5"/> : <Square size={12} className="md:w-3.5 md:h-3.5"/>} {FLAG_CONFIG[key].label}
                </button>
                {active && <button onClick={() => generateJobPDF(job, FLAG_CONFIG[key].pdfType)} className="p-2 md:p-3 bg-white/5 rounded-full text-zinc-500"><Download size={12} className="md:w-3.5 md:h-3.5"/></button>}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-3 md:pt-4 border-t border-white/5">
           <button onClick={onEdit} className="flex-1 py-3 md:py-4 bg-white/5 rounded-xl md:rounded-2xl text-zinc-500 font-black text-[9px] md:text-[10px] uppercase">Edit</button>
           <button onClick={onArchive} className={`flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase ${jobStatus === 'Completed' ? 'bg-green-500 text-black' : 'bg-white/10 text-zinc-700'}`}>Archive</button>
        </div>
      </div>
    </div>
  );
}

function Modal({ type, item, customers, onClose, onSuccess }) {
  const isEdit = !!item;
  const tableSchemas = {
    Jobs: ['title', 'status', 'customer_id', 'revenue', 'costs', 'notes', 'quote_sent', 'work_order_sent', 'invoice_sent', 'report_sent', 'is_archived'],
    Customers: ['name', 'phone', 'email', 'address'],
    Tasks: ['task_text', 'is_completed'],
    HomeTasks: ['task_name', 'is_complete']
  };

  const [form, setForm] = useState(item || { 
    title: '', status: 'Quote', revenue: 0, costs: 0, notes: '', 
    name: '', phone: '', email: '', address: '', task_text: '',
    quote_sent: false, work_order_sent: false, invoice_sent: false, report_sent: false, customer_id: '',
    task_name: '', is_complete: false // Defaults for HomeTasks
  });

  const addLineItem = () => {
    setForm({ 
      ...form, 
      LineItems: [...(form.LineItems || []), { description: '', quantity: 1, unit_price: 0 }] 
    });
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...(form.LineItems || [])];
    updated[index][field] = value;
    setForm({ ...form, LineItems: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const table = type === 'Clients' ? 'Customers' : type;
    const allowed = tableSchemas[table] || [];
    const cleanData = Object.keys(form).filter(k => allowed.includes(k)).reduce((o, k) => { o[k] = form[k]; return o; }, {});
    
    if (type === 'Jobs') {
      const { data: jobData, error: jobError } = isEdit 
        ? await supabase.from('Jobs').update(cleanData).eq('id', item.id).select()
        : await supabase.from('Jobs').insert([cleanData]).select();
        
      if (jobError) return alert(jobError.message);
      
      const jobId = jobData[0].id;

      if (isEdit) {
         await supabase.from('LineItems').delete().eq('job_id', jobId);
      }
      
      if (form.LineItems && form.LineItems.length > 0) {
        const itemsToInsert = form.LineItems.map(li => ({
          job_id: jobId,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price
        }));
        await supabase.from('LineItems').insert(itemsToInsert);
      }
      onSuccess();
    } else {
      const { error } = isEdit ? await supabase.from(table).update(cleanData).eq('id', item.id) : await supabase.from(table).insert([cleanData]);
      if (!error) onSuccess(); else alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-end md:items-center justify-center p-3 md:p-4">
      <div className="bg-[#0a0a0a] w-full max-w-xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 max-h-[85vh] overflow-y-auto border border-white/10 animate-slide-up">
        <div className="flex justify-between items-center mb-6 md:mb-8 bg-[#0a0a0a] sticky top-0 z-10 py-2">
          <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">{isEdit ? 'Update' : 'New'} {type}</h3>
          <button type="button" onClick={onClose} className="p-2 md:p-3 bg-white/5 rounded-full"><X size={20} className="md:w-6 md:h-6"/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          
          {type === 'HomeTasks' && (
            <input required className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl text-sm md:text-base font-bold outline-none focus:border-green-500/50" 
            placeholder="Home Task Name" 
            value={form.task_name} 
            onChange={e => setForm({...form, task_name: e.target.value})} 
            />
          )}

          {type === 'Jobs' && (
            <>
              <input required className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl text-sm md:text-base font-bold outline-none focus:border-green-500/50" placeholder="Project Name" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <select className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl text-sm md:text-base font-bold outline-none" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  {Object.entries(STATUS_CONFIG).map(([val, config]) => <option key={val} value={val} className="bg-[#111]">{config.label}</option>)}
                </select>
                <select className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl text-sm md:text-base font-bold outline-none" value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})}>
                  <option value="" className="bg-[#111]">Assign Client</option>
                  {customers.map(c => <option key={c.id} value={c.id} className="bg-[#111]">{c.name}</option>)}
                </select>
              </div>

              {/* LINE ITEMS SECTION */}
              <div className="bg-white/[0.02] border border-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl space-y-2 md:space-y-3">
                <div className="flex justify-between items-center px-1">
                  <p className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Line Items / Services</p>
                  <button type="button" onClick={addLineItem} className="text-green-500 text-[10px] md:text-xs font-black uppercase hover:text-green-400">+ Add</button>
                </div>
                
                {(form.LineItems || []).map((item, i) => (
                  <div key={i} className="flex gap-1.5 md:gap-2">
                    <input className="flex-1 bg-white/5 border border-white/10 p-2.5 md:p-3 rounded-lg md:rounded-xl text-xs md:text-sm font-bold outline-none" placeholder="Desc" value={item.description} onChange={e => updateLineItem(i, 'description', e.target.value)} />
                    <input type="number" className="w-14 md:w-20 bg-white/5 border border-white/10 p-2.5 md:p-3 rounded-lg md:rounded-xl text-xs md:text-sm font-bold outline-none" placeholder="Qty" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', Number(e.target.value))} />
                    <input type="number" className="w-20 md:w-24 bg-white/5 border border-white/10 p-2.5 md:p-3 rounded-lg md:rounded-xl text-xs md:text-sm font-bold outline-none" placeholder="Price" value={item.unit_price} onChange={e => updateLineItem(i, 'unit_price', Number(e.target.value))} />
                  </div>
                ))}
                {(!form.LineItems || form.LineItems.length === 0) && <p className="text-[10px] md:text-xs text-zinc-600 font-bold px-1">Document will use general Job Revenue.</p>}
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <input type="number" className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl text-sm md:text-base font-bold outline-none" placeholder="Total Revenue" value={form.revenue} onChange={e => setForm({...form, revenue: Number(e.target.value)})} />
                  <input type="number" className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl text-sm md:text-base font-bold outline-none" placeholder="Total Costs" value={form.costs} onChange={e => setForm({...form, costs: Number(e.target.value)})} />
              </div>
              <textarea className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl text-sm md:text-base font-bold outline-none min-h-[80px] md:min-h-[120px]" placeholder="Job Scope & Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </>
          )}

          {type === 'Customers' && (
            <>
              <input required className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl text-sm md:text-base font-bold outline-none focus:border-green-500/50" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <input className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl text-sm md:text-base font-bold outline-none focus:border-green-500/50" placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              <input className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl text-sm md:text-base font-bold outline-none focus:border-green-500/50" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              <input className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl text-sm md:text-base font-bold outline-none focus:border-green-500/50" placeholder="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </>
          )}

          {type === 'Tasks' && <input required className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl text-sm md:text-base font-bold outline-none focus:border-green-500/50" placeholder="Task" value={form.task_text} onChange={e => setForm({...form, task_text: e.target.value})} />}
          
          <button className="w-full bg-green-500 text-black p-4 md:p-6 rounded-2xl md:rounded-3xl font-black uppercase tracking-widest mt-2 md:mt-4 active:scale-95 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)]">Save Entry</button>
        </form>
      </div>
    </div>
  );
}