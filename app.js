// Dark/Light mode
function toggleTheme(){ document.body.classList.toggle('dark'); }

// Initialize Flatpickr
flatpickr("#jobDate",{enableTime:false,dateFormat:"Y-m-d"});

// Supabase setup (replace with your credentials)
const SUPABASE_URL = "https://lsqdwwgubteuqpcggczw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzcWR3d2d1YnRldXFwY2dnY3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODM4NDEsImV4cCI6MjA4NzE1OTg0MX0.nmSSU4mu-D9cua9LNRWFKnWCk0-hYjS2RguzEi3lVaA";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let customers = [];
let jobs = [];

// Load customers into dropdown
async function loadCustomers(){
  let { data, error } = await supabase.from('customers').select('*');
  if(data) customers = data;
  const select = document.getElementById('jobCustomer');
  select.innerHTML = '<option value="">Select Customer</option>';
  customers.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.name;
    select.appendChild(opt);
  });
}

// Add customer
async function addCustomer(){
  const name=document.getElementById('customerName').value;
  const email=document.getElementById('customerEmail').value;
  const phone=document.getElementById('customerPhone').value;
  if(!name) return alert('Name required');
  await supabase.from('customers').insert([{name,email,phone}]);
  document.getElementById('customerName').value='';
  document.getElementById('customerEmail').value='';
  document.getElementById('customerPhone').value='';
  loadCustomers();
}

// Add job
async function addJob(){
  const customer_id=document.getElementById('jobCustomer').value;
  const title=document.getElementById('jobTitle').value;
  const date=document.getElementById('jobDate').value;
  if(!customer_id||!title||!date) return alert('All fields required');
  await supabase.from('jobs').insert([{customer_id,title,date,status:'Pending'}]);
  document.getElementById('jobTitle').value='';
  document.getElementById('jobDate').value='';
  loadJobs();
}

// Calendar setup
let calendarEl = document.getElementById('calendar');
let calendar = new FullCalendar.Calendar(calendarEl, {
  initialView:'dayGridMonth',
  editable:true,
  eventClick: info => alert(info.event.title + ' - ' + info.event.startStr)
});
calendar.render();

// Load jobs
async function loadJobs(){
  let { data, error } = await supabase.from('jobs').select('*');
  if(!data) return;
  jobs = data;
  calendar.removeAllEvents();
  jobs.forEach(j=>{
    const customer = customers.find(c=>c.id===j.customer_id);
    calendar.addEvent({
      title: (customer ? customer.name + ': ' : '') + j.title,
      start: j.date
    });
  });
}

// Initial load
loadCustomers().then(loadJobs);
