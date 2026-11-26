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

  // Documents shown in the Documents section, exactly as issued. Add one entry per real document.
  // "file" is an image or PDF in the docs/ folder. "type" is a short label.
  documents: [
    {
      type: "Government circular",
      title: "MoRTH circular: Value engineering practices for National Highways projects",
      issuer: "Ministry of Road Transport & Highways, Government of India",
      ref: "File No. RW/NH-34049/01/2020-S&R (P&B)pt.",
      date: "2022-08-30",
      note: "Section 4 allows glass, carbon and aramid fibre reinforced polymer rebar for non-load-bearing and minor CD structures such as crash barriers, drains, Hume pipe and box culverts.",
      file: "docs/morth-circular-2022-08-30.jpg"
    },
    {
      type: "Guideline",
      title: "IRC:137-2022 Guidelines for use of GFRP rebar in highway and infrastructure projects",
      issuer: "Indian Roads Congress",
      note: "Table 3.1 lists the concrete components where GFRP bars are permitted: approach slabs, bridge decks, retaining walls, noise barriers, box culverts, crash barriers, drainage structures and more.",
      file: "docs/irc-137-2022-table-3-1.jpg"
    },
    {
      type: "Indian Standard",
      title: "IS 18256:2023 Solid round glass fibre reinforced polymer (GFRP) bars for concrete reinforcement: Specification",
      issuer: "Bureau of Indian Standards",
      date: "2023-10",
      note: "The national specification for GFRP bars used to reinforce concrete. Shown here as a general reference.",
      file: "docs/is-18256-2023-cover.jpg"
    },
    {
      type: "Government rate schedule",
      title: "Item 9.3: Solid round GFRP bars for concrete reinforcement (IS 18256:2023)",
      issuer: "Public Works Department schedule of rates, excerpt",
      note: "Lists GFRP bars conforming to IRC:137:2022 for crash barriers, concrete drains, concrete pavements and approach slabs.",
      file: "docs/govt-rate-schedule-item-9-3.jpg"
    }
  ],

  // Guidelines and standards used for GFRP bars in India.
  standards: [
    "IRC:137-2022 (Indian Roads Congress)",
    "IS 18256:2023 (Bureau of Indian Standards)",
    "MoRTH circular, 30 August 2022",
    "ACI 440.1R Guide for FRP-reinforced concrete",
    "AASHTO LRFD Guide Specifications for GFRP-reinforced bridge decks",
    "ASTM D7957 Solid round GFRP bars for concrete reinforcement"
  ],

  // Our factory (photos in projects/).
  factory: [
    { caption: "Pultrusion line", image: "projects/factory-line.jpg" },
    { caption: "Coiled rebar, 50 to 100 m", image: "projects/coil.jpg" },
    { caption: "Bent stirrups made to order", image: "projects/stirrups.jpg" },
    { caption: "Loading for despatch", image: "projects/loading.jpg" }
  ],

  // Supplies and site photos shown under Use cases.
  projects: [
    { name: "Drain reinforcement", application: "Drainage", location: "Nipani, Karnataka", image: "projects/drain-nipani.jpg" },
    { name: "RCC gutter", application: "Highway drain", location: "Gokak, Karnataka", image: "projects/gutter-gokak.jpg" },
    { name: "Industrial flooring", application: "Flooring", location: "Maharashtra", image: "projects/industrial-flooring.jpg" },
    { name: "Slab distribution bars", application: "Two-way slab", location: "Maharashtra", image: "projects/slab-distribution-bar.jpg" },
    { name: "Compound wall column", application: "Boundary wall", location: "Maharashtra", image: "projects/compound-wall-column.jpg" },
    { name: "Drain reinforcement", application: "Drainage", location: "Karnataka", image: "projects/drain-nipani-2.jpg" }
  ],

  // Contact.
  phones: ["8180821364", "9011095915"],
  email: "support@aptechno.biz"
};
