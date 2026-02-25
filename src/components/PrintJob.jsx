import React from "react";

export const PrintJob = React.forwardRef(({ job }, ref) => {
  if (!job) return null;

  return (
    <div ref={ref} className="p-10 text-black bg-white font-sans print:block hidden">
      <div className="flex justify-between border-b-4 border-black pb-4 mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase italic">Elite Report</h1>
          <p className="text-sm font-bold text-zinc-500">#{job.job_number}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold">{new Date().toLocaleDateString()}</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10 mb-10">
        <div>
          <h3 className="text-[10px] font-black uppercase text-zinc-400 mb-2">Customer</h3>
          <p className="font-bold text-lg">{job.Customers?.name}</p>
          <p className="text-sm">{job.Customers?.address}</p>
          <p className="text-sm">{job.Customers?.phone}</p>
        </div>
        <div>
          <h3 className="text-[10px] font-black uppercase text-zinc-400 mb-2">Project</h3>
          <p className="font-bold text-lg">{job.title}</p>
          <p className="text-sm">Status: {job.status}</p>
        </div>
      </div>

      <table className="w-full mb-10">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2 text-[10px] uppercase">Description</th>
            <th className="py-2 text-[10px] uppercase text-right">Qty</th>
            <th className="py-2 text-[10px] uppercase text-right">Price</th>
            <th className="py-2 text-[10px] uppercase text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {job.LineItems?.map((item, i) => (
            <tr key={i} className="border-b border-zinc-100">
              <td className="py-3 font-bold">{item.description}</td>
              <td className="py-3 text-right">{item.quantity}</td>
              <td className="py-3 text-right">${item.unit_price}</td>
              <td className="py-3 text-right font-bold">${(item.quantity * item.unit_price).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between border-t border-black pt-2">
            <span className="font-black uppercase text-xs">Total Revenue</span>
            <span className="font-black text-xl">${Number(job.revenue).toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      {job.notes && (
        <div className="mt-10 p-4 bg-zinc-50 rounded-lg">
          <h3 className="text-[10px] font-black uppercase text-zinc-400 mb-2">Notes</h3>
          <p className="text-sm italic">{job.notes}</p>
        </div>
      )}
    </div>
  );
});