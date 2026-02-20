document.addEventListener("DOMContentLoaded", () => {

  // ==== Supabase setup ====
  const SUPABASE_URL = "https://lsqdwwgubteuqpcggczw.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzcWR3d2d1YnRldXFwY2dnY3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODM4NDEsImV4cCI6MjA4NzE1OTg0MX0.nmSSU4mu-D9cua9LNRWFKnWCk0-hYjS2RguzEi3lVaA";
  const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // ==== UI elements ====
  const tabs = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modal-body");
  const modalClose = document.getElementById("modal-close");

  // ==== Tab switching ====
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      contents.forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });
  tabs[0].click(); // default tab

  // ==== Modal control ====
  modal.classList.add("hidden");
  modalClose.addEventListener("click", () => modal.classList.add("hidden"));

  // ==== Customers ====
  const customerList = document.getElementById("customer-list");
  document.getElementById("add-customer-btn").addEventListener("click", async () => {
    const name = prompt("Customer name:");
    if(!name) return;
    const { data, error } = await supabase.from("customers").insert([{ name }]);
    if(error) alert(error.message);
    else loadCustomers();
  });

  async function loadCustomers(){
    const { data, error } = await supabase.from("customers").select("*");
    if(error) return alert(error.message);
    customerList.innerHTML = data.map(c => `<li>${c.id}: ${c.name}</li>`).join("");
  }
  loadCustomers();

  // ==== Jobs ====
  const jobList = document.getElementById("job-list");
  document.getElementById("add-job-btn").addEventListener("click", async () => {
    const title = prompt("Job title:");
    const customer_id = prompt("Customer ID:");
    if(!title || !customer_id) return;
    const { data, error } = await supabase.from("jobs").insert([{ title, customer_id, status: "pending" }]);
    if(error) alert(error.message);
    else loadJobs();
  });

  async function loadJobs(){
    const { data, error } = await supabase.from("jobs").select("*");
    if(error) return alert(error.message);
    jobList.innerHTML = data.map(j => `<li>${j.id}: ${j.title} (Customer: ${j.customer_id}) - ${j.status}</li>`).join("");
  }
  loadJobs();

  // ==== Calendar ====
  const calendarGrid = document.getElementById("calendar-grid");
  function renderCalendar(){
    calendarGrid.innerHTML = "";
    const days = 30;
    for(let i=1;i<=days;i++){
      const dayDiv = document.createElement("div");
      dayDiv.textContent = i;
      dayDiv.className = "calendar-day";
      calendarGrid.appendChild(dayDiv);
    }
  }
  renderCalendar();

  // ==== Dark/Light toggle ====
  document.getElementById("theme-toggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    document.body.classList.toggle("light");
  });

}); // DOMContentLoaded end
