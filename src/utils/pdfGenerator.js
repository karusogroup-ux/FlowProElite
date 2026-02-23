import { jsPDF } from "jspdf";
import "jspdf-autotable";

// --- CONFIG SYNCED WITH APP COLORS ---
const DOC_CONFIGS = {
  quote: { title: "QUOTE", color: [239, 68, 68], textColor: [255, 255, 255] },      // Red
  workorder: { title: "WORK ORDER", color: [250, 204, 21], textColor: [0, 0, 0] },  // Yellow
  invoice: { title: "TAX INVOICE", color: [59, 130, 246], textColor: [255, 255, 255] }, // Blue
  report: { title: "SERVICE REPORT", color: [34, 197, 94], textColor: [255, 255, 255] }  // Green
};

// Helper to format numbers with commas and exactly 2 decimals
const formatCurrency = (amount) => {
  return Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const generateJobPDF = async (job, type) => {
  // Fallback to workorder if type is unknown
  const config = DOC_CONFIGS[type] || DOC_CONFIGS.workorder;
  const doc = new jsPDF();
  
  const formattedRevenue = formatCurrency(job.revenue);
  const clientName = job.Customers?.name || "Private Client";

  // 1. Header Background (Branded)
  doc.setFillColor(...config.color);
  doc.rect(0, 0, 210, 40, 'F');
  
  // 2. Brand Header (Left)
  doc.setTextColor(...config.textColor);
  doc.setFont("helvetica", "bold").setFontSize(28).text("FLOWPRO", 14, 24);
  doc.setFontSize(10).setFont("helvetica", "normal").text("Field Service Management", 14, 32);
  
  // 3. Document Title (Right - Snaps perfectly to margin)
  doc.setFontSize(22).setFont("helvetica", "bold");
  doc.text(config.title, 196, 26, { align: "right" });

  // Reset Text Color for the body of the document
  doc.setTextColor(40, 40, 40);

  // 4. Metadata Section (Right Aligned)
  doc.setFontSize(10).setFont("helvetica", "normal");
  doc.text(`Date Issued: ${new Date().toLocaleDateString()}`, 196, 55, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text(`Job Reference: #${job.job_number}`, 196, 62, { align: "right" });

  // 5. Client Info (Left Aligned)
  doc.setFontSize(10).setTextColor(100, 100, 100).setFont("helvetica", "bold");
  doc.text("BILLED TO / CLIENT:", 14, 55);
  
  doc.setTextColor(40, 40, 40).setFont("helvetica", "normal");
  const clientYStart = 62;
  const clientDetails = [
    clientName, 
    job.Customers?.address, 
    job.Customers?.phone,
    job.Customers?.email
  ].filter(Boolean);
  doc.text(clientDetails, 14, clientYStart);

  // 6. The Table (Line Items)
  const isFinancial = (type === 'quote' || type === 'invoice');
  
  // Create dynamic rows based on LineItems array
  let tableBody = [];
  
  if (job.LineItems && job.LineItems.length > 0) {
    // If we have line items, map them out
    tableBody = job.LineItems.map(item => [
      `${item.quantity}x ${item.description}`, // e.g., "2x Premium Valve"
      isFinancial ? `$${formatCurrency(item.quantity * item.unit_price)}` : (job.status || 'Pending')
    ]);
  } else {
    // Fallback to the old method if no line items exist
    tableBody = [[
      job.title || 'General Service', 
      isFinancial ? `$${formattedRevenue}` : (job.status || 'Pending')
    ]];
  }

  doc.autoTable({
    startY: 85,
    head: [[
      'Description', 
      isFinancial ? 'Amount' : 'Status'
    ]],
    body: tableBody,
    headStyles: { 
      fillColor: config.color, 
      textColor: config.textColor,
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'right', cellWidth: 40 } // Aligns numbers to the right nicely
    },
    theme: 'grid',
    styles: { cellPadding: 6, fontSize: 10, textColor: [40, 40, 40] }
  });

  // 7. Notes Section
  let finalY = doc.lastAutoTable.finalY + 15;
  
  if (job.notes) {
    // Page break protection: If notes start too close to the bottom, push to next page
    if (finalY > 250) { doc.addPage(); finalY = 20; }
    
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(100, 100, 100);
    doc.text("SCOPE & NOTES:", 14, finalY);
    doc.setFont("helvetica", "normal").setTextColor(40, 40, 40);
    
    // Split text handles long notes to wrap them within the page width
    const splitNotes = doc.splitTextToSize(job.notes, 182);
    doc.text(splitNotes, 14, finalY + 7);
    finalY += (splitNotes.length * 5) + 15;
  }

  // 8. Total Footer (For Quotes/Invoices)
  if (isFinancial) {
    // Page break protection for the total box
    if (finalY > 260) { doc.addPage(); finalY = 20; }
    
    // Clean, modern total box with a top border matching the document color
    doc.setFillColor(250, 250, 250);
    doc.rect(130, finalY - 8, 66, 20, 'F');
    doc.setDrawColor(...config.color);
    doc.setLineWidth(1);
    doc.line(130, finalY - 8, 196, finalY - 8); 
    
    doc.setFontSize(14).setFont("helvetica", "bold").setTextColor(40, 40, 40);
    doc.text("TOTAL DUE:", 135, finalY + 5);
    doc.text(`$${formattedRevenue}`, 191, finalY + 5, { align: "right" });
  }

  // 9. Footer Legal (Applies to all pages if multi-page)
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8).setTextColor(150, 150, 150).setFont("helvetica", "italic");
    doc.text("Generated via FlowPro Systems. Valid for 30 days from date of issue.", 105, 285, { align: 'center' });
  }

  // 10. Final Output with Sanitized File Name
  const safeTitle = config.title.replace(/\s+/g, '_');
  const safeClient = clientName.replace(/[^a-z0-9]/gi, '_'); // Removes special chars
  const fileName = `${safeTitle}_${job.job_number}_${safeClient}.pdf`;
  doc.save(fileName);
};