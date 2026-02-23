import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "./supabase"; 
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { 
  Users, LayoutDashboard, Wrench, ListTodo, Plus, Edit2, Trash2, 
  X, Download, Clock, Phone, Mail, MapPin, CheckCircle2, Circle, FileText, Receipt,
  Sun, Moon // Added Theme Icons
} from "lucide-react";

const STATUS_COLORS = {
  'Quote': '#facc15', 'Work Order': '#3b82f6', 'Completed': '#22c55e', 'Unsuccessful': '#ef4444'
};
const STATUS_OPTIONS = ['Quote', 'Work Order', 'Completed', 'Unsuccessful'];

const NAV_ITEMS = [
  { id: "dashboard", icon: <LayoutDashboard size={24} />, label: "Dashboard" },
  { id: "jobs", icon: <Wrench size={24} />, label: "Jobs" },
  { id: "customers", icon: <Users size={24} />, label: "Clients" },
  { id: "tasks", icon: <ListTodo size={24} />, label: "Tasks" }
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(null);

  // THEME STATE: Checks local storage, defaults to dark
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") !== "light";
    }
    return true;
  });

  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [tasks, setTasks] = useState([]); 

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [newJob, setNewJob] = useState({ title: "", customer_id: "", revenue: "", notes: "" });
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "", address: "" });
  const [newTaskText, setNewTaskText] = useState("");

  const haptic = useCallback((ms = 10) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  }, []);

  // THEME EFFECT: Applies the 'dark' class to the HTML root
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const handleTabChange = (newTab) => {
    haptic(15);
    setTab(newTab);
  };

  useEffect(() => {
    setCurrentTime(new Date());
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
    haptic([10, 30, 10]); 
    const { error } = await supabase.from("Jobs").insert([{
      ...newJob, revenue: parseFloat(newJob.revenue || 0), status: 'Quote'
    }]);
    if (!error) {
      setShowAddModal(false);
      setNewJob({ title: "", customer_id: "", revenue: "", notes: "" }); 
      fetchData();
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    haptic([10, 30, 10]);
    const { error } = await supabase.from("Customers").insert([newCustomer]);
    if (!error) {
      setShowAddModal(false);
      setNewCustomer({ name: "", phone: "", email: "", address: "" }); 
      fetchData();
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    haptic([10, 30, 10]);
    const { error } = await supabase.from("Tasks").insert([{ task_text: newTaskText }]);
    if (!error) {
      setShowAddModal(false);
      setNewTaskText("");
      fetchData();
    }
  };

  const handleToggleTask = async (task) => {
    haptic(15); 
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: !t.is_completed } : t));
    const { error } = await supabase.from("Tasks").update({ is_completed: !task.is_completed }).eq("id", task.id);
    if (error) fetchData(); 
  };

  const handleDeleteTask = async (id) => {
    haptic(25);
    await supabase.from("Tasks").delete().eq("id", id);
    fetchData();
  };

  const handleUpdate = async () => {
    haptic([10, 30, 10]);
    const { type, id, data } = editingItem;
    let table = 'Jobs';
    if (type === 'customer') table = 'Customers';
    if (type === 'task') table = 'Tasks';

    const { Customers, ...cleanData } = data; 
    
    await supabase.from(table).update(cleanData).eq("id", id);
    setEditingItem(null);
    fetchData();
  };

  const generateDocument = async (job, type, e) => {
    if (e) e.stopPropagation(); 
    haptic(20);
    
    try {
      const doc = new jsPDF();
      let title = "";
      let headerColor = [0, 0, 0];
      let textColor = [255, 255, 255]; 

      if (type === 'quote') {
        title = "QUOTE";
        headerColor = [250, 204, 21]; 
        textColor = [0, 0, 0]; 
      } else if (type === 'invoice') {
        title = "TAX INVOICE";
        headerColor = [59, 130, 246]; 
      } else {
        title = "WORK ORDER";
        headerColor = [51, 65, 85]; 
      }

      const revenueFormatted = parseFloat(job.revenue || 0).toFixed(2);
      const dateFormatted = new Date().toLocaleDateString();

      doc.setFillColor(...headerColor);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(type === 'quote' ? 0 : 255, type === 'quote' ? 0 : 255, type === 'quote' ? 0 : 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("FLOWPRO SYSTEMS", 14, 25);
      
      doc.setFontSize(14);
      doc.text(title, 150, 25);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Date: ${dateFormatted}`, 150, 50);
      doc.setFont("helvetica", "bold");
      doc.text(`Job #: ${job.job_number}`, 150, 56);

      doc.setFont("helvetica", "bold");
      doc.text("Client Details:", 14, 50);
      doc.setFont("helvetica", "normal");
      
      const clientName = job.Customers?.name || "No Client Assigned";
      doc.text(clientName, 14, 56);
      if (job.Customers?.address) doc.text(job.Customers.address, 14, 62);
      if (job.Customers?.phone) doc.text(job.Customers.phone, 14, 68);

      let tableHead = [['Description', 'Amount']];
      let tableBody = [[job.title, `$${revenueFormatted}`]];
      
      if (type === 'job_card') {
         tableHead = [['Job Description', 'Current Status']];
         tableBody = [[job.title, job.status]];
      }

      doc.autoTable({
        startY: 80,
        head: tableHead,
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: headerColor, textColor: textColor },
        styles: { fontSize: 11, cellPadding: 6 }
      });

      let finalY = 120;
      if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
        finalY = doc.lastAutoTable.finalY + 15;
      }

      if (type !== 'job_card') {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Total Due: $${revenueFormatted}`, 150, finalY);
      }

      if (job.notes) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        let notesY = type === 'job_card' ? finalY : finalY + 15; 
        
        doc.text("Job Notes / Details:", 14, notesY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(doc.splitTextToSize(job.notes, 180), 14, notesY + 6);
      }

      const fileName = `${title.replace(/\s+/g, '_')}_${job.job_number}_${clientName.replace(/\s+/g, '_')}.pdf`;
      const rawBlob = doc.output('blob');
      const secureBlob = new Blob([rawBlob], { type: 'application/pdf' });
      
      const file = new File([secureBlob], fileName, { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: fileName,
            text: `Here is the ${title} for Job #${job.job_number}`,
          });
          return; 
        } catch (shareError) {
          console.log("Share sheet cancelled or failed, falling back...", shareError);
        }
      }

      const blobUrl = URL.createObjectURL(secureBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 250);
      
    } catch (err) {
      console.error("PDF Crash:", err);
      alert("Error generating PDF. Check the browser console.");
    }
  };

  const chartData = useMemo(() => STATUS_OPTIONS.map(s => ({ 
    name: s, value: jobs.filter(j => j.status === s).length 
  })), [jobs]);

  if (loading && jobs.length === 0) return <div className="h-screen bg-slate-50 dark:bg-black flex items-center justify-center text-blue-500 font-black animate-pulse text-2xl">FLOWPRO</div>;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 overflow-hidden font-sans pb-20 md:pb-0 transition-colors duration-300">
      
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-[#0a0a0a] border-r border-slate-200 dark:border-[#1f1f1f] p-8 z-10 transition-colors duration-300">
        <h1 className="text-3xl font-black text-blue-600 dark:text-blue-500 mb-12 italic tracking-tight">FLOWPRO</h1>
        <nav className="space-y-3">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => handleTabChange(item.id)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${tab === item.id ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 dark:shadow-blue-900/20" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1a1a1a]"}`}>
              {item.icon} <span className="font-bold">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-12 pb-32">
        <header className="flex justify-between items-center mb-6 md:mb-8 pt-2 md:pt-0">
          <div>
            <div className="flex items-center gap-2 text-blue-500 dark:text-blue-400 mb-1">
              <Clock size={14} />
              <p className="text-[10px] md:text-xs font-black uppercase tracking-widest">
                {currentTime ? currentTime.toLocaleTimeString() : "LOADING..."}
              </p>
            </div>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">{tab}</h2>
          </div>
          
          <div className="flex items-center gap-3">
            {/* THEME TOGGLE BUTTON */}
            <button 
              onClick={() => { haptic(15); setIsDarkMode(!isDarkMode); }} 
              className="p-3 md:p-4 bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#1f1f1f] rounded-full md:rounded-2xl shadow-sm text-slate-600 dark:text-slate-300 active:scale-90 transition-all"
            >
              {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>

            <button 
              onClick={() => { haptic(20); setShowAddModal(true); }} 
              className="bg-blue-600 p-3 md:p-4 text-white rounded-full md:rounded-2xl shadow-xl shadow-blue-500/20 dark:shadow-blue-900/30 transition-transform active:scale-90 fixed md:static bottom-[6.5rem] right-6 z-40 md:z-auto"
            >
              <Plus size={28} />
            </button>
          </div>
        </header>

        {tab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:to-indigo-900 p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] flex flex-col justify-center shadow-lg">
              <h3 className="text-blue-100 dark:text-blue-200 font-bold uppercase text-xs md:text-sm tracking-widest mb-2">Total Revenue</h3>
              <p className="text-5xl md:text-6xl text-white font-black">${jobs.reduce((a, b) => a + Number(b.revenue || 0), 0).toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-[#0a0a0a] p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-200 dark:border-[#1f1f1f] h-[250px] md:h-[300px] shadow-sm transition-colors duration-300">
              {currentTime && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                      {chartData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name]} />)}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#0a0a0a' : '#ffffff', 
                        borderRadius: '15px', 
                        borderColor: isDarkMode ? '#1f1f1f' : '#e2e8f0',
                        color: isDarkMode ? '#f8fafc' : '#0f172a'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {tab === "jobs" && (
          <div className="space-y-4">
            {jobs.map(j => (
              <div key={j.id} className="bg-white dark:bg-[#0a0a0a] p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 dark:border-[#1f1f1f] shadow-sm flex flex-col sm:flex-row justify-between items-start gap-4 transition-colors duration-300">
                <div className="w-full sm:w-auto flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg md:text-xl font-bold">#{j.job_number} - {j.title}</h4>
                    <span className="text-[10px] md:text-xs font-bold px-3 py-1 rounded-full inline-block whitespace-nowrap" style={{backgroundColor: `${STATUS_COLORS[j.status]}20`, color: STATUS_COLORS[j.status]}}>{j.status}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm flex items-center gap-2 mt-2"><Users size={14}/> {j.Customers?.name || "No Client"}</p>
                  
                  {j.notes && (
                    <div className="mt-3 pl-3 border-l-2 border-slate-200 dark:border-[#1f1f1f]">
                      <p className="text-slate-500 dark:text-slate-400 text-sm italic line-clamp-2">{j.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end border-t border-slate-100 dark:border-[#1f1f1f] sm:border-0 pt-3 sm:pt-0 mt-2 sm:mt-0 items-center">
                  
                  <button type="button" onClick={(e) => generateDocument(j, 'job_card', e)} className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-[#141414] rounded-xl text-slate-600 dark:text-slate-300 active:bg-slate-200 dark:active:bg-[#1f1f1f] transition-all active:scale-90" title="Download Job Card">
                    <Download size={18}/>
                  </button>

                  <button type="button" onClick={(e) => generateDocument(j, 'quote', e)} className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-[#141414] rounded-xl text-yellow-600 dark:text-yellow-500 active:bg-yellow-100 dark:active:bg-yellow-500/20 transition-all active:scale-90" title="Download Quote">
                    <FileText size={18}/> 
                  </button>

                  <button type="button" onClick={(e) => generateDocument(j, 'invoice', e)} className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-[#141414] rounded-xl text-blue-600 dark:text-blue-500 active:bg-blue-100 dark:active:bg-blue-600/20 transition-all active:scale-90" title="Download Invoice">
                    <Receipt size={18}/>
                  </button>

                  <button type="button" onClick={() => { haptic(10); setEditingItem({type: 'job', id: j.id, data: j})}} className="p-3 bg-slate-100 dark:bg-[#141414] rounded-xl text-slate-500 dark:text-slate-400 active:text-slate-900 dark:active:text-white transition-all active:scale-90 ml-2 border-l border-slate-200 dark:border-[#1f1f1f] pl-4">
                    <Edit2 size={18}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "customers" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {customers.map(c => (
              <div key={c.id} className="bg-white dark:bg-[#0a0a0a] p-6 rounded-[2rem] border border-slate-200 dark:border-[#1f1f1f] shadow-sm flex flex-col justify-between transition-colors duration-300">
                <div>
                  <h4 className="text-xl font-bold mb-4">{c.name}</h4>
                  <div className="space-y-3 text-slate-600 dark:text-slate-400 text-sm">
                    {c.phone && <p className="flex items-center gap-3"><Phone size={16} className="text-blue-500"/> <a href={`tel:${c.phone}`} className="active:text-blue-600 dark:active:text-white py-1">{c.phone}</a></p>}
                    {c.email && <p className="flex items-center gap-3"><Mail size={16} className="text-blue-500"/> <a href={`mailto:${c.email}`} className="active:text-blue-600 dark:active:text-white py-1">{c.email}</a></p>}
                    {c.address && <p className="flex items-center gap-3"><MapPin size={16} className="text-blue-500"/> {c.address}</p>}
                  </div>
                </div>
                <div className="flex justify-end border-t border-slate-100 dark:border-[#1f1f1f] pt-4 mt-6">
                  <button onClick={() => { haptic(10); setEditingItem({type: 'customer', id: c.id, data: c}) }} className="p-3 bg-slate-100 dark:bg-[#141414] rounded-xl text-slate-500 dark:text-slate-400 active:text-slate-900 dark:active:text-white transition-all active:scale-90"><Edit2 size={20}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "tasks" && (
          <div className="space-y-3">
            {tasks.map(t => (
              <div key={t.id} className={`bg-white dark:bg-[#0a0a0a] p-4 md:p-5 rounded-[1.5rem] border shadow-sm flex items-center justify-between transition-colors duration-300 ${t.is_completed ? 'border-green-500/30 dark:border-green-500/20 bg-green-50/30 dark:bg-[#0a0a0a]' : 'border-slate-200 dark:border-[#1f1f1f]'}`}>
                <div className="flex items-center gap-4 flex-1 cursor-pointer py-2" onClick={() => handleToggleTask(t)}>
                  <div className="active:scale-90 transition-transform">
                    {t.is_completed ? <CheckCircle2 className="text-green-500" size={26} /> : <Circle className="text-slate-400 dark:text-slate-500" size={26} />}
                  </div>
                  <span className={`text-base md:text-lg transition-all ${t.is_completed ? 'text-slate-400 dark:text-slate-600 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                    {t.task_text}
                  </span>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => { haptic(10); setEditingItem({type: 'task', id: t.id, data: t})}} className="p-3 bg-slate-100 dark:bg-[#141414] rounded-xl text-slate-500 dark:text-slate-400 active:text-slate-900 dark:active:text-white transition-all active:scale-90">
                    <Edit2 size={18}/>
                  </button>
                  <button onClick={() => handleDeleteTask(t.id)} className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-500 active:bg-red-500 active:text-white transition-all active:scale-90">
                    <Trash2 size={18}/>
                  </button>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <div className="text-center text-slate-500 mt-10 font-medium">No tasks yet. Tap + to add one.</div>}
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-t border-slate-200 dark:border-[#1f1f1f] px-6 py-4 flex justify-between items-center z-50 pb-safe transition-colors duration-300">
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => handleTabChange(item.id)} className={`flex flex-col items-center gap-1 p-2 transition-transform active:scale-90 ${tab === item.id ? "text-blue-600 dark:text-blue-500" : "text-slate-500 dark:text-slate-500"}`}>
            {item.icon}
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-6 transition-all">
          <div className="bg-white dark:bg-[#0a0a0a] w-full max-w-xl rounded-t-[2rem] md:rounded-[3rem] p-6 md:p-10 border-t border-slate-200 dark:border-[#1f1f1f] md:border shadow-[0_-20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_-20px_50px_rgba(0,0,0,0.5)] pb-12 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 md:mb-8 text-2xl md:text-3xl font-black uppercase text-slate-900 dark:text-white">
              NEW {tab === 'customers' ? 'CLIENT' : tab} 
              <button onClick={() => { haptic(10); setShowAddModal(false); }} className="p-3 bg-slate-100 dark:bg-[#1f1f1f] text-slate-600 dark:text-slate-300 rounded-full active:scale-90"><X size={20}/></button>
            </div>
            
            {tab === 'jobs' && (
              <form onSubmit={handleAddJob} className="space-y-4">
                <input required className="w-full bg-slate-50 dark:bg-[#141414] p-5 rounded-2xl border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-white text-base focus:border-blue-500 outline-none transition-colors" placeholder="Job Title" onChange={e => setNewJob({...newJob, title: e.target.value})}/>
                <select className="w-full bg-slate-50 dark:bg-[#141414] p-5 rounded-2xl border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-white text-base focus:border-blue-500 outline-none transition-colors" onChange={e => setNewJob({...newJob, customer_id: e.target.value})}>
                  <option value="">Select Client</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="number" className="w-full bg-slate-50 dark:bg-[#141414] p-5 rounded-2xl border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-white text-base focus:border-blue-500 outline-none transition-colors" placeholder="Revenue" onChange={e => setNewJob({...newJob, revenue: e.target.value})}/>
                <textarea 
                  className="w-full bg-slate-50 dark:bg-[#141414] p-5 rounded-2xl border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-white text-base min-h-[120px] resize-y focus:border-blue-500 outline-none transition-colors" 
                  placeholder="Job Notes (Supports S-Pen Handwriting)" 
                  value={newJob.notes}
                  onChange={e => setNewJob({...newJob, notes: e.target.value})}
                />
                <button className="w-full bg-blue-600 text-white p-5 rounded-[1.5rem] font-black text-lg active:scale-95 transition-transform mt-4">SAVE JOB</button>
              </form>
            )}

            {tab === 'customers' && (
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <input required className="w-full bg-slate-50 dark:bg-[#141414] p-5 rounded-2xl border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-white text-base focus:border-blue-500 outline-none" placeholder="Client Name" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}/>
                <input type="tel" className="w-full bg-slate-50 dark:bg-[#141414] p-5 rounded-2xl border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-white text-base focus:border-blue-500 outline-none" placeholder="Phone Number" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}/>
                <input type="email" className="w-full bg-slate-50 dark:bg-[#141414] p-5 rounded-2xl border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-white text-base focus:border-blue-500 outline-none" placeholder="Email Address" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}/>
                <input className="w-full bg-slate-50 dark:bg-[#141414] p-5 rounded-2xl border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-white text-base focus:border-blue-500 outline-none" placeholder="Physical Address" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}/>
                <button className="w-full bg-blue-600 text-white p-5 rounded-[1.5rem] font-black text-lg active:scale-95 transition-transform mt-4">SAVE CLIENT</button>
              </form>
            )}

            {tab === 'tasks' && (
              <form onSubmit={handleAddTask} className="space-y-4">
                <input required className="w-full bg-slate-50 dark:bg-[#141414] p-5 rounded-2xl border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-white text-base focus:border-blue-500 outline-none" placeholder="What needs to be done?" value={newTaskText} onChange={e => setNewTaskText(e.target.value)} />
                <button className="w-full bg-blue-600 text-white p-5 rounded-[1.5rem] font-black text-lg active:scale-95 transition-transform mt-4">SAVE TASK</button>
              </form>
            )}
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-6 transition-all">
          <div className="bg-white dark:bg-[#0a0a0a] w-full max-w-xl rounded-t-[2rem] md:rounded-[3rem] p-6 md:p-10 border-t border-slate-200 dark:border-[#1f1f1f] pb-12 max-h-[90vh] overflow-y-auto">
             <h3 className="text-xl md:text-2xl font-black mb-6 md:mb-8 uppercase text-slate-900 dark:text-white">EDIT {editingItem.type}</h3>
             
             {editingItem.type === 'job' && (
               <>
                 <select className="w-full bg-slate-50 dark:bg-[#141414] p-5 rounded-2xl border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-white mb-4 text-base outline-none focus:border-blue-500" value={editingItem.data.status} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, status: e.target.value}})}>
                   {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                 </select>
                 
                 <textarea 
                    className="w-full bg-slate-50 dark:bg-[#141414] p-5 rounded-2xl border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-white mb-6 text-base min-h-[140px] resize-y outline-none focus:border-blue-500" 
                    placeholder="Job Notes" 
                    value={editingItem.data.notes || ""}
                    onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, notes: e.target.value}})}
                 />
               </>
             )}

             {editingItem.type === 'customer' && (
               <div className="space-y-4 mb-6">
                 <input className="w-full bg-slate-50 dark:bg-[#141414] p-5 rounded-2xl border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-white text-base outline-none focus:border-blue-500" value={editingItem.data.name} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, name: e.target.value}})} placeholder="Client Name" />
                 <input type="tel" className="w-full bg-slate-50 dark:bg-[#141414] p-5 rounded-2xl border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-white text-base outline-none focus:border-blue-500" value={editingItem.data.phone || ''} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, phone: e.target.value}})} placeholder="Phone Number" />
                 <input type="email" className="w-full bg-slate-50 dark:bg-[#141414] p-5 rounded-2xl border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-white text-base outline-none focus:border-blue-500" value={editingItem.data.email || ''} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, email: e.target.value}})} placeholder="Email Address" />
                 <input className="w-full bg-slate-50 dark:bg-[#141414] p-5 rounded-2xl border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-white text-base outline-none focus:border-blue-500" value={editingItem.data.address || ''} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, address: e.target.value}})} placeholder="Physical Address" />
               </div>
             )}

             {editingItem.type === 'task' && (
               <input required className="w-full bg-slate-50 dark:bg-[#141414] p-5 rounded-2xl border border-slate-200 dark:border-[#1f1f1f] text-slate-900 dark:text-white mb-6 text-base outline-none focus:border-blue-500" value={editingItem.data.task_text} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, task_text: e.target.value}})} placeholder="Task description"/>
             )}

             <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={handleUpdate} className="w-full sm:flex-1 bg-blue-600 text-white p-5 rounded-[1.5rem] font-black text-lg active:scale-95 transition-transform">UPDATE</button>
              <button onClick={() => { haptic(10); setEditingItem(null); }} className="w-full sm:w-auto px-8 p-5 bg-slate-200 dark:bg-[#1f1f1f] text-slate-800 dark:text-white rounded-[1.5rem] font-bold text-lg active:scale-95 transition-transform">CANCEL</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}