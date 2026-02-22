import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseclient";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { 
  Users, LayoutDashboard, Wrench, ListTodo, Settings as SettingsIcon,
  Plus, Edit2, Trash2, CheckCircle2, Circle, X, DollarSign, Phone, 
  MapPin, Save, FileText, Download, Share2, Info, Loader2
} from "lucide-react";

const STATUS_COLORS = {
  'Quote': '#facc15', 'Work Order': '#3b82f6', 'Completed': '#22c55e', 'Unsuccessful': '#ef4444'
};
const STATUS_OPTIONS = ['Quote', 'Work Order', 'Completed', 'Unsuccessful'];

const MENU_ITEMS = [
  { id: "dashboard", icon: <LayoutDashboard size={20}/>, label: "Dashboard" },
  { id: "jobs", icon: <Wrench size={20}/>, label: "Jobs" },
  { id: "customers", icon: <Users size={20}/>, label: "Clients" },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Form States
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", address: "", email: "" });
  const [newJob, setNewJob] = useState({ title: "", customer_id: "", revenue: "", description: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: cData } = await supabase.from("Customers").select("*").order("name");
    const { data: jData } = await supabase.from("Jobs").select("*, Customers(*)").order("job_number", { ascending: false });
    
    if (cData) setCustomers(cData);
    if (jData) setJobs(jData);
    setLoading(false);
  };

  // --- BUG FIX: STRIP NESTED OBJECTS BEFORE UPDATE ---
  const handleUpdate = async () => {
    try {
      const { type, id, data } = editingItem;
      const table = type === 'job' ? 'Jobs' : 'Customers';
      
      // We remove the joined 'Customers' object so Supabase doesn't get confused
      const { Customers, ...cleanData } = data; 

      const { error } = await supabase.from(table).update(cleanData).eq("id", id);
      if (error) throw error;
      
      setEditingItem(null);
      fetchData();
    } catch (err) {
      alert("Update failed: " + err.message);
    }
  };

  const addJob = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("Jobs").insert([{
      ...newJob,
      revenue: parseFloat(newJob.revenue || 0),
      status: 'Quote'
    }]);
    
    if (!error) {
      setNewJob({ title: "", customer_id: "", revenue: "", description: "" });
      setShowAddModal(false);
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
    doc.text(`Job #${job.job_number}`, 14, 55);
    doc.autoTable({
      startY: 70,
      head: [['Description', 'Status', 'Total']],
      body: [[job.title, job.status, `$${job.revenue}`]],
    });
    doc.save(`Job_${job.job_number}.pdf`);
  };

  const chartData = useMemo(() => 
    STATUS_OPTIONS.map(s => ({ name: s, value: jobs.filter(j => j.status === s).length })), 
  [jobs]);

  if (loading && jobs.length === 0) return (
    <div className="h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-bold animate-pulse">
      <Loader2 className="animate-spin mr-2" /> LOADING FLOWPRO...
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#020617] text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-6">
        <h1 className="text-2xl font-black text-blue-500 mb-10 italic">FLOWPRO</h1>
        <nav className="space-y-2">
          {MENU_ITEMS.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${tab === item.id ? "bg-blue-600 shadow-lg" : "text-slate-400 hover:bg-slate-800"}`}>
              {item.icon} <span className="font-semibold">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-10 pb-24">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-bold capitalize">{tab}</h2>
          <button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-500 p-3 rounded-xl shadow-lg transition-transform active:scale-95">
            <Plus size={24}/>
          </button>
        </div>

        {tab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
              <h3 className="text-slate-400 text-sm font-bold mb-4 uppercase">Job Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {chartData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl flex flex-col justify-center shadow-xl">
              <p className="text-blue-100 font-medium">Total Revenue Pipeline</p>
              <h4 className="text-5xl font-black mt-2">${jobs.reduce((a, b) => a + Number(b.revenue || 0), 0).toLocaleString()}</h4>
              <div className="flex gap-4 mt-6 text-sm">
                 <div className="bg-white/10 p-3 rounded-xl flex-1">
                   <p className="opacity-70">Active Jobs</p>
                   <p className="text-xl font-bold">{jobs.length}</p>
                 </div>
                 <div className="bg-white/10 p-3 rounded-xl flex-1">
                   <p className="opacity-70">Customers</p>
                   <p className="text-xl font-bold">{customers.length}</p>
                 </div>
              </div>
            </div>
          </div>
        )}

        {tab === "jobs" && (
          <div className="space-y-3">
            {jobs.map(j => (
              <div key={j.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex justify-between items-center group hover:border-blue-500/50 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">#{j.job_number}</span>
                    <h4 className="font-bold text-lg">{j.title}</h4>
                  </div>
                  <p className="text-slate-400 text-sm mb-2">{j.Customers?.name || 'Walk-in'}</p>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase" style={{backgroundColor: `${STATUS_COLORS[j.status]}20`, color: STATUS_COLORS[j.status]}}>
                    {j.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-emerald-400 mb-2">${Number(j.revenue).toLocaleString()}</p>
                  <div className="flex gap-2">
                    <button onClick={() => generatePDF(j)} className="p-2 bg-slate-800 rounded-lg text-blue-400 hover:bg-blue-600 hover:text-white transition-all"><Download size={18}/></button>
                    <button onClick={() => setEditingItem({type: 'job', id: j.id, data: j})} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white"><Edit2 size={18}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal (Universal) */}
        {editingItem && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 w-full max-w-md rounded-3xl p-8 border border-slate-800 shadow-2xl">
              <h3 className="text-xl font-bold mb-6">Edit {editingItem.type === 'job' ? 'Job Details' : 'Customer'}</h3>
              <div className="space-y-4">
                {editingItem.type === 'job' && (
                  <>
                    <input className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800" value={editingItem.data.title} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, title: e.target.value}})}/>
                    <select className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800" value={editingItem.data.status} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, status: e.target.value}})}>
                      {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <input type="number" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800" value={editingItem.data.revenue} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, revenue: e.target.value}})}/>
                  </>
                )}
                <div className="flex gap-3 mt-6">
                  <button onClick={handleUpdate} className="flex-1 bg-blue-600 p-4 rounded-xl font-bold">Save Changes</button>
                  <button onClick={() => setEditingItem(null)} className="px-6 bg-slate-800 rounded-xl">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 w-full bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 flex justify-around p-4">
        {MENU_ITEMS.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`p-2 ${tab === item.id ? "text-blue-500" : "text-slate-500"}`}>
            {item.icon}
          </button>
        ))}
      </nav>
    </div>
  );
}