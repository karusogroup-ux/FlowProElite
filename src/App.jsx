import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseclient";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { 
  Users, LayoutDashboard, Wrench, ListTodo, Plus, Edit2, Trash2, 
  X, DollarSign, Phone, Download, CheckCircle2, Circle, Clock
} from "lucide-react";

const STATUS_COLORS = {
  'Quote': '#facc15', 'Work Order': '#3b82f6', 'Completed': '#22c55e', 'Unsuccessful': '#ef4444'
};
const STATUS_OPTIONS = ['Quote', 'Work Order', 'Completed', 'Unsuccessful'];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", address: "" });
  const [newJob, setNewJob] = useState({ title: "", customer_id: "", revenue: "" });
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
      setCustomers(cRes.data || []);
      setJobs(jRes.data || []);
      setTasks(tRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleAddJob = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("Jobs").insert([{
      ...newJob, revenue: parseFloat(newJob.revenue || 0), status: 'Quote'
    }]);
    if (!error) {
      setShowAddModal(false);
      fetchData();
    }
  };

  const handleUpdate = async () => {
    const { type, id, data } = editingItem;
    const table = type === 'job' ? 'Jobs' : 'Customers';
    const { Customers, ...cleanData } = data; // REMOVES NESTED OBJECT TO PREVENT SQL ERROR
    await supabase.from(table).update(cleanData).eq("id", id);
    setEditingItem(null);
    fetchData();
  };

  const generatePDF = (job) => {
    const doc = new jsPDF();
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("FLOWPRO SYSTEMS", 14, 25);
    doc.setTextColor(0, 0, 0);
    doc.autoTable({
      startY: 50,
      head: [['Job #', 'Description', 'Status', 'Total']],
      body: [[job.job_number, job.title, job.status, `$${job.revenue}`]],
    });
    doc.save(`Job_${job.job_number}.pdf`);
  };

  const chartData = useMemo(() => STATUS_OPTIONS.map(s => ({ 
    name: s, value: jobs.filter(j => j.status === s).length 
  })), [jobs]);

  if (loading && jobs.length === 0) return <div className="h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black animate-pulse text-2xl">FLOWPRO</div>;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#020617] text-slate-100 overflow-hidden font-sans">
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 border-r border-slate-800 p-8">
        <h1 className="text-3xl font-black text-blue-500 mb-12 italic">FLOWPRO</h1>
        <nav className="space-y-3">
          {[{ id: "dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
            { id: "jobs", icon: <Wrench />, label: "Jobs" },
            { id: "customers", icon: <Users />, label: "Clients" },
            { id: "tasks", icon: <ListTodo />, label: "Tasks" }
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`w-full flex items-center gap-4 p-4 rounded-2xl ${tab === item.id ? "bg-blue-600 shadow-lg" : "text-slate-400 hover:bg-slate-800"}`}>
              {item.icon} <span className="font-bold">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-12 pb-32">
        <header className="flex justify-between items-center mb-8">
          <div>
            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">{currentTime.toLocaleTimeString()}</p>
            <h2 className="text-4xl font-black uppercase tracking-tighter">{tab}</h2>
          </div>
          <button onClick={() => setShowAddModal(true)} className="bg-blue-600 p-4 rounded-2xl shadow-xl"><Plus/></button>
        </header>

        {tab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} innerRadius={60} outerRadius={80} dataKey="value">
                    {chartData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-10 rounded-[3rem] flex flex-col justify-center">
              <h3 className="text-blue-100 font-bold uppercase text-xs">Total Revenue</h3>
              <p className="text-6xl font-black">${jobs.reduce((a, b) => a + Number(b.revenue || 0), 0).toLocaleString()}</p>
            </div>
          </div>
        )}

        {tab === "jobs" && (
          <div className="space-y-4">
            {jobs.map(j => (
              <div key={j.id} className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex justify-between items-center">
                <div>
                  <h4 className="text-xl font-bold">#{j.job_number} - {j.title}</h4>
                  <p className="text-slate-400 text-sm">{j.Customers?.name || "No Client"}</p>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full mt-2 inline-block" style={{backgroundColor: `${STATUS_COLORS[j.status]}20`, color: STATUS_COLORS[j.status]}}>{j.status}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => generatePDF(j)} className="p-2 bg-slate-800 rounded-lg text-blue-400"><Download size={20}/></button>
                  <button onClick={() => setEditingItem({type: 'job', id: j.id, data: j})} className="p-2 bg-slate-800 rounded-lg text-slate-400"><Edit2 size={20}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODALS */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-slate-900 w-full max-w-xl rounded-[3rem] p-10 border border-slate-800 shadow-2xl">
            <div className="flex justify-between items-center mb-8 text-3xl font-black">NEW {tab.toUpperCase()} <button onClick={() => setShowAddModal(false)}><X/></button></div>
            {tab === 'jobs' && (
              <form onSubmit={handleAddJob} className="space-y-4">
                <input required className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800" placeholder="Job Title" onChange={e => setNewJob({...newJob, title: e.target.value})}/>
                <select className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800" onChange={e => setNewJob({...newJob, customer_id: e.target.value})}>
                  <option value="">Select Client</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="number" className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800" placeholder="Revenue" onChange={e => setNewJob({...newJob, revenue: e.target.value})}/>
                <button className="w-full bg-blue-600 p-6 rounded-[2rem] font-black text-xl">SAVE JOB</button>
              </form>
            )}
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-slate-900 w-full max-w-xl rounded-[3rem] p-10 border border-slate-800 shadow-2xl">
             <h3 className="text-2xl font-black mb-8">EDIT {editingItem.type.toUpperCase()}</h3>
             <select className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 mb-4" value={editingItem.data.status} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, status: e.target.value}})}>
               {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
             </select>
             <button onClick={handleUpdate} className="w-full bg-blue-600 p-5 rounded-2xl font-black">UPDATE</button>
          </div>
        </div>
      )}
    </div>
  );
}