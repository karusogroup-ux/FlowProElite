import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseclient";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { 
  Users, LayoutDashboard, Calendar as CalIcon, Clock, 
  CheckCircle2, Circle, Wrench, Phone, MapPin, Edit2, Save, X, ListTodo, Trash2, Settings as SettingsIcon
} from "lucide-react";

const STATUS_COLORS = {
  'Quote': '#3b82f6', 'Work Order': '#f59e0b', 'Completed': '#10b981', 'Unsuccessful': '#ef4444'
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

  // Edit/Form States
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editCustForm, setEditCustForm] = useState({ name: "", phone: "", address: "" });
  const [editingJob, setEditingJob] = useState(null);
  const [editJobForm, setEditJobForm] = useState({ title: "", revenue: "", status: "" });
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskForm, setEditTaskForm] = useState({ content: "" });

  const [newJob, setNewJob] = useState({ title: "", customer_id: "", revenue: "" });
  const [todoInput, setTodoInput] = useState("");
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
      if (sRes.data) { setNextJobNumber(sRes.data.next_job_number); setSettingsInput(sRes.data.next_job_number); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  // --- HANDLERS (RESTORATION) ---
  const handleDelete = async (table, id, stateSetter, currentState) => {
    if (!window.confirm(`Permanently delete this ${table.slice(0, -1)}?`)) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) stateSetter(currentState.filter(item => item.id !== id));
  };

  const handleUpdateSettings = async () => {
    const { error } = await supabase.from("Settings").update({ next_job_number: parseInt(settingsInput) }).eq("id", 1);
    if (!error) { setNextJobNumber(parseInt(settingsInput)); alert("Settings Updated"); }
  };

  const handleAddJob = async (e) => {
    e.preventDefault();
    const payload = { ...newJob, status: 'Quote', job_number: nextJobNumber, revenue: parseFloat(newJob.revenue || 0) };
    const { data, error } = await supabase.from("Jobs").insert([payload]).select("*, Customers(name)");
    if (!error) {
      setJobs([data[0], ...jobs]);
      const nextNum = nextJobNumber + 1;
      await supabase.from("Settings").update({ next_job_number: nextNum }).eq("id", 1);
      setNextJobNumber(nextNum);
      setNewJob({ title: "", customer_id: "", revenue: "" });
    }
  };

  // --- DASHBOARD CHART LOGIC ---
  const chartData = useMemo(() => {
    const counts = jobs.reduce((acc, job) => { acc[job.status] = (acc[job.status] || 0) + 1; return acc; }, {});
    return Object.keys(counts).map(status => ({ name: status, value: counts[status] }));
  }, [jobs]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-950 text-blue-500 font-bold animate-pulse text-2xl">FLOWPRO...</div>;

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans pb-20 md:pb-0">
      
      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 flex justify-around items-center p-3 z-50">
         {[
           { id: "dashboard", icon: <LayoutDashboard/>, label: "Home" },
           { id: "jobs", icon: <Wrench/>, label: "Jobs" },
           { id: "customers", icon: <Users/>, label: "Clients" },
           { id: "tasks", icon: <ListTodo/>, label: "Tasks" },
           { id: "settings", icon: <SettingsIcon/>, label: "Settings" }
         ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`flex flex-col items-center p-2 ${tab === item.id ? "text-blue-500" : "text-slate-500"}`}>
              {item.icon} <span className="text-[10px] mt-1">{item.label}</span>
            </button>
          ))}
      </nav>

      <main className="flex-1 overflow-y-auto p-4 md:p-12">
        <header className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">{tab}</h2>
            <p className="text-slate-500 text-[10px]">{currentTime.toLocaleTimeString()}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Revenue</span>
            <p className="text-xl font-black text-blue-400">${jobs.reduce((a, b) => a + Number(b.revenue || 0), 0).toLocaleString()}</p>
          </div>
        </header>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col items-center">
            <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {chartData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || '#333'} />)}
                  </Pie>
                  <Tooltip contentStyle={{backgroundColor: '#0f172a', borderRadius: '12px', border: 'none'}}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-3xl font-black mt-4">{jobs.length} Total Jobs</p>
          </div>
        )}

        {/* JOBS RESTORED */}
        {tab === "jobs" && (
          <div className="space-y-4">
            <form onSubmit={handleAddJob} className="bg-slate-900 p-4 rounded-3xl border border-slate-800 space-y-3">
              <input required className="w-full bg-slate-950 p-3 rounded-2xl border border-slate-800" placeholder="Title" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})}/>
              <select required className="w-full bg-slate-950 p-3 rounded-2xl border border-slate-800" value={newJob.customer_id} onChange={e => setNewJob({...newJob, customer_id: e.target.value})}>
                <option value="">Select Client</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="number" className="w-full bg-slate-950 p-3 rounded-2xl border border-slate-800" placeholder="Revenue" value={newJob.revenue} onChange={e => setNewJob({...newJob, revenue: e.target.value})}/>
              <button className="w-full bg-blue-600 p-3 rounded-2xl font-bold">Book Job #{nextJobNumber}</button>
            </form>
            {jobs.map(j => (
              <div key={j.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                {editingJob === j.id ? (
                  <div className="space-y-2">
                    <input className="w-full bg-slate-950 p-2 rounded-lg border border-blue-500" value={editJobForm.title} onChange={e => setEditJobForm({...editJobForm, title: e.target.value})}/>
                    <select className="w-full bg-slate-950 p-2 rounded-lg border border-blue-500" value={editJobForm.status} onChange={e => setEditJobForm({...editJobForm, status: e.target.value})}>
                      <option value="Quote">Quote</option><option value="Work Order">Work Order</option><option value="Completed">Completed</option><option value="Unsuccessful">Unsuccessful</option>
                    </select>
                    <div className="flex gap-2">
                      <button onClick={async () => { await supabase.from("Jobs").update(editJobForm).eq("id", j.id); fetchData(); setEditingJob(null); }} className="flex-1 bg-emerald-600 p-2 rounded-lg font-bold">Save</button>
                      <button onClick={() => setEditingJob(null)} className="flex-1 bg-slate-800 p-2 rounded-lg">X</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold">{j.title}</p>
                      <p className="text-[10px] text-slate-500">{j.Customers?.name} | {j.status}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {setEditingJob(j.id); setEditJobForm({title: j.title, revenue: j.revenue, status: j.status});}}><Edit2 size={16}/></button>
                      <button onClick={() => handleDelete("Jobs", j.id, setJobs, jobs)} className="text-red-500"><Trash2 size={16}/></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CUSTOMERS RESTORED */}
        {tab === "customers" && (
          <div className="space-y-4">
            {customers.map(c => (
              <div key={c.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                {editingCustomer === c.id ? (
                  <div className="space-y-2">
                    <input className="w-full bg-slate-950 p-2 rounded-lg" value={editCustForm.name} onChange={e => setEditCustForm({...editCustForm, name: e.target.value})}/>
                    <button onClick={async () => { await supabase.from("Customers").update(editCustForm).eq("id", c.id); fetchData(); setEditingCustomer(null); }} className="w-full bg-emerald-600 p-2 rounded-lg">Save</button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <p className="font-bold">{c.name}</p>
                    <div className="flex gap-3">
                      <button onClick={() => {setEditingCustomer(c.id); setEditCustForm({name: c.name, phone: c.phone, address: c.address});}}><Edit2 size={16}/></button>
                      <button onClick={() => handleDelete("Customers", c.id, setCustomers, customers)} className="text-red-500"><Trash2 size={16}/></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TASKS RESTORED */}
        {tab === "tasks" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input className="flex-1 bg-slate-900 p-3 rounded-xl" placeholder="Add Task" value={todoInput} onChange={e => setTodoInput(e.target.value)}/>
              <button onClick={async () => { await supabase.from("Tasks").insert([{content: todoInput}]); setTodoInput(""); fetchData(); }} className="bg-blue-600 px-4 rounded-xl font-bold">Add</button>
            </div>
            {tasks.map(t => (
              <div key={t.id} className="bg-slate-900 p-4 rounded-xl flex justify-between">
                <p className={t.is_completed ? "line-through text-slate-600" : ""}>{t.content}</p>
                <button onClick={() => handleDelete("Tasks", t.id, setTasks, tasks)} className="text-red-500"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        )}

        {/* SETTINGS (Optimized for S25 Ultra) */}
        {tab === "settings" && (
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-6">
            <h3 className="text-blue-500 font-bold uppercase text-xs">Configuration</h3>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold">Next Job Number</label>
              <div className="flex flex-col gap-3 mt-2">
                <input type="number" className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xl font-bold text-center" value={settingsInput} onChange={e => setSettingsInput(e.target.value)}/>
                <button onClick={handleUpdateSettings} className="bg-blue-600 p-4 rounded-2xl font-bold text-lg active:scale-95 transition-transform">Update Settings</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}