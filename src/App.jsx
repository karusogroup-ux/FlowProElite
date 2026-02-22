import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "./supabaseclient";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { 
  Users, LayoutDashboard, Wrench, ListTodo, Settings as SettingsIcon,
  Plus, Edit2, Trash2, CheckCircle2, X, DollarSign, Briefcase
} from "lucide-react";

// EXACT COLOR MAPPING AS REQUESTED
const STATUS_COLORS = {
  'Quote': '#facc15',        // Yellow
  'Work Order': '#3b82f6',   // Blue
  'Completed': '#22c55e',    // Green
  'Unsuccessful': '#ef4444'  // Red
};

const STATUS_OPTIONS = ['Quote', 'Work Order', 'Completed', 'Unsuccessful'];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Data State
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [nextJobNumber, setNextJobNumber] = useState(1000);

  // Consolidated Form States
  const [forms, setForms] = useState({
    job: { title: "", customer_id: "", revenue: "" },
    todo: "",
    settings: 1000
  });

  const [editState, setEditState] = useState({ type: null, id: null, data: {} });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchData();
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, jRes, tRes, sRes] = await Promise.all([
        supabase.from("Customers").select("*").order("name"),
        supabase.from("Jobs").select("*, Customers(name)").order("job_number", { ascending: false }),
        supabase.from("Tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("Settings").select("next_job_number").eq("id", 1).single()
      ]);
      if (cRes.data) setCustomers(cRes.data);
      if (jRes.data) setJobs(jRes.data);
      if (tRes.data) setTasks(tRes.data);
      if (sRes.data) {
        setNextJobNumber(sRes.data.next_job_number);
        setForms(prev => ({ ...prev, settings: sRes.data.next_job_number }));
      }
    } catch (e) {
      console.error("Data Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  };

  // --- CRUD Actions ---
  const handleDelete = async (table, id) => {
    if (!window.confirm(`Confirm deletion?`)) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) fetchData();
  };

  const handleAddJob = async (e) => {
    e.preventDefault();
    const payload = { 
      ...forms.job, 
      status: 'Quote', 
      job_number: nextJobNumber, 
      revenue: parseFloat(forms.job.revenue || 0) 
    };
    const { error } = await supabase.from("Jobs").insert([payload]);
    if (!error) {
      const nextNum = nextJobNumber + 1;
      await supabase.from("Settings").update({ next_job_number: nextNum }).eq("id", 1);
      setNextJobNumber(nextNum);
      setForms(prev => ({ ...prev, job: { title: "", customer_id: "", revenue: "" } }));
      fetchData();
    }
  };

  // --- Optimized Chart Logic ---
  const chartData = useMemo(() => {
    // Ensure all statuses are represented even if count is 0
    return STATUS_OPTIONS.map(status => ({
      name: status,
      value: jobs.filter(j => j.status === status).length
    }));
  }, [jobs]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="text-blue-500 font-black text-4xl animate-pulse tracking-tighter">FLOWPRO</div>
        <div className="w-12 h-1 bg-blue-500 mx-auto mt-2 rounded-full overflow-hidden">
          <div className="w-full h-full bg-blue-300 animate-[loading_1.5s_infinite]"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-[#020617] text-slate-100 font-sans">
      
      {/* Sidebar (Desktop) / Top Bar (Mobile) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-6">
        <h1 className="text-2xl font-black text-blue-500 mb-10 tracking-tighter">FLOWPRO</h1>
        <nav className="space-y-2">
          {menuItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${tab === item.id ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:bg-slate-800"}`}
            >
              {item.icon} <span className="font-semibold">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-32">
        {/* Header Section */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{currentTime.toDateString()}</p>
            <h2 className="text-3xl font-black capitalize">{tab}</h2>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-2xl backdrop-blur-md">
            <p className="text-[10px] text-slate-500 uppercase font-bold text-right">Total Revenue</p>
            <p className="text-xl font-black text-emerald-400">${jobs.reduce((a, b) => a + Number(b.revenue || 0), 0).toLocaleString()}</p>
          </div>
        </header>

        {/* Dashboard View */}
        {tab === "dashboard" && (
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] shadow-2xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Briefcase size={18} className="text-blue-500"/> Job Distribution
              </h3>
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={chartData} 
                      innerRadius={70} 
                      outerRadius={100} 
                      paddingAngle={8} 
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', padding: '10px'}}
                      itemStyle={{color: '#fff', fontSize: '12px', fontWeight: 'bold'}}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               {STATUS_OPTIONS.map(status => (
                 <div key={status} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                    <p className="text-xs font-bold uppercase opacity-50" style={{color: STATUS_COLORS[status]}}>{status}</p>
                    <p className="text-2xl font-black">{jobs.filter(j => j.status === status).length}</p>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* Jobs View */}
        {tab === "jobs" && (
          <div className="space-y-6">
            <form onSubmit={handleAddJob} className="bg-blue-600/10 border border-blue-500/20 p-5 rounded-3xl space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input required className="bg-slate-950 p-4 rounded-2xl border border-slate-800 outline-none focus:border-blue-500" placeholder="Job Title" value={forms.job.title} onChange={e => setForms({...forms, job: {...forms.job, title: e.target.value}})}/>
                <select required className="bg-slate-950 p-4 rounded-2xl border border-slate-800 outline-none focus:border-blue-500 appearance-none" value={forms.job.customer_id} onChange={e => setForms({...forms, job: {...forms.job, customer_id: e.target.value}})}>
                  <option value="">Select Client</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-4 text-slate-500" size={18}/>
                  <input type="number" className="w-full bg-slate-950 p-4 pl-10 rounded-2xl border border-slate-800 outline-none" placeholder="Revenue" value={forms.job.revenue} onChange={e => setForms({...forms, job: {...forms.job, revenue: e.target.value}})}/>
                </div>
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-transform active:scale-95">
                <Plus size={20}/> BOOK JOB #{nextJobNumber}
              </button>
            </form>

            <div className="space-y-3">
              {jobs.map(j => (
                <div key={j.id} className="group bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-slate-600 transition-all">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">#{j.job_number}</span>
                        <h4 className="font-bold text-lg">{j.title}</h4>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{j.Customers?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-blue-400">${Number(j.revenue).toLocaleString()}</p>
                      <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md" style={{backgroundColor: `${STATUS_COLORS[j.status]}20`, color: STATUS_COLORS[j.status]}}>
                        {j.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end gap-4">
                      <button onClick={() => handleDelete("Jobs", j.id)} className="text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                      <button className="text-slate-600 hover:text-white transition-colors"><Edit2 size={18}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings View */}
        {tab === "settings" && (
          <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
            <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-6">
              <SettingsIcon className="text-blue-500" size={32}/>
            </div>
            <h3 className="text-2xl font-black mb-2">Configuration</h3>
            <p className="text-slate-500 text-sm mb-8">System-wide parameters and sequential numbering.</p>
            
            <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2 block">Next Job Number</label>
            <input 
              type="number" 
              className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 text-2xl font-black text-center mb-4 focus:border-blue-500 outline-none" 
              value={forms.settings} 
              onChange={e => setForms({...forms, settings: e.target.value})}
            />
            <button 
              onClick={async () => {
                await supabase.from("Settings").update({ next_job_number: parseInt(forms.settings) }).eq("id", 1);
                alert("Sequence Updated");
                fetchData();
              }}
              className="w-full bg-blue-600 p-5 rounded-2xl font-black text-lg shadow-lg shadow-blue-900/40 active:scale-95 transition-all"
            >
              SAVE SETTINGS
            </button>
          </div>
        )}
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 flex justify-around items-center px-4 py-4 z-50 rounded-t-[2rem]">
        {menuItems.map(item => (
          <button 
            key={item.id} 
            onClick={() => setTab(item.id)} 
            className={`flex flex-col items-center p-2 transition-all ${tab === item.id ? "text-blue-500 scale-110" : "text-slate-500"}`}
          >
            {item.icon}
            <span className="text-[9px] font-bold uppercase mt-1 tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

const menuItems = [
  { id: "dashboard", icon: <LayoutDashboard size={20}/>, label: "Home" },
  { id: "jobs", icon: <Wrench size={20}/>, label: "Jobs" },
  { id: "customers", icon: <Users size={20}/>, label: "Clients" },
  { id: "tasks", icon: <ListTodo size={20}/>, label: "Tasks" },
  { id: "settings", icon: <SettingsIcon size={20}/>, label: "Settings" }
];