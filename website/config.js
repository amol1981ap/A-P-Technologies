// Edit these values only. Everything else on the site reads from here.
window.SITE_CONFIG = {
  // Public enquiry endpoint (enquiries land in the Control Centre lead inbox).
  enquiryUrl: "https://bdghrsdaueqvnvsgtxmy.supabase.co/functions/v1/public-enquiry",
  enquiryKey: "sb_publishable_au5yG9jEJurhvv6GZoYmuw_FvV0gElu",
  // WhatsApp number with country code, digits only (e.g. "919876543210").
  whatsappNumber: "918180821364",
  // Diameters offered, in mm, and standard bar length in metres.
  diameters: [8, 10, 12, 16, 18, 20, 22, 24],
  standardLength: "6 m / 12 m / custom",

  // Documents shown in the Documents section. Add one entry per real document.
  // Put the PDF in the docs/ folder and give its path in "file".
  // type: "Approval", "Test report", "Registration" or "Certificate"
  // Example:
  // { type: "Test report", title: "Tensile strength, 12 mm sand-coated", issuer: "Lab name", ref: "Report no.", date: "2026-10-15", file: "docs/tensile-12mm.pdf" }
  documents: [],

  // Supplies and projects shown under Use cases. Add one entry per real project.
  // Put a photo in the projects/ folder and give its path in "image" (optional).
  // Example:
  // { name: "Culvert, NH-66", location: "Ratnagiri", application: "Highway", quantity: "12,000 m of 12 mm", image: "projects/culvert.jpg" }
  projects: []
};
