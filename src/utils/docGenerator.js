import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

export const generateDocument = async (template, job) => {
  try {
    const templateBase64 = template.content;

    // 1. Validation: Ensure we actually have a string
    if (typeof templateBase64 !== 'string') {
      throw new Error("Template content is missing or not a valid string.");
    }

    // 2. Extraction: Remove the "data:...base64," prefix if it exists
    const base64Data = templateBase64.includes(",") 
      ? templateBase64.split(",")[1] 
      : templateBase64;

    // 3. Binary Conversion
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 4. Load into PizZip
    const zip = new PizZip(bytes.buffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // 5. Data Mapping (Matches your %% keys)
    doc.render({
      title: job.title || "",
      job_number: job.job_number || "",
      revenue: job.revenue || 0,
      costs: job.costs || 0,
      current_date: new Date().toLocaleDateString(),
      name: job.Customers?.name || "",
      email: job.Customers?.email || "",
      phone: job.Customers?.phone || "",
      address: job.Customers?.address || "",
      notes: job.notes || ""
    });

    // 6. Generate & Save
    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    saveAs(out, `${job.job_number}_${template.name}`);
  } catch (error) {
    console.error("Doc Generation Error:", error);
    alert("Error generating document: " + error.message);
  }
};