import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseclient";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { 
  Users, LayoutDashboard, Calendar as CalIcon, Clock, 
  CheckCircle2, Circle, Wrench, Phone, MapPin, Edit2, Save, X, ListTodo, Trash2, ChevronRight
} from "lucide-react";

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // App Data State
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [nextJobNumber, setNextJobNumber] = useState(1000);

  // Edit States
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editCustForm, setEditCustForm] = useState({ name: "", phone: "", address: "" });
  
  const [editingJob, setEditingJob] = useState(null);
  const [editJobForm, setEditJobForm] = useState({ title: "", revenue: "", status: "" });

  const [editingTask, setEditingTask] = useState(null);
  const [editTaskForm, setEditTaskForm] = useState({ content: "" });

  // Form States
  const [newJob, setNewJob] = useState({ title: "", customer_id: "", revenue: "", due_date: new Date().toISOString().split('T')[0] });
  const [todoInput, setTodoInput] = useState("");
  const [newEvent, setNewEvent] = useState({ title: "", event_date: new Date().toISOString().split('T')[0], customer_id: "" });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchData();
    return () => clearInterval(timer);
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [cRes, jRes, tRes, eRes, sRes] = await Promise.all([
        supabase.from("Customers").select("*").order("name"),
        supabase.from("Jobs").select("*, Customers(name)").order("job_number", { ascending: false }),
        supabase.from("Tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("CalendarEvents").select("*, Customers(name)").order("event_date", { ascending: true }),
        supabase.from("Settings").select("next_job_number").eq("id", 1).single()
      ]);
      if (cRes.data) setCustomers(cRes.data);
      if (jRes.data) setJobs(jRes.data);
      if (tRes.data) setTasks(tRes.data);
      if (eRes.data) setCalendarEvents(eRes.data);
      if (sRes.data) setNextJobNumber(sRes.data.next_job_number);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  // --- GENERIC DELETE HANDLER ---
  const handleDelete = async (table, id, stateSetter, currentState) => {
    if (!window.confirm(`Are you sure you want to delete this ${table.slice(0, -1)}?`)) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) stateSetter(currentState.filter(item => item.id !== id));
  };

  // --- CUSTOMER ACTIONS ---
  const handleUpdateCustomer = async (id) => {
    const { data, error } = await supabase.from("Customers").update(editCustForm).eq("id", id).select();
    if (!error) { setCustomers(customers.map(c => c.id === id ? data[0] : c)); setEditingCustomer(null); }
  };

  // --- JOB ACTIONS ---
  const handleAddJob = async (e) => {
    e.preventDefault();
    const payload = { ...newJob, status: 'Quote', job_number: nextJobNumber };
    const { data, error } = await supabase.from("Jobs").insert([payload]).select("*, Customers(name)");
    if (!error) {
      setJobs([data[0], ...jobs]);
      const nextNum = nextJobNumber + 1;
      await supabase.from("Settings").update({ next_job_number: nextNum }).eq("id", 1);
      setNextJobNumber(nextNum);
      setNewJob({ title: "", customer_id: "", revenue: "", due_date: new Date().toISOString().split('T')[0] });
    }
  };

  const handleUpdateJob = async (id) => {
    const { data, error } = await supabase.from("Jobs").update(editJobForm).eq("id", id).select("*, Customers(name)");
    if (!error) { setJobs(jobs.map(j => j.id === id ? data[0] : j)); setEditingJob(null); }
  };

  // --- TASK ACTIONS ---
  const handleUpdateTask = async (id) => {
    const { data, error } = await supabase.from("Tasks").update({ content: editTaskForm.content }).eq("id", id).select();
    if (!error) { setTasks(tasks.map(t => t.id === id ? data[0] : t)); setEditingTask(null); }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-950 text-blue-500 font-bold animate-pulse text-2xl">FLOWPRO...</div>;

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans pb-20 md:pb-0">
      
      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 flex justify-around items-center p-3 z-50">
         {[
           { id: "dashboard", icon: <LayoutDashboard/>, label: "Home" },
           { id: "jobs", icon: <Wrench/>, label: "Jobs" },
           { id: "customers", icon: <Users/>, label: "Clients" },
           { id: "tasks", icon: <ListTodo/>, label: "Tasks" }
         ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`flex flex-col items-center p-2 ${tab === item.id ? "text-blue-500" : "text-slate-500"}`}>
              {item.icon} <span className="text-[10px] mt-1">{item.label}</span>
            </button>
          ))}
      </nav>

      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <header className="flex flex-col md:flex-row justify-between md:items-end mb-8 gap-6">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight">{tab}</h2>
            <p className="text-slate-500 text-sm">{currentTime.toDateString()}</p>
          </div>
          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
            <span className="text-xs text-slate-500 uppercase font-bold">Pipeline Revenue</span>
            <p className="text-3xl font-black text-blue-400">${jobs.reduce((a, b) => a + Number(b.revenue || 0), 0).toLocaleString()}</p>
          </div>
        </header>

        {/* --- JOBS TAB --- */}
        {tab === "jobs" && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
              <h3 className="text-blue-500 font-bold mb-4 uppercase text-xs">Book New Job #{nextJobNumber}</h3>
              <form onSubmit={handleAddJob} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required className="bg-slate-950 p-4 rounded-2xl border border-slate-800" placeholder="Job Title" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})}/>
                <select required className="bg-slate-950 p-4 rounded-2xl border border-slate-800" value={newJob.customer_id} onChange={e => setNewJob({...newJob, customer_id: e.target.value})}>
                  <option value="">Select Client</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="number" className="bg-slate-950 p-4 rounded-2xl border border-slate-800" placeholder="Revenue" value={newJob.revenue} onChange={e => setNewJob({...newJob, revenue: e.target.value})}/>
                <button className="bg-blue-600 p-4 rounded-2xl font-bold">Create Quote</button>
              </form>
            </div>

            <div className="space-y-4">
              {jobs.map(j => (
                <div key={j.id} className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                  {editingJob === j.id ? (
                    <div className="space-y-4">
                      <input className="w-full bg-slate-950 p-3 rounded-xl border border-blue-500" value={editJobForm.title} onChange={e => setEditJobForm({...editJobForm, title: e.target.value})}/>
                      <div className="flex gap-2">
                        <select className="flex-1 bg-slate-950 p-3 rounded-xl border border-blue-500" value={editJobForm.status} onChange={e => setEditJobForm({...editJobForm, status: e.target.value})}>
                          <option value="Quote">Quote</option>
                          <option value="Work Order">Work Order</option>
                          <option value="Completed">Completed</option>
                          <option value="Unsuccessful">Unsuccessful</option>
                        </select>
                        <input type="number" className="w-1/3 bg-slate-950 p-3 rounded-xl border border-blue-500" value={editJobForm.revenue} onChange={e => setEditJobForm({...editJobForm, revenue: e.target.value})}/>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateJob(j.id)} className="flex-1 bg-emerald-600 p-3 rounded-xl font-bold">Save</button>
                        <button onClick={() => setEditingJob(null)} className="flex-1 bg-slate-800 p-3 rounded-xl">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded ${j.status === 'Completed' ? 'bg-emerald-900 text-emerald-400' : j.status === 'Unsuccessful' ? 'bg-red-900 text-red-400' : 'bg-blue-900 text-blue-400'}`}>{j.status}</span>
                          <h4 className="font-bold text-lg">{j.title}</h4>
                        </div>
                        <p className="text-slate-500 text-sm">{j.Customers?.name} • ${Number(j.revenue).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingJob(j.id); setEditJobForm({ title: j.title, revenue: j.revenue, status: j.status }); }} className="p-2 bg-slate-800 rounded-lg text-slate-400"><Edit2 size={18}/></button>
                        <button onClick={() => handleDelete("Jobs", j.id, setJobs, jobs)} className="p-2 bg-slate-800 rounded-lg text-red-400"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- CUSTOMERS TAB --- */}
        {tab === "customers" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customers.map(c => (
                <div key={c.id} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 relative">
                  {editingCustomer === c.id ? (
                    <div className="space-y-3">
                      <input className="w-full bg-slate-950 p-3 rounded-xl border border-blue-500" value={editCustForm.name} onChange={e => setEditCustForm({...editCustForm, name: e.target.value})}/>
                      <input className="w-full bg-slate-950 p-3 rounded-xl border border-blue-500" value={editCustForm.phone} onChange={e => setEditCustForm({...editCustForm, phone: e.target.value})}/>
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateCustomer(c.id)} className="flex-1 bg-emerald-600 p-3 rounded-xl font-bold">Save</button>
                        <button onClick={() => setEditingCustomer(null)} className="flex-1 bg-slate-800 p-3 rounded-xl">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <h4 className="font-bold text-xl">{c.name}</h4>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingCustomer(c.id); setEditCustForm({ name: c.name, phone: c.phone, address: c.address }); }} className="text-slate-500"><Edit2 size={18}/></button>
                          <button onClick={() => handleDelete("Customers", c.id, setCustomers, customers)} className="text-red-500"><Trash2 size={18}/></button>
                        </div>
                      </div>
                      <p className="text-slate-500 text-sm mt-2 flex items-center gap-2"><Phone size={14}/> {c.phone}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TASKS TAB --- */}
        {tab === "tasks" && (
          <div className="space-y-4">
            <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
              <input className="flex-1 bg-slate-900 p-4 rounded-2xl border border-slate-800" placeholder="New Task..." value={todoInput} onChange={e => setTodoInput(e.target.value)} />
              <button className="bg-blue-600 px-6 rounded-2xl font-bold">Add</button>
            </form>
            {tasks.map(t => (
              <div key={t.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex justify-between items-center">
                {editingTask === t.id ? (
                  <div className="flex-1 flex gap-2">
                    <input className="flex-1 bg-slate-950 p-2 rounded-lg border border-blue-500" value={editTaskForm.content} onChange={e => setEditTaskForm({content: e.target.value})}/>
                    <button onClick={() => handleUpdateTask(t.id)} className="text-emerald-500"><Save/></button>
                    <button onClick={() => setEditingTask(null)} className="text-slate-500"><X/></button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 flex-1" onClick={() => toggleTaskCompletion(t.id, t.is_completed)}>
                      {t.is_completed ? <CheckCircle2 className="text-emerald-500"/> : <Circle className="text-slate-600"/>}
                      <span className={t.is_completed ? "line-through text-slate-600" : ""}>{t.content}</span>
                    </div>
                    <div className="flex gap-4 ml-4">
                      <button onClick={() => { setEditingTask(t.id); setEditTaskForm({ content: t.content }); }} className="text-slate-600"><Edit2 size={16}/></button>
                      <button onClick={() => handleDelete("Tasks", t.id, setTasks, tasks)} className="text-slate-600 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}