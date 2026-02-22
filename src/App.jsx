import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseclient";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { 
  Users, LayoutDashboard, Wrench, ListTodo, Settings as SettingsIcon,
  Plus, Edit2, Trash2, CheckCircle2, Circle, X, DollarSign, Phone, 
  MapPin, Save, FileText, Download, Share2, Info
} from "lucide-react";

const STATUS_COLORS = {
  'Quote': '#facc15', 'Work Order': '#3b82f6', 'Completed': '#22c55e', 'Unsuccessful': '#ef4444'
};
const STATUS_OPTIONS = ['Quote', 'Work Order', 'Completed', 'Unsuccessful'];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [loading, setTotalLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Data State
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [nextJobNumber, setNextJobNumber] = useState(1000);

  // Form & Edit States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", address: "", email: "" });
  const [newJob, setNewJob] = useState({ title: "", customer_id: "", revenue: "", description: "" });
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchData();
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      const [cRes, jRes, tRes, sRes] = await Promise.all([
        supabase.from("Customers").select("*").order("name"),
        supabase.from("Jobs").select("*, Customers(*)").order("job_number", { ascending: false }),
        supabase.from("Tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("Settings").select("*").eq("id", 1).single()
      ]);
      if (cRes.data) setCustomers(cRes.data);
      if (jRes.data) setJobs(jRes.data);
      if (tRes.data) setTasks(tRes.data);
      if (sRes.data) setNextJobNumber(sRes.data.next_job_number);
    } catch (e) { console.error(e); } finally { setTotalLoading(false); }
  };

  // --- PDF GENERATOR ---
  const generatePDF = (job) => {
    const doc = new jsPDF();
    const primaryColor = [59, 130, 246]; // Blue-600

    // Header & Brand
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("FLOWPRO SYSTEMS", 14, 25);
    
    doc.setFontSize(10);
    doc.text("OFFICIAL SERVICE QUOTE / INVOICE", 14, 32);

    // Job Meta
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`JOB NUMBER: #${job.job_number}`, 14, 55);
    doc.text(`DATE: ${new Date().toLocaleDateString()}`, 14, 62);

    // Client Info Box
    doc.setDrawColor(230, 230, 230);
    doc.line(14, 70, 196, 70);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO:", 14, 80);
    doc.setFont("helvetica", "normal");
    doc.text(`${job.Customers?.name || 'Walk-in Client'}`, 14, 87);
    doc.text(`${job.Customers?.address || 'No Address Provided'}`, 14, 94);
    doc.text(`${job.Customers?.phone || ''}`, 14, 101);

    // Description Table
    doc.autoTable({
      startY: 115,
      head: [['Service Description', 'Status', 'Amount']],
      body: [[
        { content: `${job.title}\n\n${job.description || 'No additional notes provided.'}`, styles: { cellPadding: 5 } },
        job.status,
        `$${Number(job.revenue).toLocaleString()}`
      ]],
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } }
    });

    // Footer
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.text(`TOTAL DUE: $${Number(job.revenue).toLocaleString()}`, 196, finalY, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your business. Please contact us for any payment inquiries.", 105, 285, { align: 'center' });

    doc.save(`FlowPro_Job_${job.job_number}.pdf`);
  };

  // --- CRUD HELPERS ---
  const handleDelete = async (table, id) => {
    if (!window.confirm("Permanent Delete?")) return;
    await supabase.from(table).delete().eq("id", id);
    fetchData();
  };

  const handleUpdate = async () => {
    const { type, id, data } = editingItem;
    const table = type === 'job' ? 'Jobs' : 'Customers';
    await supabase.from(table).update(data).eq("id", id);
    setEditingItem(null);
    fetchData();
  };

  const addJob = async (e) => {
    e.preventDefault();
    const payload = { ...newJob, status: 'Quote', job_number: nextJobNumber, revenue: parseFloat(newJob.revenue || 0) };
    const { error } = await supabase.from("Jobs").insert([payload]);
    if (!error) {
      await supabase.from("Settings").update({ next_job_number: nextJobNumber + 1 }).eq("id", 1);
      setNewJob({ title: "", customer_id: "", revenue: "", description: "" });
      setShowAddModal(false);
      fetchData();
    }
  };

  const chartData = useMemo(() => STATUS_OPTIONS.map(s => ({ name: s, value: jobs.filter(j => j.status === s).length })), [jobs]);

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black text-2xl animate-pulse">FLOWPRO</div>;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#020617] text-slate-100 font-sans overflow-hidden">
      
      {/* DESKTOP NAV */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 border-r border-slate-800 p-8">
        <h1 className="text-3xl font-black text-blue-500 mb-12 tracking-tighter italic">FLOWPRO</h1>
        <nav className="space-y-3">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${tab === item.id ? "bg-blue-600 shadow-lg shadow-blue-900/40" : "text-slate-400 hover:bg-slate-800"}`}>
              {item.icon} <span className="font-bold">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-12 pb-32">
        <header className="flex justify-between items-center mb-8">
          <div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{currentTime.toLocaleTimeString()}</p>
            <h2 className="text-4xl font-black uppercase tracking-tighter">{tab}</h2>
          </div>
          <button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-500 p-4 rounded-3xl shadow-xl transition-all active:scale-90">
            <Plus size={28}/>
          </button>
        </header>

        {tab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 flex flex-col items-center">
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} innerRadius={80} outerRadius={105} paddingAngle={8} dataKey="value" stroke="none">
                      {chartData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name]} />)}
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: '#0f172a', borderRadius: '20px', border: 'none'}}/>
                    <Legend verticalAlign="bottom" iconType="circle"/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-4xl font-black mt-6 tracking-tighter">{jobs.length} Active Jobs</p>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-900 p-10 rounded-[3rem] flex flex-col justify-center relative overflow-hidden shadow-2xl">
                <FileText className="absolute -right-10 -top-10 text-white/10" size={240}/>
                <h3 className="text-blue-100 font-bold uppercase tracking-widest text-sm mb-2">Portfolio Value</h3>
                <p className="text-6xl font-black text-white tracking-tighter">${jobs.reduce((a, b) => a + Number(b.revenue || 0), 0).toLocaleString()}</p>
                <div className="mt-8 flex gap-4">
                   <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex-1">
                      <p className="text-[10px] font-bold text-blue-200">CLIENTS</p>
                      <p className="text-2xl font-black">{customers.length}</p>
                   </div>
                   <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex-1">
                      <p className="text-[10px] font-bold text-blue-200">COMPLETED</p>
                      <p className="text-2xl font-black">{jobs.filter(j => j.status === 'Completed').length}</p>
                   </div>
                </div>
            </div>
          </div>
        )}

        {tab === "jobs" && (
          <div className="space-y-4">
            {jobs.map(j => (
              <div key={j.id} className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 hover:border-blue-500/50 transition-all group">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="bg-slate-800 text-slate-400 text-[10px] font-black px-2 py-1 rounded-md uppercase">#{j.job_number}</span>
                      <h4 className="text-xl font-black tracking-tight">{j.title}</h4>
                    </div>
                    <p className="text-slate-400 text-sm flex items-center gap-2"><Users size={14}/> {j.Customers?.name}</p>
                    <div className="flex gap-2 mt-3">
                       <span className="text-[10px] font-black px-3 py-1 rounded-full" style={{backgroundColor: `${STATUS_COLORS[j.status]}20`, color: STATUS_COLORS[j.status]}}>
                         {j.status.toUpperCase()}
                       </span>
                    </div>
                  </div>
                  <div className="flex flex-col md:items-end gap-2">
                    <p className="text-3xl font-black text-emerald-400">${Number(j.revenue).toLocaleString()}</p>
                    <div className="flex gap-2">
                      <button onClick={() => generatePDF(j)} className="p-3 bg-slate-800 rounded-xl text-blue-400 hover:bg-blue-600 hover:text-white transition-all shadow-lg"><Download size={20}/></button>
                      <button onClick={() => setEditingItem({type: 'job', id: j.id, data: j})} className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-white"><Edit2 size={20}/></button>
                      <button onClick={() => handleDelete('Jobs', j.id)} className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-red-500"><Trash2 size={20}/></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- CUSTOMERS & TASKS (Simplified for brevity, following same style) --- */}
        {tab === "customers" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {customers.map(c => (
               <div key={c.id} className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 relative group">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-xl mb-4">{c.name[0]}</div>
                  <h4 className="text-xl font-black">{c.name}</h4>
                  <p className="text-slate-500 text-sm mb-4">{c.address || 'No Address'}</p>
                  <div className="flex gap-4 border-t border-slate-800 pt-4">
                     <a href={`tel:${c.phone}`} className="text-blue-500 hover:underline flex items-center gap-2 text-sm font-bold"><Phone size={16}/> Call</a>
                     <button onClick={() => setEditingItem({type: 'customer', id: c.id, data: c})} className="text-slate-500 ml-auto"><Edit2 size={16}/></button>
                  </div>
               </div>
             ))}
          </div>
        )}

        {/* MODAL SYSTEM (For Adding) */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-slate-900 w-full max-w-xl rounded-[3rem] p-10 border border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-3xl font-black italic underline decoration-blue-500">NEW {tab === 'jobs' ? 'PROJECT' : 'CLIENT'}</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-3 bg-slate-800 rounded-full"><X/></button>
               </div>

               {tab === 'jobs' ? (
                 <form onSubmit={addJob} className="space-y-4">
                    <input required className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 text-lg outline-none focus:border-blue-500" placeholder="Project Name" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})}/>
                    <select required className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 text-lg outline-none focus:border-blue-500 appearance-none" value={newJob.customer_id} onChange={e => setNewJob({...newJob, customer_id: e.target.value})}>
                       <option value="">Select Client</option>
                       {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="relative">
                       <DollarSign className="absolute left-5 top-5 text-slate-500"/>
                       <input type="number" className="w-full bg-slate-950 p-5 pl-12 rounded-2xl border border-slate-800 text-lg" placeholder="Price" value={newJob.revenue} onChange={e => setNewJob({...newJob, revenue: e.target.value})}/>
                    </div>
                    <textarea className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 text-lg h-32" placeholder="Job Description (Shows on PDF Quote)" value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})}></textarea>
                    <button className="w-full bg-blue-600 p-6 rounded-[2rem] font-black text-xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40">BOOK JOB #{nextJobNumber}</button>
                 </form>
               ) : (
                 <form onSubmit={async (e) => {
                    e.preventDefault();
                    await supabase.from("Customers").insert([newCustomer]);
                    setShowAddModal(false);
                    fetchData();
                 }} className="space-y-4">
                    <input required className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 text-lg" placeholder="Client Name" onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}/>
                    <input className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 text-lg" placeholder="Phone" onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}/>
                    <input className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 text-lg" placeholder="Address" onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}/>
                    <button className="w-full bg-emerald-600 p-6 rounded-[2rem] font-black text-xl">SAVE NEW CLIENT</button>
                 </form>
               )}
            </div>
          </div>
        )}

        {/* EDIT MODAL (Handles Status & Description) */}
        {editingItem && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-slate-900 w-full max-w-xl rounded-[3rem] p-10 border border-slate-800 shadow-2xl">
              <h3 className="text-2xl font-black mb-8">EDIT {editingItem.type.toUpperCase()}</h3>
              <div className="space-y-4">
                {editingItem.type === 'job' && (
                  <>
                    <input className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 text-lg" value={editingItem.data.title} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, title: e.target.value}})}/>
                    <select className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 text-lg" value={editingItem.data.status} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, status: e.target.value}})}>
                      {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <textarea className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 text-lg h-32" value={editingItem.data.description} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, description: e.target.value}})}></textarea>
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
      </main>

      {/* MOBILE NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-950/80 backdrop-blur-2xl border-t border-slate-800 flex justify-around p-6 z-50">
        {menuItems.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`flex flex-col items-center gap-1 ${tab === item.id ? "text-blue-500 scale-110" : "text-slate-600 opacity-50"} transition-all`}>
            {item.icon} <span className="text-[8px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

const menuItems = [
  { id: "dashboard", icon: <LayoutDashboard size={24}/>, label: "Home" },
  { id: "jobs", icon: <Wrench size={24}/>, label: "Jobs" },
  { id: "customers", icon: <Users size={24}/>, label: "Clients" },
  { id: "tasks", icon: <ListTodo size={24}/>, label: "Tasks" }
];