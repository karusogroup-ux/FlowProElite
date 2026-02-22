import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseclient";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { 
  Users, LayoutDashboard, Calendar as CalIcon, Clock, 
  CheckCircle2, Circle, Wrench, Phone, MapPin, Edit2, Save, X, ListTodo, Trash2, Settings as SettingsIcon
} from "lucide-react";

// Professional color palette for statuses
const STATUS_COLORS = {
  'Quote': '#3b82f6',        // Blue
  'Work Order': '#f59e0b',   // Amber
  'Completed': '#10b981',    // Emerald
  'Unsuccessful': '#ef4444'  // Red
};

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // App Data State
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [nextJobNumber, setNextJobNumber] = useState(1000);

  // Form/Edit States
  const [newJob, setNewJob] = useState({ title: "", customer_id: "", revenue: "" });
  const [settingsInput, setSettingsInput] = useState(1000);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchData();
    return () => clearInterval(timer);
  }, []);

  async function fetchData() {
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
        setSettingsInput(sRes.data.next_job_number);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  // --- SETTINGS ACTIONS ---
  const handleUpdateSettings = async () => {
    const num = parseInt(settingsInput);
    const { error } = await supabase.from("Settings").update({ next_job_number: num }).eq("id", 1);
    if (!error) {
      setNextJobNumber(num);
      alert("Next Job Number updated!");
    }
  };

  // --- CHART LOGIC (Optimized with useMemo) ---
  const chartData = useMemo(() => {
    const counts = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(status => ({
      name: status,
      value: counts[status]
    }));
  }, [jobs]);

  // --- NAV ITEMS ---
  const navItems = [
    { id: "dashboard", icon: <LayoutDashboard size={24}/>, label: "Home" },
    { id: "jobs", icon: <Wrench size={24}/>, label: "Jobs" },
    { id: "customers", icon: <Users size={24}/>, label: "Clients" },
    { id: "tasks", icon: <ListTodo size={24}/>, label: "Tasks" },
    { id: "settings", icon: <SettingsIcon size={24}/>, label: "Settings" }
  ];

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-950 text-blue-500 font-bold animate-pulse text-2xl italic tracking-tighter">FLOWPRO...</div>;

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans pb-20 md:pb-0">
      
      {/* MOBILE NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 flex justify-around items-center p-3 z-50">
         {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`flex flex-col items-center p-2 ${tab === item.id ? "text-blue-500" : "text-slate-500"}`}>
              {item.icon} <span className="text-[10px] mt-1">{item.label}</span>
            </button>
          ))}
      </nav>

      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <header className="flex flex-col md:flex-row justify-between md:items-end mb-8 gap-6">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight">{tab}</h2>
            <p className="text-slate-500 text-sm mt-1">{currentTime.toLocaleTimeString()}</p>
          </div>
          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
            <span className="text-xs text-slate-500 font-bold uppercase block mb-1">Total Pipeline</span>
            <p className="text-3xl font-black text-blue-400">${jobs.reduce((a, b) => a + Number(b.revenue || 0), 0).toLocaleString()}</p>
          </div>
        </header>

        {/* --- DASHBOARD TAB --- */}
        {tab === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col items-center">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 self-start">Jobs by Status</h3>
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={chartData} 
                      innerRadius={70} 
                      outerRadius={100} 
                      paddingAngle={8} 
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#ccc'} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none' }} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 text-center">
                <p className="text-slate-500 text-xs uppercase font-bold tracking-widest">Total Active Jobs</p>
                <p className="text-5xl font-black text-white mt-2">{jobs.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {tab === "settings" && (
          <div className="max-w-2xl space-y-8">
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
              <h3 className="text-blue-500 font-bold mb-6 uppercase text-xs tracking-widest">App Configuration</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Next Job Number</label>
                  <div className="flex gap-4">
                    <input 
                      type="number" 
                      className="flex-1 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xl font-bold focus:border-blue-500 outline-none" 
                      value={settingsInput} 
                      onChange={(e) => setSettingsInput(e.target.value)}
                    />
                    <button 
                      onClick={handleUpdateSettings}
                      className="bg-blue-600 hover:bg-blue-500 px-8 rounded-2xl font-bold transition-colors"
                    >
                      Update
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 italic">The next job you create will be assigned this number.</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-blue-900/10 border border-blue-900/20 rounded-3xl">
              <h4 className="font-bold text-blue-400 mb-2">App Info</h4>
              <p className="text-sm text-slate-400">FlowPro Elite v2.1 • Optimized for Samsung S25 Ultra Web Environment</p>
            </div>
          </div>
        )}

        {/* ... (Keep Customers, Jobs, and Tasks tabs as they were) ... */}
      </main>
    </div>
  );
}