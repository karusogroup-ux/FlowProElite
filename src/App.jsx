import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseclient";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { 
  Users, Briefcase, LayoutDashboard, Calendar as CalIcon, Clock, 
  ChevronLeft, CheckCircle2, Circle, Wrench, Phone, MapPin, Edit2, Save, X, ListTodo
} from "lucide-react";

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

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
  
  // Edit Customer State
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "" });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchData();
    return () => clearInterval(timer);
  }, []);

  async function fetchData() {
    try {
      const { data: cData } = await supabase.from("Customers").select("*").order("name");
      const { data: jData } = await supabase.from("Jobs").select("*, Customers(name)").order("job_number", { ascending: false });
      const { data: tData } = await supabase.from("Tasks").select("*").order("created_at", { ascending: false });
      const { data: eData } = await supabase.from("CalendarEvents").select("*, Customers(name)").order("event_date", { ascending: true });
      const { data: sData } = await supabase.from("Settings").select("next_job_number").eq("id", 1).single();

      if (cData) setCustomers(cData);
      if (jData) setJobs(jData);
      if (tData) setTasks(tData);
      if (eData) setCalendarEvents(eData);
      if (sData) setNextJobNumber(sData.next_job_number);
    } catch (e) { console.error("Load Error:", e); }
  }

  // --- CUSTOMER ACTIONS ---
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    const payload = {
      name: e.target.name.value,
      phone: e.target.phone.value,
      address: e.target.address.value
    };
    const { data, error } = await supabase.from("Customers").insert([payload]).select();
    if (!error) {
      setCustomers([...customers, data[0]]);
      e.target.reset();
    }
  };

  const startEditing = (customer) => {
    setEditingCustomer(customer.id);
    setEditForm({ name: customer.name, phone: customer.phone, address: customer.address });
  };

  const handleUpdateCustomer = async (id) => {
    const { data, error } = await supabase.from("Customers")
      .update({ ...editForm, updated_at: new Date() })
      .eq("id", id)
      .select();
    
    if (!error) {
      setCustomers(customers.map(c => c.id === id ? data[0] : c));
      setEditingCustomer(null);
    }
  };

  // --- JOB ACTIONS ---
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
      setNewJob({ ...newJob, title: "", revenue: "" });
    }
  };

  // --- TASK ACTIONS ---
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!todoInput) return;
    const { data, error } = await supabase.from("Tasks").insert([{ content: todoInput }]).select();
    if (!error) {
      setTasks([data[0], ...tasks]);
      setTodoInput("");
    }
  };

  const toggleTaskCompletion = async (id, currentStatus) => {
    const { data, error } = await supabase.from("Tasks").update({ is_completed: !currentStatus }).eq("id", id).select();
    if (!error) setTasks(tasks.map(t => t.id === id ? data[0] : t));
  };

  // --- CALENDAR ACTIONS ---
  const handleAddEvent = async (e) => {
    e.preventDefault();
    const payload = { ...newEvent, customer_id: newEvent.customer_id || null };
    const { data, error } = await supabase.from("CalendarEvents").insert([payload]).select("*, Customers(name)");
    if (!error) {
      setCalendarEvents([...calendarEvents, data[0]].sort((a, b) => new Date(a.event_date) - new Date(b.event_date)));
      setNewEvent({ ...newEvent, title: "" });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      
      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? "w-72" : "w-20"} bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300`}>
        <div className="p-6 flex items-center justify-between text-blue-500">
          {sidebarOpen && <h1 className="font-black text-2xl italic tracking-tighter">FLOWPRO</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-800 rounded text-slate-400"><ChevronLeft/></button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {[
            { id: "dashboard", icon: <LayoutDashboard size={20}/>, label: "Dashboard" },
            { id: "jobs", icon: <Wrench size={20}/>, label: "Jobs & Orders" },
            { id: "customers", icon: <Users size={20}/>, label: "Customers" },
            { id: "calendar", icon: <CalIcon size={20}/>, label: "Calendar" },
            { id: "tasks", icon: <ListTodo size={20}/>, label: "To-Do List" }
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setTab(item.id)} 
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-colors ${tab === item.id ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
            >
              {item.icon} {sidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
            </button>
          ))}

          {sidebarOpen && (
            <div className="mt-10 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Quick Tasks</h4>
              <form onSubmit={handleAddTask} className="mb-4">
                <input className="w-full bg-slate-900 border border-slate-700 p-2 rounded-lg text-xs outline-none focus:border-blue-500 transition-colors" placeholder="+ Add fast task..." value={todoInput} onChange={e => setTodoInput(e.target.value)} />
              </form>
              <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                {tasks.slice(0,5).map(t => (
                  <div key={t.id} className="flex items-start gap-2 text-xs group cursor-pointer" onClick={() => toggleTaskCompletion(t.id, t.is_completed)}>
                    {t.is_completed ? <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0"/> : <Circle size={14} className="text-slate-600 group-hover:text-blue-400 mt-0.5 shrink-0"/>}
                    <span className={t.is_completed ? "line-through text-slate-600" : "text-slate-300"}>{t.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <header className="flex flex-col md:flex-row justify-between md:items-end mb-12 gap-4">
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tight text-white">{tab.replace("-", " ")}</h2>
            <p className="text-slate-500 text-sm mt-2 flex items-center gap-2">
              <Clock size={14}/> {currentTime.toDateString()} | {currentTime.toLocaleTimeString()}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl md:text-right flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Pipeline</span>
            <p className="text-3xl font-black text-blue-400">${jobs.reduce((a, b) => a + Number(b.revenue || 0), 0).toLocaleString()}</p>
          </div>
        </header>

        {/* DASHBOARD TAB */}
        {tab === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl h-[400px] flex flex-col">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Active Jobs Overview</h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{name: 'Total Jobs', value: jobs.length || 1}]} innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                      <Cell fill="#3b82f6" />
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMERS TAB (Editable) */}
        {tab === "customers" && (
          <div className="space-y-8">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
              <h3 className="text-blue-500 font-bold mb-6 uppercase text-xs tracking-widest">Register New Client</h3>
              <form onSubmit={handleAddCustomer} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input required name="name" className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="Client Name" />
                <input required name="phone" className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="Phone Number" />
                <input required name="address" className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all md:col-span-2" placeholder="Full Service Address" />
                <button className="bg-blue-600 hover:bg-blue-500 text-white p-3.5 rounded-xl font-bold transition-colors md:col-span-4 mt-2">Add Customer Database</button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {customers.map(c => (
                <div key={c.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative group">
                  {editingCustomer === c.id ? (
                    <div className="space-y-3">
                      <input className="w-full bg-slate-950 p-2 border border-blue-500/50 rounded-lg text-sm" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Name"/>
                      <input className="w-full bg-slate-950 p-2 border border-blue-500/50 rounded-lg text-sm" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="Phone"/>
                      <input className="w-full bg-slate-950 p-2 border border-blue-500/50 rounded-lg text-sm" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} placeholder="Address"/>
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => handleUpdateCustomer(c.id)} className="flex-1 bg-emerald-600/20 text-emerald-500 p-2 rounded-lg flex items-center justify-center gap-2 text-sm hover:bg-emerald-600/30"><Save size={14}/> Save</button>
                        <button onClick={() => setEditingCustomer(null)} className="flex-1 bg-slate-800 text-slate-400 p-2 rounded-lg flex items-center justify-center gap-2 text-sm hover:bg-slate-700"><X size={14}/> Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => startEditing(c)} className="absolute top-6 right-6 text-slate-600 hover:text-blue-400 transition-colors"><Edit2 size={16}/></button>
                      <h4 className="font-bold text-lg text-slate-100 pr-8">{c.name}</h4>
                      <div className="text-sm text-slate-400 mt-4 space-y-3">
                        <p className="flex items-center gap-3"><Phone size={16} className="text-slate-600"/> {c.phone}</p>
                        <p className="flex items-center gap-3"><MapPin size={16} className="text-slate-600"/> {c.address}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CALENDAR TAB */}
        {tab === "calendar" && (
          <div className="space-y-8">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
              <h3 className="text-blue-500 font-bold mb-6 uppercase text-xs tracking-widest">Schedule Event</h3>
              <form onSubmit={handleAddEvent} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input required className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 md:col-span-2" placeholder="Event Title (e.g., Site Inspection)" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})}/>
                <input required type="date" className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-slate-300" value={newEvent.event_date} onChange={e => setNewEvent({...newEvent, event_date: e.target.value})}/>
                <select className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-slate-300" value={newEvent.customer_id} onChange={e => setNewEvent({...newEvent, customer_id: e.target.value})}>
                  <option value="">Link Client (Optional)</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="bg-blue-600 hover:bg-blue-500 p-3.5 rounded-xl font-bold md:col-span-4 mt-2">Save to Calendar</button>
              </form>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
              <h3 className="text-slate-500 font-bold mb-6 uppercase text-xs tracking-widest">Upcoming Schedule</h3>
              <div className="space-y-4">
                {calendarEvents.length === 0 ? <p className="text-slate-600 italic">No upcoming events.</p> : calendarEvents.map(evt => (
                  <div key={evt.id} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-900/30 text-blue-400 p-3 rounded-lg"><CalIcon size={20}/></div>
                      <div>
                        <p className="font-bold text-slate-200">{evt.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{evt.Customers ? `Linked to: ${evt.Customers.name}` : "General Event"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-300">{new Date(evt.event_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TASKS / TO-DO TAB */}
        {tab === "tasks" && (
           <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl min-h-[500px]">
             <h3 className="text-blue-500 font-bold mb-6 uppercase text-xs tracking-widest">Master Task List</h3>
             <form onSubmit={handleAddTask} className="flex gap-4 mb-8">
                <input className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 text-lg outline-none focus:border-blue-500" placeholder="What needs to get done?" value={todoInput} onChange={e => setTodoInput(e.target.value)} />
                <button className="bg-blue-600 hover:bg-blue-500 px-8 rounded-xl font-bold">Add</button>
             </form>

             <div className="space-y-2">
               {tasks.map(t => (
                  <div key={t.id} onClick={() => toggleTaskCompletion(t.id, t.is_completed)} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${t.is_completed ? 'bg-slate-950/50 border-slate-800/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}>
                    {t.is_completed ? <CheckCircle2 size={24} className="text-emerald-500 shrink-0"/> : <Circle size={24} className="text-slate-600 shrink-0"/>}
                    <span className={`text-lg ${t.is_completed ? "line-through text-slate-600" : "text-slate-200"}`}>{t.content}</span>
                  </div>
               ))}
             </div>
           </div>
        )}

        {/* JOBS TAB */}
        {tab === "jobs" && (
          <div className="space-y-8">
             <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
              <h3 className="text-blue-500 font-bold mb-6 uppercase text-xs tracking-widest">Book Job #{nextJobNumber}</h3>
              <form onSubmit={handleAddJob} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input required className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 md:col-span-2" placeholder="Job Title" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})}/>
                <select required className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-slate-300" value={newJob.customer_id} onChange={e => setNewJob({...newJob, customer_id: e.target.value})}>
                  <option value="">Select Client</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input required type="number" className="bg-slate-950 p-3.5 rounded-xl border border-slate-800" placeholder="Est. Revenue ($)" value={newJob.revenue} onChange={e => setNewJob({...newJob, revenue: e.target.value})}/>
                <button className="bg-blue-600 hover:bg-blue-500 p-3.5 rounded-xl font-bold md:col-span-4 mt-2">Create Order</button>
              </form>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {jobs.map(j => (
                 <div key={j.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="bg-blue-900/40 text-blue-400 text-xs font-bold px-2 py-1 rounded">#{j.job_number}</span>
                        <h4 className="font-bold text-lg text-slate-200">{j.title}</h4>
                      </div>
                      <p className="text-slate-500 text-sm">{j.Customers?.name || "Unknown Client"}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-lg font-bold text-slate-300">${Number(j.revenue).toLocaleString()}</p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">{j.status}</p>
                    </div>
                 </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}