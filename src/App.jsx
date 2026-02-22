import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseclient";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { 
  Users, LayoutDashboard, Calendar as CalIcon, Clock, 
  CheckCircle2, Circle, Wrench, Phone, MapPin, Edit2, Save, X, ListTodo, Trash2
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

  // Form States
  const [newJob, setNewJob] = useState({ title: "", customer_id: "", revenue: "", due_date: new Date().toISOString().split('T')[0] });
  const [todoInput, setTodoInput] = useState("");
  const [newEvent, setNewEvent] = useState({ title: "", event_date: new Date().toISOString().split('T')[0], customer_id: "" });
  
  // Edit States
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "" });
  
  const [editingJob, setEditingJob] = useState(null);
  const [editJobForm, setEditJobForm] = useState({ title: "", revenue: "", status: "" });

  const navItems = [
    { id: "dashboard", icon: <LayoutDashboard size={24}/>, label: "Home" },
    { id: "jobs", icon: <Wrench size={24}/>, label: "Jobs" },
    { id: "customers", icon: <Users size={24}/>, label: "Clients" },
    { id: "calendar", icon: <CalIcon size={24}/>, label: "Schedule" },
    { id: "tasks", icon: <ListTodo size={24}/>, label: "Tasks" }
  ];

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
    } catch (e) { 
      console.error("Load Error:", e); 
    } finally {
      setLoading(false);
    }
  }

  // --- ACTIONS ---
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    const payload = { name: e.target.name.value, phone: e.target.phone.value, address: e.target.address.value };
    const { data, error } = await supabase.from("Customers").insert([payload]).select();
    if (!error) { setCustomers([...customers, data[0]]); e.target.reset(); }
  };

  const handleUpdateCustomer = async (id) => {
    const { data, error } = await supabase.from("Customers").update(editForm).eq("id", id).select();
    if (!error) {
      setCustomers(customers.map(c => c.id === id ? data[0] : c));
      setEditingCustomer(null);
    }
  };

  const handleAddJob = async (e) => {
    e.preventDefault();
    if (!newJob.title || !newJob.customer_id) return;
    const payload = { ...newJob, revenue: parseFloat(newJob.revenue || 0), job_number: nextJobNumber };
    const { data, error } = await supabase.from("Jobs").insert([payload]).select("*, Customers(name)");
    if (!error) {
      setJobs([data[0], ...jobs]);
      const nextNum = nextJobNumber + 1;
      await supabase.from("Settings").update({ next_job_number: nextNum }).eq("id", 1);
      setNextJobNumber(nextNum);
      setNewJob({ ...newJob, title: "", revenue: "", customer_id: "" });
    }
  };

  const handleUpdateJob = async (id) => {
    const { data, error } = await supabase.from("Jobs")
      .update({ 
        title: editJobForm.title, 
        revenue: parseFloat(editJobForm.revenue || 0),
        status: editJobForm.status
      })
      .eq("id", id)
      .select("*, Customers(name)");
    
    if (!error) {
      setJobs(jobs.map(j => j.id === id ? data[0] : j));
      setEditingJob(null);
    }
  };

  const handleDeleteJob = async (id) => {
    if (!window.confirm("Delete this job permanently?")) return;
    const { error } = await supabase.from("Jobs").delete().eq("id", id);
    if (!error) setJobs(jobs.filter(j => j.id !== id));
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!todoInput) return;
    const { data, error } = await supabase.from("Tasks").insert([{ content: todoInput }]).select();
    if (!error) { setTasks([data[0], ...tasks]); setTodoInput(""); }
  };

  const toggleTaskCompletion = async (id, currentStatus) => {
    const { data, error } = await supabase.from("Tasks").update({ is_completed: !currentStatus }).eq("id", id).select();
    if (!error) setTasks(tasks.map(t => t.id === id ? data[0] : t));
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    const payload = { ...newEvent, customer_id: newEvent.customer_id || null };
    const { data, error } = await supabase.from("CalendarEvents").insert([payload]).select("*, Customers(name)");
    if (!error) {
      setCalendarEvents([...calendarEvents, data[0]].sort((a, b) => new Date(a.event_date) - new Date(b.event_date)));
      setNewEvent({ ...newEvent, title: "", customer_id: "" });
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-950 text-blue-500 font-bold animate-pulse text-2xl tracking-tighter italic">FLOWPRO...</div>;

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans pb-20 md:pb-0">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-72 bg-slate-900 border-r border-slate-800 flex-col transition-all duration-300">
        <div className="p-8 text-blue-500">
          <h1 className="font-black text-3xl italic tracking-tighter">FLOWPRO</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`w-full flex items-center gap-4 p-4 rounded-xl transition-colors ${tab === item.id ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}>
              {item.icon} <span className="font-medium text-md">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 flex justify-around items-center p-3 pb-safe z-50">
         {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`flex flex-col items-center p-2 rounded-lg ${tab === item.id ? "text-blue-500" : "text-slate-500"}`}>
              {item.icon}
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
            </button>
          ))}
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <header className="flex flex-col md:flex-row justify-between md:items-end mb-8 md:mb-12 gap-6">
          <div className="mt-4 md:mt-0">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">{tab.replace("-", " ")}</h2>
            <p className="text-slate-500 text-sm mt-2 flex items-center gap-2">
              <Clock size={14}/> {currentTime.toDateString()}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl md:text-right w-full md:w-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Total Pipeline</span>
            <p className="text-4xl font-black text-blue-400">${jobs.reduce((a, b) => a + Number(b.revenue || 0), 0).toLocaleString()}</p>
          </div>
        </header>

        {tab === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl h-[350px] md:h-[450px] flex flex-col">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Active Jobs Overview</h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{name: 'Total Jobs', value: jobs.length || 1}]} innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                      <Cell fill="#3b82f6" />
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {tab === "customers" && (
          <div className="space-y-8">
            <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl">
              <h3 className="text-blue-500 font-bold mb-6 uppercase text-xs tracking-widest">Register New Client</h3>
              <form onSubmit={handleAddCustomer} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input required name="name" className="bg-slate-950 p-4 rounded-2xl border border-slate-800 outline-none focus:border-blue-500 transition-all text-base" placeholder="Client Name" />
                <input required name="phone" type="tel" className="bg-slate-950 p-4 rounded-2xl border border-slate-800 outline-none focus:border-blue-500 transition-all text-base" placeholder="Phone Number" />
                <input required name="address" className="bg-slate-950 p-4 rounded-2xl border border-slate-800 outline-none focus:border-blue-500 md:col-span-2 text-base" placeholder="Full Service Address" />
                <button className="bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-2xl font-bold transition-colors md:col-span-4 mt-2 text-lg">Save Client</button>
              </form>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {customers.map(c => (
                <div key={c.id} className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl relative">
                  {editingCustomer === c.id ? (
                    <div className="space-y-4">
                      <input className="w-full bg-slate-950 p-3 border border-blue-500/50 rounded-xl text-base" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/>
                      <input className="w-full bg-slate-950 p-3 border border-blue-500/50 rounded-xl text-base" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}/>
                      <input className="w-full bg-slate-950 p-3 border border-blue-500/50 rounded-xl text-base" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})}/>
                      <div className="flex gap-3">
                        <button onClick={() => handleUpdateCustomer(c.id)} className="flex-1 bg-emerald-600/20 text-emerald-500 p-3 rounded-xl font-semibold"><Save size={18} className="inline mr-1"/> Save</button>
                        <button onClick={() => setEditingCustomer(null)} className="flex-1 bg-slate-800 text-slate-400 p-3 rounded-xl font-semibold">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => { setEditingCustomer(c.id); setEditForm({ name: c.name, phone: c.phone, address: c.address }); }} className="absolute top-6 right-6 text-slate-500 hover:text-blue-400 p-2"><Edit2 size={20}/></button>
                      <h4 className="font-bold text-xl text-slate-100">{c.name}</h4>
                      <div className="text-base text-slate-400 mt-6 space-y-4">
                        <p className="flex items-center gap-4"><Phone size={18}/> {c.phone}</p>
                        <p className="flex items-center gap-4"><MapPin size={18}/> {c.address}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "jobs" && (
          <div className="space-y-8">
            <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl">
              <h3 className="text-blue-500 font-bold mb-6 uppercase text-xs tracking-widest">Book New Job #{nextJobNumber}</h3>
              <form onSubmit={handleAddJob} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input required className="bg-slate-950 p-4 rounded-2xl border border-slate-800 md:col-span-2" placeholder="Job Title" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})}/>
                <select required className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-slate-300" value={newJob.customer_id} onChange={e => setNewJob({...newJob, customer_id: e.target.value})}>
                  <option value="">Select Client</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input required type="number" className="bg-slate-950 p-4 rounded-2xl border border-slate-800" placeholder="Revenue ($)" value={newJob.revenue} onChange={e => setNewJob({...newJob, revenue: e.target.value})}/>
                <button className="bg-blue-600 p-4 rounded-2xl font-bold md:col-span-4 mt-2 text-lg">Create Job</button>
              </form>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {jobs.map(j => (
                <div key={j.id} className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl flex flex-col md:flex-row justify-between gap-6 relative">
                  {editingJob === j.id ? (
                    <div className="w-full space-y-4">
                      <input className="w-full bg-slate-950 p-3 rounded-xl border border-blue-500/50" value={editJobForm.title} onChange={e => setEditJobForm({...editJobForm, title: e.target.value})}/>
                      <div className="flex gap-4">
                        <input type="number" className="w-1/2 bg-slate-950 p-3 rounded-xl border border-blue-500/50" value={editJobForm.revenue} onChange={e => setEditJobForm({...editJobForm, revenue: e.target.value})}/>
                        <select className="w-1/2 bg-slate-950 p-3 rounded-xl border border-blue-500/50 text-slate-300" value={editJobForm.status} onChange={e => setEditJobForm({...editJobForm, status: e.target.value})}>
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => handleUpdateJob(j.id)} className="flex-1 bg-emerald-600/20 text-emerald-500 p-3 rounded-xl font-bold"><Save size={18} className="inline mr-1"/> Save</button>
                        <button onClick={() => setEditingJob(null)} className="flex-1 bg-slate-800 text-slate-400 p-3 rounded-xl">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-blue-900/40 text-blue-400 text-xs font-bold px-3 py-1 rounded-lg">#{j.job_number}</span>
                          <h4 className="font-bold text-xl text-slate-200">{j.title}</h4>
                        </div>
                        <p className="text-slate-500">{j.Customers?.name || "Private Client"}</p>
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-6 md:w-1/3">
                        <div className="text-left md:text-right">
                          <p className="text-xl font-black text-slate-300">${Number(j.revenue).toLocaleString()}</p>
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${j.status === 'Completed' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>{j.status}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingJob(j.id); setEditJobForm({ title: j.title, revenue: j.revenue, status: j.status }); }} className="p-3 bg-slate-950 rounded-xl text-slate-400 hover:text-blue-400 transition-colors border border-slate-800"><Edit2 size={20}/></button>
                          <button onClick={() => handleDeleteJob(j.id)} className="p-3 bg-slate-950 rounded-xl text-slate-400 hover:text-red-400 transition-colors border border-slate-800"><Trash2 size={20}/></button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "calendar" && (
          <div className="space-y-8">
            <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl">
              <h3 className="text-blue-500 font-bold mb-6 uppercase text-xs tracking-widest">Schedule New Event</h3>
              <form onSubmit={handleAddEvent} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input required className="bg-slate-950 p-4 rounded-2xl border border-slate-800 md:col-span-2" placeholder="Event Name" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})}/>
                <input required type="date" className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-slate-300" value={newEvent.event_date} onChange={e => setNewEvent({...newEvent, event_date: e.target.value})}/>
                <select className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-slate-300" value={newEvent.customer_id} onChange={e => setNewEvent({...newEvent, customer_id: e.target.value})}>
                  <option value="">No Client Linked</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="bg-blue-600 p-4 rounded-2xl font-bold md:col-span-4 mt-2">Add to Schedule</button>
              </form>
            </div>
            <div className="space-y-4">
              {calendarEvents.map(evt => (
                <div key={evt.id} className="flex items-center justify-between p-6 bg-slate-900 border border-slate-800 rounded-3xl">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-900/30 p-4 rounded-2xl text-blue-400"><CalIcon size={24}/></div>
                    <div>
                      <h4 className="font-bold text-lg">{evt.title}</h4>
                      <p className="text-sm text-slate-500">{evt.Customers?.name ? `Meeting with ${evt.Customers.name}` : 'General Event'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-300">{new Date(evt.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "tasks" && (
           <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl min-h-[500px]">
             <h3 className="text-blue-500 font-bold mb-6 uppercase text-xs tracking-widest">Master Task List</h3>
             <form onSubmit={handleAddTask} className="flex flex-col md:flex-row gap-4 mb-8">
                <input className="flex-1 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-lg outline-none focus:border-blue-500" placeholder="New task..." value={todoInput} onChange={e => setTodoInput(e.target.value)} />
                <button className="bg-blue-600 p-4 md:px-8 rounded-2xl font-bold text-lg">Add Task</button>
             </form>
             <div className="space-y-3">
               {tasks.map(t => (
                  <div key={t.id} onClick={() => toggleTaskCompletion(t.id, t.is_completed)} className={`flex items-center gap-5 p-5 rounded-2xl border cursor-pointer transition-all ${t.is_completed ? 'bg-slate-950/50 border-slate-800/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}>
                    {t.is_completed ? <CheckCircle2 size={28} className="text-emerald-500 shrink-0"/> : <Circle size={28} className="text-slate-600 shrink-0"/>}
                    <span className={`text-lg ${t.is_completed ? "line-through text-slate-600" : "text-slate-200"}`}>{t.content}</span>
                  </div>
               ))}
             </div>
           </div>
        )}
      </main>
    </div>
  );
}