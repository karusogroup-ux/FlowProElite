import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseclient";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { 
  Users, LayoutDashboard, Wrench, ListTodo, Plus, Edit2, Trash2, 
  X, DollarSign, Phone, FileText, Download, CheckCircle2, Circle, Clock
} from "lucide-react";

const STATUS_COLORS = {
  'Quote': '#facc15', 'Work Order': '#3b82f6', 'Completed': '#22c55e', 'Unsuccessful': '#ef4444'
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

  // Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", address: "", email: "" });
  const [newJob, setNewJob] = useState({ title: "", customer_id: "", revenue: "", description: "" });
  const [newTaskText, setNewTaskText] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchData();
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, jRes, tRes] = await Promise.all([
        supabase.from("Customers").select("*").order("name"),
        supabase.from("Jobs").select("*, Customers(*)").order("job_number", { ascending: false }),
        supabase.from("Tasks").select("*").order("created_at", { ascending: false })
      ]);
      if (cRes.data) setCustomers(cRes.data);
      if (jRes.data) setJobs(jRes.data);
      if (tRes.data) setTasks(tRes.data);
    } finally {
      setLoading(false);
    }
  };

  // --- CRUD FUNCTIONS (FIXED) ---
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("Customers").insert([newCustomer]);
    if (!error) {
      setNewCustomer({ name: "", phone: "", address: "", email: "" });
      setShowAddModal(false);
      fetchData();
    }
  };

  const handleAddJob = async (e) => {
    e.preventDefault();
    const payload = { ...newJob, revenue: parseFloat(newJob.revenue || 0), status: 'Quote' };
    const { error } = await supabase.from("Jobs").insert([payload]);
    if (!error) {
      setNewJob({ title: "", customer_id: "", revenue: "", description: "" });
      setShowAddModal(false);
      fetchData();
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskText) return;
    await supabase.from("Tasks").insert([{ task_text: newTaskText }]);
    setNewTaskText("");
    fetchData();
  };

  const toggleTask = async (id, status) => {
    await supabase.from("Tasks").update({ is_completed: !status }).eq("id", id);
    fetchData();
  };

  const handleUpdate = async () => {
    const { type, id, data } = editingItem;
    const table = type === 'job' ? 'Jobs' : 'Customers';
    // Fix: Remove joined object before update
    const { Customers, ...cleanData } = data; 
    await supabase.from(table).update(cleanData).eq("id", id);
    setEditingItem(null);
    fetchData();
  };

  const handleDelete = async (table, id) => {
    if (window.confirm("Delete permanently?")) {
      await supabase.from(table).delete().eq("id", id);
      fetchData();
    }
  };

  const generatePDF = (job) => {
    const doc = new jsPDF();
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("FLOWPRO SYSTEMS", 14, 25);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`JOB #${job.job_number} - ${job.title}`, 14, 55);
    doc.autoTable({
      startY: 65,
      head: [['Client', 'Status', 'Total Value']],
      body: [[job.Customers?.name || 'N/A', job.status, `$${job.revenue}`]],
    });
    doc.save(`FlowPro_${job.job_number}.pdf`);
  };

  const chartData = useMemo(() => STATUS_OPTIONS.map(s => ({ name: s, value: jobs.filter(j => j.status === s).length })), [jobs]);

  if (loading && jobs.length === 0) return <div className="h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black animate-pulse text-2xl">FLOWPRO</div>;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#020617] text-slate-100 overflow-hidden font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 border-r border-slate-800 p-8">
        <h1 className="text-3xl font-black text-blue-500 mb-12 italic tracking-tighter">FLOWPRO</h1>
        <nav className="space-y-3">
          {[
            { id: "dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
            { id: "jobs", icon: <Wrench />, label: "Jobs" },
            { id: "customers", icon: <Users />, label: "Clients" },
            { id: "tasks", icon: <ListTodo />, label: "To-Do List" }
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${tab === item.id ? "bg-blue-600 shadow-lg" : "text-slate-400 hover:bg-slate-800"}`}>
              {item.icon} <span className="font-bold">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-12 pb-32">
        <header className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <Clock size={14} />
              <p className="text-[10px] font-black uppercase tracking-widest">{currentTime.toLocaleTimeString()}</p>
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter">{tab}</h2>
          </div>
          <button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-500 p-4 rounded-2xl shadow-xl transition-all active:scale-90">
            <Plus size={28}/>
          </button>
        </header>

        {/* DASHBOARD TAB */}
        {tab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none">
                      {chartData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name]} />)}
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: '#0f172a', borderRadius: '15px', border: 'none'}}/>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-10 rounded-[3rem] shadow-2xl flex flex-col justify-center">
              <h3 className="text-blue-100 font-bold uppercase text-xs tracking-widest mb-2">Total Revenue Pipeline</h3>
              <p className="text-6xl font-black text-white tracking-tighter">${jobs.reduce((a, b) => a + Number(b.revenue || 0), 0).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* JOBS TAB */}
        {tab === "jobs" && (
          <div className="space-y-4">
            {jobs.map(j => (
              <div key={j.id} className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex justify-between items-center group">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="bg-slate-800 text-slate-400 text-[10px] font-black px-2 py-1 rounded">#{j.job_number}</span>
                    <h4 className="text-xl font-bold">{j.title}</h4>
                  </div>
                  <p className="text-slate-400 text-sm flex items-center gap-2"><Users size={14}/> {j.Customers?.name}</p>
                  <div className="mt-3">
                    <span className="text-[10px] font-black px-3 py-1 rounded-full" style={{backgroundColor: `${STATUS_COLORS[j.status]}20`, color: STATUS_COLORS[j.status]}}>{j.status}</span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-3">
                  <p className="text-2xl font-black text-emerald-400">${Number(j.revenue).toLocaleString()}</p>
                  <div className="flex gap-2">
                    <button onClick={() => generatePDF(j)} className="p-2 bg-slate-800 rounded-lg text-blue-400 hover:bg-blue-600 hover:text-white transition-all"><Download size={20}/></button>
                    <button onClick={() => setEditingItem({type: 'job', id: j.id, data: j})} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white"><Edit2 size={20}/></button>
                    <button onClick={() => handleDelete('Jobs', j.id)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-red-500"><Trash2 size={20}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CUSTOMERS TAB */}
        {tab === "customers" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map(c => (
              <div key={c.id} className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-xl mb-4">{c.name[0]}</div>
                <h4 className="text-xl font-black">{c.name}</h4>
                <p className="text-slate-500 text-sm mb-4">{c.address || 'No Address'}</p>
                <div className="flex gap-3 border-t border-slate-800 pt-4">
                  <a href={`tel:${c.phone}`} className="text-blue-500 font-bold flex items-center gap-2 text-sm"><Phone size={14}/> Call</a>
                  <button onClick={() => setEditingItem({type: 'customer', id: c.id, data: c})} className="ml-auto text-slate-500"><Edit2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TASKS TAB (RESTORED) */}
        {tab === "tasks" && (
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleAddTask} className="flex gap-4 mb-8">
              <input className="flex-1 bg-slate-900 border border-slate-800 p-4 rounded-2xl outline-none focus:border-blue-500" placeholder="New task..." value={newTaskText} onChange={e => setNewTaskText(e.target.value)} />
              <button className="bg-blue-600 px-6 rounded-2xl font-bold">ADD</button>
            </form>
            <div className="space-y-3">
              {tasks.map(t => (
                <div key={t.id} onClick={() => toggleTask(t.id, t.is_completed)} className={`flex items-center gap-4 p-5 bg-slate-900 rounded-2xl border border-slate-800 cursor-pointer transition-all ${t.is_completed ? "opacity-40" : ""}`}>
                  {t.is_completed ? <CheckCircle2 className="text-emerald-500"/> : <Circle className="text-slate-600"/>}
                  <span className={`text-lg ${t.is_completed ? "line-through" : ""}`}>{t.task_text}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete('Tasks', t.id); }} className="ml-auto text-slate-600 hover:text-red-500"><Trash2 size={18}/></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODALS (FIXED FOR ADDING) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-slate-900 w-full max-w-xl rounded-[3rem] p-10 border border-slate-800 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-black italic underline decoration-blue-500 uppercase">NEW {tab === 'jobs' ? 'Project' : 'Client'}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-3 bg-slate-800 rounded-full"><X/></button>
            </div>
            
            {tab === 'jobs' ? (
              <form onSubmit={handleAddJob} className="space-y-4">
                <input required className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800" placeholder="Project Name" onChange={e => setNewJob({...newJob, title: e.target.value})}/>
                <select required className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 appearance-none" onChange={e => setNewJob({...newJob, customer_id: e.target.value})}>
                  <option value="">Select Client</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="relative">
                  <DollarSign className="absolute left-5 top-5 text-slate-500"/>
                  <input type="number" className="w-full bg-slate-950 p-5 pl-12 rounded-2xl border border-slate-800" placeholder="Price" onChange={e => setNewJob({...newJob, revenue: e.target.value})}/>
                </div>
                <button className="w-full bg-blue-600 p-6 rounded-[2rem] font-black text-xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40">BOOK JOB</button>
              </form>
            ) : (
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <input required className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800" placeholder="Client Name" onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}/>
                <input className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800" placeholder="Phone" onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}/>
                <input className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800" placeholder="Address" onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}/>
                <button className="w-full bg-emerald-600 p-6 rounded-[2rem] font-black text-xl">SAVE CLIENT</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* EDIT MODAL (FOR JOBS/STATUS) */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-slate-900 w-full max-w-xl rounded-[3rem] p-10 border border-slate-800 shadow-2xl">
             <h3 className="text-2xl font-black mb-8">EDIT {editingItem.type.toUpperCase()}</h3>
             <div className="space-y-4">
               {editingItem.type === 'job' && (
                 <>
                  <input className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800" value={editingItem.data.title} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, title: e.target.value}})}/>
                  <select className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800" value={editingItem.data.status} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, status: e.target.value}})}>
                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <input type="number" className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800" value={editingItem.data.revenue} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, revenue: e.target.value}})}/>
                 </>
               )}
               <div className="flex gap-4 pt-4">
                 <button onClick={handleUpdate} className="flex-1 bg-blue-600 p-5 rounded-2xl font-black text-lg">UPDATE</button>
                 <button onClick={() => setEditingItem(null)} className="px-8 bg-slate-800 rounded-2xl font-bold">CANCEL</button>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}