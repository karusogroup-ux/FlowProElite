import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient'; // Adjust path to your client

export default function HomeTasks() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  // Fetch only Home Tasks
  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('home_tasks')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) console.error('Error fetching:', error);
    else setTasks(data);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const addTask = async () => {
    const { error } = await supabase
      .from('home_tasks')
      .insert([{ task_name: newTask }]);
    
    if (!error) {
      setNewTask('');
      fetchTasks();
    }
  };

  // ... Add your delete/update logic here similarly ...

  return (
    <div className="p-4">
      <h1>Home Tasks</h1>
      <input 
        value={newTask} 
        onChange={(e) => setNewTask(e.target.value)} 
        placeholder="New home task..."
        className="border p-2 mr-2"
      />
      <button onClick={addTask} className="bg-blue-500 text-white p-2 rounded">Add</button>
      
      <ul className="mt-4">
        {tasks.map(task => (
          <li key={task.id} className="border-b p-2">
            {task.task_name}
             {/* Add Delete/Edit buttons here */}
          </li>
        ))}
      </ul>
    </div>
  );
}