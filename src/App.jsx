import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { supabase } from "./supabase"; 
import { PrintJob } from "./components/PrintJob";
import { generateDocument } from "./utils/docGenerator";
import { 
  Users, LayoutDashboard, Wrench, ListTodo, Plus, Edit2, Trash2, 
  X, Clock, Phone, Mail, MapPin, CheckCircle2, Circle, 
  Settings, CheckSquare, TrendingUp, Search, FileText, Printer
} from "lucide-react";

// --- CONFIG & CONSTANTS ---
const STATUS_CONFIG = {
  'Quote': { label: 'Quote', color: '#ef4444' },
  'Work Order': { label: 'Work Order', color: '#facc15' },
  'Completed': { label: 'Completed', color: '#22c55e' },
  'Unsuccessful': { label: 'Unsuccessful', color: '#64748b' }
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

// --- MAIN APP ---
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRestrictedUser, setIsRestrictedUser] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState({ customers: [], jobs: [], tasks: [], home_tasks: [], templates: [] });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [printJob, setPrintJob] = useState(null);

  const printRef = useRef();
  const haptic = useCallback((ms = 10) => { if (navigator.vibrate) navigator.vibrate(ms); }, []);

  useEffect(() => {
    const checkUserRole = (user) => {
      if (user?.email === 'anthony@karusogroup.com') {
        setIsRestrictedUser(true);
        setTab('home_tasks'); 
      } else {
        setIsRestrictedUser(false);
      }
    };
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) checkUserRole(session.user);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) checkUserRole(session.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchAll = useCallback(async () => {
  if (!session) return; 
  const [c, j, t, h, doc] = await Promise.all([
    supabase.from("Customers").select("*").order("name"),
    // Fetch all the new fields here
    supabase.from("Jobs").select(`
      *,
      Customers(*)
    `).order("job_number", { ascending: false }),
    supabase.from("Tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("home_tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("DocTemplates").select("*").order("created_at", { ascending: false })
  ]);
  setData({ customers: c.data || [], jobs: j.data || [], tasks: t.data || [], home_tasks: h.data || [], templates: doc.data || [] });
}, [session]);

  useEffect(() => { if (session) fetchAll(); }, [session, fetchAll]);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  const stats = useMemo(() => {
    const activeJobs = data.jobs.filter(j => !j.is_archived);
    const rev = activeJobs.reduce((a, b) => a + Number(b.revenue || 0), 0);
    const cost = activeJobs.reduce((a, b) => a + Number(b.costs || 0), 0);
    return { revenue: rev, profit: rev - cost, count: activeJobs.length };
  }, [data.jobs]);

  const currentNavItems = isRestrictedUser 
    ? [ { id: "home_tasks", icon: <CheckSquare size={24}/>, label: "Home" } ]
    : [
        { id: "dashboard", icon: <LayoutDashboard size={24}/>, label: "Stats" },
        { id: "jobs", icon: <Wrench size={24}/>, label: "Jobs" },
        { id: "customers", icon: <Users size={24}/>, label: "Clients" },
        { id: "tasks", icon: <ListTodo size={24}/>, label: "Tasks" },
        { id: "home_tasks", icon: <CheckSquare size={24}/>, label: "Home" },
        { id: "settings", icon: <Settings size={24}/>, label: "Conf" }
      ];

  if (loading) return null; 
  if (!session) return <LoginScreen />;

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden font-sans">
      <main className="flex-1 overflow-y-auto p-4 md:p-12 pb-28 md:pb-40 pt-[env(safe-area-inset-top)]">
        <header className="flex justify-between items-end mb-6 md:mb-12 px-1 md:px-2">
          <div>
            <LiveClock />
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter italic uppercase underline decoration-green-500 decoration-4 md:decoration-8 underline-offset-4">
              {tab === 'dashboard' ? 'Overview' : tab === 'home_tasks' ? 'Home' : tab}
            </h2>
          </div>
          <button onClick={() => { haptic(20); setEditingItem(null); setShowAddModal(true); }} className="bg-green-500 p-3 text-black rounded-2xl active:scale-90 transition-transform mb-1">
            <Plus size={24} strokeWidth={3} />
          </button>
        </header>

        {tab === "dashboard" && (
          <div className="space-y-4 animate-slide-up">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass p-6 rounded-[2rem] relative overflow-hidden group">
                <p className="text-zinc-500 font-bold uppercase text-[9px] tracking-[0.2em] mb-1">Active Revenue</p>
                <p className="text-5xl font-black text-green-500 tracking-tighter">${stats.revenue.toLocaleString()}</p>
                <TrendingUp size={120} className="absolute -right-6 -bottom-6 text-green-500/10" />
              </div>
              <div className="glass p-6 rounded-[2rem] flex flex-col justify-center">
                <p className="text-zinc-500 font-bold uppercase text-[9px] tracking-[0.2em] mb-1">Net Profit</p>
                <p className="text-4xl font-black text-white tracking-tighter">${stats.profit.toLocaleString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <QuickActionButton label="Add Job" icon={<Wrench />} color="bg-green-500" onClick={() => { setTab('jobs'); setShowAddModal(true); }} />
               <QuickActionButton label="New Client" icon={<Users />} color="bg-white" onClick={() => { setTab('customers'); setShowAddModal(true); }} />
            </div>
          </div>
        )}

        {/* --- JOB TASKS VIEW --- */}
{tab === "tasks" && (
  <div className="space-y-2 animate-slide-up max-w-2xl mx-auto">
    <h3 className="text-2xl font-black text-center mb-6 text-white uppercase italic tracking-tighter">
      Project Tasks
    </h3>
    
    {data.tasks.map(t => (
      <div 
        key={t.id} 
        className={`glass p-4 md:p-6 rounded-2xl md:rounded-[2rem] flex items-center justify-between transition-all ${
          t.is_completed ? 'opacity-30 grayscale' : 'border border-white/5'
        }`}
      >
        <div 
          className="flex items-center gap-3 md:gap-5 cursor-pointer flex-1" 
          onClick={async () => { 
            haptic(15); 
            await supabase.from("Tasks").update({ is_completed: !t.is_completed }).eq("id", t.id); 
            fetchAll(); 
          }}
        >
          {t.is_completed ? (
            <CheckCircle2 className="text-green-500 shrink-0" size={24} />
          ) : (
            <Circle className="text-zinc-700 shrink-0" size={24}/>
          )}
          <span className={`text-base md:text-lg ${t.is_completed ? 'line-through' : 'font-bold'}`}>
            {t.task_text}
          </span>
        </div>
        
        <button 
          onClick={async () => { 
            if(window.confirm("Delete task?")){ 
              await supabase.from("Tasks").delete().eq("id", t.id); 
              fetchAll(); 
            }
          }} 
          className="p-2 md:p-3 text-zinc-600 hover:text-red-500 ml-2"
        >
          <Trash2 size={18} className="md:w-5 md:h-5"/>
        </button>
      </div>
    ))}

    {data.tasks.length === 0 && (
      <div className="text-center text-zinc-500 mt-10 font-bold uppercase tracking-widest opacity-30">
        No pending project tasks
      </div>
    )}
  </div>
)}

{/* --- CLIENTS VIEW --- */}
{tab === "customers" && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
    {data.customers.map(c => (
      <div key={c.id} className="glass p-6 md:p-8 rounded-[2rem] border border-white/5 bg-white/[0.02] flex flex-col justify-between">
        <div>
          <h4 className="text-xl md:text-2xl font-black mb-4 tracking-tight text-white">{c.name}</h4>
          <div className="space-y-3 text-xs md:text-sm font-bold text-zinc-400">
            <p className="flex items-center gap-3"><Phone size={16} className="text-green-500"/> {c.phone || "No phone recorded"}</p>
            <p className="flex items-center gap-3"><Mail size={16} className="text-green-500"/> {c.email || "No email recorded"}</p>
            <p className="flex items-center gap-3"><MapPin size={16} className="text-green-500"/> {c.address || "No address recorded"}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-8 pt-6 border-t border-white/5">
          <button 
            onClick={() => setEditingItem({ type: 'Customers', item: c })} 
            className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <Edit2 size={16}/>
          </button>
          <button 
            onClick={async () => { 
              if(window.confirm("Delete client? This may affect existing jobs.")){ 
                await supabase.from("Customers").delete().eq("id", c.id); 
                fetchAll(); 
              }
            }} 
            className="p-3 bg-red-500/10 rounded-xl text-red-500 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 size={16}/>
          </button>
        </div>
      </div>
    ))}

    {data.customers.length === 0 && (
      <div className="col-span-full text-center py-20 opacity-20 font-black uppercase tracking-widest">
        Database Empty: Add a Client to Begin
      </div>
    )}
  </div>
)}

        {tab === "home_tasks" && (
          <div className="space-y-2 animate-slide-up max-w-2xl mx-auto">
            <h3 className="text-2xl font-black text-center mb-6 text-green-500 uppercase italic">Home Tasks</h3>
            {data.home_tasks.map(t => (
              <div key={t.id} className={`glass p-4 rounded-2xl flex items-center justify-between transition-all ${t.is_complete ? 'opacity-30 grayscale' : ''}`}>
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={async () => { haptic(15); await supabase.from("home_tasks").update({ is_complete: !t.is_complete }).eq("id", t.id); fetchAll(); }}>
                  {t.is_complete ? <CheckCircle2 className="text-green-500" size={26} /> : <Circle className="text-zinc-700" size={26}/>}
                  <span className={`text-lg ${t.is_complete ? 'line-through' : 'font-bold'}`}>{t.task_name}</span>
                </div>
                <button onClick={async () => { if(window.confirm("Delete task?")){ await supabase.from("home_tasks").delete().eq("id", t.id); fetchAll(); }}} className="p-2 text-zinc-600 hover:text-red-500 ml-2">
                  <Trash2 size={20}/>
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "jobs" && <JobsList data={data.jobs} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onPrintTrigger={(j) => { setPrintJob(j); setShowPrintModal(true); }} haptic={haptic} fetchAll={fetchAll} setEditingItem={setEditingItem} />}
        {tab === "settings" && <SettingsView data={data} fetchAll={fetchAll} />}

      </main>

      <nav className="md:hidden fixed bottom-6 left-4 right-4 h-16 glass rounded-[2rem] flex justify-around items-center z-50 shadow-2xl">
        {currentNavItems.map(item => (
          <button key={item.id} onClick={() => { haptic(10); setTab(item.id); }} className={`flex flex-col items-center gap-1 ${tab === item.id ? "text-green-500 scale-110" : "text-zinc-600"}`}>
            {React.cloneElement(item.icon, { size: 20 })}
            <span className="text-[7px] font-black uppercase">{item.label}</span>
          </button>
        ))}
      </nav>

      {(showAddModal || editingItem) && (
        <Modal 
          type={editingItem ? editingItem.type : tab === 'home_tasks' ? 'Home Tasks' : tab === 'tasks' ? 'Tasks' : tab === 'customers' ? 'Customers' : 'Jobs'} 
          item={editingItem?.item} 
          customers={data.customers}
          onClose={() => { setShowAddModal(false); setEditingItem(null); }}
          onSuccess={() => { setShowAddModal(false); setEditingItem(null); fetchAll(); }}
        />
      )}

      {showPrintModal && (
        <PrintSelectionModal job={printJob} templates={data.templates} onClose={() => setShowPrintModal(false)} onStandardPrint={() => { setShowPrintModal(false); setTimeout(handlePrint, 300); }} onGenerateDoc={async (temp) => { await generateDocument(temp, printJob); setShowPrintModal(false); }} />
      )}

      <div className="hidden"><div ref={printRef}>{printJob && <PrintJob job={printJob} />}</div></div>
    </div>
  );
}

// --- SUB-COMPONENTS (DEFINED OUTSIDE MAIN APP) ---

function Modal({ type, item, customers, onClose, onSuccess }) {
  const isEdit = !!item;
  
  // 1. Initial State
  const [form, setForm] = useState(item || { 
    title: '', status: 'Quote', revenue: 0, costs: 0, notes: '', 
    name: '', phone: '', email: '', address: '', 
    task_text: '', task_name: '',
    customer_id: '', is_complete: false, is_completed: false
  });

  // 2. Submit Logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    let tableName = "";
    let payload = {};

    if (type === 'Home Tasks') {
      tableName = 'home_tasks'; // Check your DB for "home_tasks" vs "Home Tasks"
      payload = { task_name: form.task_name, is_complete: form.is_complete || false };
    } else if (type === 'Tasks') {
      tableName = 'Tasks';
      payload = { task_text: form.task_text, is_completed: form.is_completed || false };
    } else if (type === 'Customers' || type === 'Clients') {
      tableName = 'Customers';
      payload = { name: form.name, phone: form.phone, email: form.email, address: form.address };
    } else {
      tableName = 'Jobs';
      payload = {
      title: form.title,
      status: form.status,
      job_reference: form.job_reference, // Added
      job_address: form.job_address,     // Added
      notes: form.notes,                 // Added
      customer_id: form.customer_id === "" ? null : form.customer_id,
      revenue: Number(form.revenue) || 0,
      costs: Number(form.costs) || 0
    };
    }

    const { error } = isEdit 
      ? await supabase.from(tableName).update(payload).eq('id', item.id) 
      : await supabase.from(tableName).insert([payload]);

    if (!error) {
      onSuccess();
    } else {
      console.error("Supabase Error:", error);
      alert(`Save Failed: ${error.message}`);
    }
  };

  // 3. Render
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-3">
      <div className="bg-[#0a0a0a] w-full max-w-xl rounded-[2rem] p-8 border border-white/10 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black uppercase tracking-tight">{isEdit ? 'Update' : 'New'} {type}</h3>
          <button type="button" onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'Home Tasks' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-green-500 tracking-widest ml-1">Home Task</label>
              <input required autoFocus className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold outline-none focus:border-green-500/50" placeholder="Ex: Fix the deck..." value={form.task_name || ""} onChange={e => setForm({...form, task_name: e.target.value})} />
            </div>
          )}

          {type === 'Tasks' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-green-500 tracking-widest ml-1">Job Task</label>
              <input required autoFocus className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold outline-none focus:border-green-500/50" placeholder="Ex: Buy copper pipe..." value={form.task_text || ""} onChange={e => setForm({...form, task_text: e.target.value})} />
            </div>
          )}

          {type === 'Jobs' && (
  <div className="space-y-4">
    {/* Basic Info */}
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <label className="text-[9px] font-black uppercase text-zinc-500 ml-1">Job Reference</label>
        <input className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold" placeholder="REF-001" value={form.job_reference} onChange={e => setForm({...form, job_reference: e.target.value})} />
      </div>
      <div className="space-y-1">
        <label className="text-[9px] font-black uppercase text-zinc-500 ml-1">Project Title</label>
        <input required className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold" placeholder="Job Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
      </div>
    </div>

    {/* Client & Address */}
    <select className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold outline-none" value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})}>
      <option value="">Assign Client</option>
      {customers.map(c => <option key={c.id} value={c.id} className="bg-black">{c.name}</option>)}
    </select>
    
    <input className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold" placeholder="Job Site Address" value={form.job_address} onChange={e => setForm({...form, job_address: e.target.value})} />

    {/* Financials Grid */}
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <label className="text-[9px] font-black uppercase text-green-500 ml-1 font-black">Revenue ($)</label>
        <input type="number" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-green-500 font-black" value={form.revenue} onChange={e => setForm({...form, revenue: e.target.value})} />
      </div>
      <div className="space-y-1">
        <label className="text-[9px] font-black uppercase text-red-500 ml-1 font-black">Costs ($)</label>
        <input type="number" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-red-500 font-black" value={form.costs} onChange={e => setForm({...form, costs: e.target.value})} />
      </div>
    </div>

    {/* Notes */}
    <textarea className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-medium text-sm min-h-[100px]" placeholder="Additional Job Notes..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
  </div>
)}

          {type === 'Customers' && (
            <div className="space-y-4">
              <input required className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold" placeholder="Client Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <input className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold" placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              <input className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
          )}

          <button type="submit" className="w-full bg-green-500 text-black p-4 rounded-xl font-black uppercase tracking-widest active:scale-95 transition-transform shadow-[0_0_20px_rgba(34,197,94,0.3)] mt-2">
            Save Entry
          </button>
        </form>
      </div>
    </div>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };
  return (
    <div className="h-screen bg-black flex items-center justify-center p-6">
      <form onSubmit={handleLogin} className="glass p-10 rounded-[2.5rem] w-full max-w-sm border border-white/10">
        <h2 className="text-3xl font-black text-center mb-8 uppercase italic underline decoration-green-500">Elite Access</h2>
        <input className="w-full bg-white/5 border border-white/10 p-4 rounded-xl mb-4 text-white" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="w-full bg-white/5 border border-white/10 p-4 rounded-xl mb-6 text-white" type="password" placeholder="Access Code" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="w-full bg-green-500 text-black p-4 rounded-xl font-black uppercase">Identify</button>
      </form>
    </div>
  );
}
// --- SUB-COMPONENTS (Paste these at the bottom of App.jsx) ---

function JobsList({ data, searchQuery, setSearchQuery, onPrintTrigger, haptic, fetchAll, setEditingItem }) {
  const filtered = data.filter(j => 
    !j.is_archived && 
    (j.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     j.Customers?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4 md:space-y-6 animate-slide-up max-w-4xl mx-auto">
      <div className="relative group px-1">
        <Search className="absolute left-5 md:left-8 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-green-500 transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="Search projects or clients..." 
          className="w-full bg-white/5 border border-white/5 p-4 md:p-6 pl-12 md:pl-16 rounded-[1.5rem] md:rounded-[2rem] text-sm md:text-base font-bold outline-none focus:border-green-500/50 transition-all" 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
        />
      </div>

      <div className="space-y-3 md:space-y-4">
        {filtered.map(j => (
          <JobCard 
            key={j.id} 
            job={j} 
            onPrintTrigger={onPrintTrigger}
            onEdit={() => setEditingItem({ type: 'Jobs', item: j })} 
            onArchive={async () => { if(window.confirm("Archive?")){ await supabase.from("Jobs").update({ is_archived: true }).eq("id", j.id); fetchAll(); }}} 
            onToggleFlag={async (job, field) => { haptic(15); await supabase.from("Jobs").update({ [field]: !job[field] }).eq("id", job.id); fetchAll(); }} 
          />
        ))}
      </div>
    </div>
  );
}

function JobCard({ job, onPrintTrigger, onEdit, onArchive, onToggleFlag }) {
  return (
    <div className="glass p-5 rounded-[2.5rem] border border-white/5 bg-white/[0.02] transition-all">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">#{job.job_number}</span>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">| {job.job_reference || 'NO-REF'}</span>
          </div>
          <h4 className="text-xl font-black tracking-tight">{job.title}</h4>
          <p className="text-zinc-500 text-xs font-bold uppercase">{job.Customers?.name || 'No Client'}</p>
        </div>
        <div className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-black uppercase" style={{ color: STATUS_CONFIG[job.status]?.color }}>{job.status}</div>
      </div>

      {/* Info Rows */}
      <div className="space-y-2 mb-6 text-[11px] font-bold text-zinc-400">
        <p className="flex items-center gap-2"><MapPin size={14} className="text-green-500"/> {job.job_address || 'No Address Listed'}</p>
        <div className="flex gap-4">
          <p className="text-green-500">Rev: ${Number(job.revenue).toLocaleString()}</p>
          <p className="text-red-500">Cost: ${Number(job.costs).toLocaleString()}</p>
        </div>
      </div>

      {/* Actions (Keep your existing buttons here) */}
      <div className="flex gap-2 pt-4 border-t border-white/5">
        <button onClick={onEdit} className="flex-1 py-3 bg-white/5 rounded-xl text-[9px] font-black uppercase">Edit</button>
        <button onClick={() => onPrintTrigger(job)} className="flex-1 py-3 bg-white/10 text-green-500 rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-2"><Printer size={12}/> Print</button>
        <button onClick={onArchive} className="p-3 bg-red-500/5 text-red-500 rounded-xl"><Trash2 size={14}/></button>
      </div>
    </div>
  );
}

function SettingsView({ data, fetchAll }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="glass p-6 rounded-[2rem] border border-white/5">
        <h3 className="text-xl font-black uppercase text-green-500 mb-6">Doc Templates</h3>
        <div className="space-y-3">
          {data.templates.map(temp => (
            <div key={temp.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
              <div className="flex items-center gap-3"><FileText size={20} className="text-blue-500" /> <span className="font-bold text-sm">{temp.name}</span></div>
              <button onClick={async () => { if(window.confirm("Delete?")) { await supabase.from("DocTemplates").delete().eq("id", temp.id); fetchAll(); }}} className="text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>
      <button onClick={() => supabase.auth.signOut()} className="w-full p-4 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase">Logout System</button>
    </div>
  );
}