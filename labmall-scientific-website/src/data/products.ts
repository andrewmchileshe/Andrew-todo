export type ListingType = "buy-now" | "rfq";
export type ProductKind =
  | "Equipment"
  | "Consumable"
  | "Chemical"
  | "Glassware"
  | "Plasticware"
  | "Reagent"
  | "Standard";

export interface Product {
  slug: string;
  name: string;
  brand: string;
  category: string;
  kind: ProductKind;
  inStock: boolean;
  listing: ListingType;
  priceZMW?: number;
  leadTime: string;
  application: string;
  description: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const categories = [
  "Water Testing & Environmental",
  "Analytical Chemistry & Chemicals",
  "Pipettes & Tips",
  "Glassware & Plasticware",
  "Medical & Clinical Consumables",
  "Safety & General Lab Equipment",
] as const;

interface RawProduct {
  name: string;
  brand: string;
  category: (typeof categories)[number];
  kind: ProductKind;
  inStock: boolean;
  priceZMW?: number;
  application: string;
  notes: string;
}

const raw: RawProduct[] = [
  // Water Testing & Environmental
  { name: "Portable pH Meter HI98127", brand: "Hanna Instruments", category: "Water Testing & Environmental", kind: "Equipment", inStock: false, application: "Fast, portable pH measurement — water QC essential", notes: "Fast mover — water QC essential" },
  { name: "Multiparameter Photometer HI83099", brand: "Hanna Instruments", category: "Water Testing & Environmental", kind: "Equipment", inStock: false, application: "Measures chlorine, pH, and turbidity in one unit", notes: "Multi-parameter water testing" },
  { name: "Conductivity/TDS Meter", brand: "Hanna Instruments", category: "Water Testing & Environmental", kind: "Equipment", inStock: false, application: "Portable conductivity and TDS measurement", notes: "Water lab staple" },
  { name: "Portable Turbidity Meter", brand: "Lovibond", category: "Water Testing & Environmental", kind: "Equipment", inStock: false, application: "On-site turbidity readings for water treatment labs", notes: "Water treatment labs" },
  { name: "DPD No.1 Comparator Tablets (250/pk)", brand: "Lovibond", category: "Water Testing & Environmental", kind: "Consumable", inStock: true, application: "Chlorine testing by comparator method", notes: "In stock (3 packs)" },
  { name: "Phenol Red Tablets (250/pk)", brand: "Generic", category: "Water Testing & Environmental", kind: "Consumable", inStock: true, application: "pH testing — pool and water QC", notes: "In stock (14 packs)" },
  { name: "DR3900 Benchtop Spectrophotometer", brand: "Hach", category: "Water Testing & Environmental", kind: "Equipment", inStock: false, application: "Full-panel water analysis, gold standard instrument", notes: "Gold standard for water analysis" },
  { name: "Turbidimeter 2100Q Portable", brand: "Hach", category: "Water Testing & Environmental", kind: "Equipment", inStock: false, application: "Portable turbidity testing for mining and water labs", notes: "Mining & water labs" },

  // Analytical Chemistry & Chemicals
  { name: "Analytical Balance 220g / 0.1mg", brand: "Sartorius", category: "Analytical Chemistry & Chemicals", kind: "Equipment", inStock: false, application: "Core precision weighing for analytical labs", notes: "Core lab instrument" },
  { name: "Muffle Furnace 1100°C", brand: "Carbolite", category: "Analytical Chemistry & Chemicals", kind: "Equipment", inStock: false, application: "Ashing and high-temperature sample prep", notes: "Mining and QC labs" },
  { name: "Sulphuric Acid 98% AR Grade (1L)", brand: "Loba Chemie", category: "Analytical Chemistry & Chemicals", kind: "Chemical", inStock: true, priceZMW: 210, application: "Analytical reagent grade acid for wet chemistry", notes: "In stock" },
  { name: "Hydrochloric Acid 2.5L Labpure", brand: "Generic", category: "Analytical Chemistry & Chemicals", kind: "Chemical", inStock: true, priceZMW: 245, application: "General laboratory acid for digestion and titration", notes: "In stock" },
  { name: "Ethanol Absolute 99.9% (500ml)", brand: "Generic", category: "Analytical Chemistry & Chemicals", kind: "Chemical", inStock: true, application: "Solvent and disinfection use", notes: "In stock" },
  { name: "Molecular Grade Ethanol", brand: "Generic", category: "Analytical Chemistry & Chemicals", kind: "Chemical", inStock: true, priceZMW: 1950, application: "Molecular biology grade solvent", notes: "In stock" },
  { name: "Potassium Permanganate AR", brand: "Generic", category: "Analytical Chemistry & Chemicals", kind: "Chemical", inStock: true, priceZMW: 210, application: "Oxidising agent for titration and water treatment", notes: "In stock" },
  { name: "ICP Multi Element Standard Solution IV (100ml)", brand: "Merck", category: "Analytical Chemistry & Chemicals", kind: "Standard", inStock: true, application: "Calibration standard for ICP analysis in mining labs", notes: "In stock (1 unit) — mining labs" },
  { name: "Isooctane for Analysis (2.5L)", brand: "Merck", category: "Analytical Chemistry & Chemicals", kind: "Chemical", inStock: true, application: "HPLC/GC grade solvent for analytical work", notes: "In stock (3 units)" },
  { name: "Silica Gel Blue (500g)", brand: "Generic", category: "Analytical Chemistry & Chemicals", kind: "Chemical", inStock: true, application: "Desiccant with moisture indicator", notes: "In stock (1 unit)" },
  { name: "Potassium Hydrogen Sulfate AR (500g)", brand: "Generic", category: "Analytical Chemistry & Chemicals", kind: "Chemical", inStock: true, priceZMW: 1775, application: "Analytical reagent for fusion and digestion", notes: "In stock (2 units)" },
  { name: "Citric Acid Anhydrous", brand: "Generic", category: "Analytical Chemistry & Chemicals", kind: "Chemical", inStock: true, priceZMW: 140, application: "General laboratory and buffer preparation use", notes: "In stock" },

  // Pipettes & Tips
  { name: "PIPETMAN Classic P1000 (Single Channel)", brand: "Gilson", category: "Pipettes & Tips", kind: "Equipment", inStock: false, application: "Industry-standard variable volume pipetting, 100–1000µL", notes: "Industry standard" },
  { name: "PIPETMAN Classic P200", brand: "Gilson", category: "Pipettes & Tips", kind: "Equipment", inStock: false, application: "High-frequency variable volume pipetting, 20–200µL", notes: "High frequency in all labs" },
  { name: "Research Plus Pipette 100–1000µL", brand: "Eppendorf", category: "Pipettes & Tips", kind: "Equipment", inStock: false, application: "Premium single-channel precision pipetting", notes: "Premium single-channel" },
  { name: "Bravo Multichannel 8-Channel Pipette", brand: "CAPP Ahn", category: "Pipettes & Tips", kind: "Equipment", inStock: false, application: "High-throughput PCR and ELISA plate work", notes: "PCR and ELISA workflows" },
  { name: "epT.I.P.S. 1000µL Tips (500/pk)", brand: "Eppendorf", category: "Pipettes & Tips", kind: "Consumable", inStock: false, application: "Universal pipette tips for volumetric work", notes: "Universal tips" },
  { name: "PCR Tubes 0.2ml Flat Cap (500/pk)", brand: "Generic", category: "Pipettes & Tips", kind: "Consumable", inStock: true, application: "PCR amplification and molecular biology work", notes: "In stock (3 packs)" },
  { name: "PCR Tube 8-Strip with Flat Cap 0.2ml (125/pk)", brand: "Generic", category: "Pipettes & Tips", kind: "Consumable", inStock: true, application: "High-throughput PCR workflows", notes: "In stock (4 packs)" },

  // Glassware & Plasticware
  { name: "Beaker Set Glass — 50ml, 250ml, 600ml, 1000ml", brand: "ARCO / Duran", category: "Glassware & Plasticware", kind: "Glassware", inStock: true, application: "General-purpose laboratory beakers, multiple sizes", notes: "Multiple sizes in stock" },
  { name: "Erlenmeyer Flask N/N 1000ml", brand: "Generic", category: "Glassware & Plasticware", kind: "Glassware", inStock: true, application: "Mixing, titration, and culture work", notes: "In stock (18 units)" },
  { name: "Filter Paper Grade 1, 150mm (100/pk)", brand: "Whatman", category: "Glassware & Plasticware", kind: "Consumable", inStock: true, application: "General laboratory filtration", notes: "In stock (6 packs)" },
  { name: "McCartney Bottle 28ml Wide Neck (12/pk)", brand: "Generic", category: "Glassware & Plasticware", kind: "Glassware", inStock: true, application: "Sample storage and microbiology work", notes: "In stock (12 units)" },
  { name: "Plastic Beaker 500ml", brand: "Generic", category: "Glassware & Plasticware", kind: "Plasticware", inStock: true, application: "Durable general-purpose liquid handling", notes: "In stock (13 units)" },
  { name: "Cryobox Polypropylene Opaque, 81-Place", brand: "Generic", category: "Glassware & Plasticware", kind: "Plasticware", inStock: true, application: "Cryogenic sample storage and organisation", notes: "In stock (4 units)" },

  // Medical & Clinical Consumables
  { name: "Capillary Tubes Non-Heparinised 75mm (100/pk)", brand: "Generic", category: "Medical & Clinical Consumables", kind: "Consumable", inStock: true, application: "Blood sample collection for clinical testing", notes: "In stock (17 packs)" },
  { name: "Coverslips 18×18mm (100/pk)", brand: "Generic", category: "Medical & Clinical Consumables", kind: "Consumable", inStock: true, application: "Microscopy slide preparation", notes: "In stock (5 packs)" },
  { name: "Slide Storage Box for 50 Slides", brand: "Generic", category: "Medical & Clinical Consumables", kind: "Equipment", inStock: true, application: "Organised storage for prepared microscope slides", notes: "In stock (26 units)" },
  { name: "Biohazard Red Bags 40×50cm 50µm", brand: "Generic", category: "Medical & Clinical Consumables", kind: "Consumable", inStock: true, application: "Safe disposal of biohazardous waste", notes: "In stock (99 units) — strong stock" },
  { name: "18G Needles", brand: "Generic", category: "Medical & Clinical Consumables", kind: "Consumable", inStock: true, application: "Clinical sample collection and procedures", notes: "In stock (2 boxes)" },
  { name: "ARKRAY Anti-A + B + D (Rh) Monoclonal Reagent", brand: "Arkray", category: "Medical & Clinical Consumables", kind: "Reagent", inStock: true, application: "Blood grouping and Rh typing", notes: "In stock (3 units)" },

  // Safety & General Lab Equipment
  { name: "Automatic Hand Sanitizer Dispenser 450ml", brand: "Generic", category: "Safety & General Lab Equipment", kind: "Equipment", inStock: true, application: "Touch-free hygiene stations for labs and clinics", notes: "In stock (10 units)" },
  { name: "Digital Timer Count Up/Down", brand: "Generic", category: "Safety & General Lab Equipment", kind: "Equipment", inStock: true, application: "General laboratory timing", notes: "In stock (3 units)" },
  { name: "Stainless Steel Spatula 15cm", brand: "Generic", category: "Safety & General Lab Equipment", kind: "Equipment", inStock: true, application: "General sample handling and transfer", notes: "In stock (2 units)" },
];

export const products: Product[] = raw.map((p) => ({
  slug: slugify(`${p.name}-${p.brand}`),
  name: p.name,
  brand: p.brand,
  category: p.category,
  kind: p.kind,
  inStock: p.inStock,
  listing: p.inStock ? "buy-now" : "rfq",
  priceZMW: p.priceZMW,
  leadTime: p.inStock ? "Ships within 1–2 business days" : "Sourced on order — typically 2–6 weeks (confirmed at quote stage)",
  application: p.application,
  description: `${p.name} from ${p.brand === "Generic" ? "a trusted manufacturer" : p.brand}. ${p.notes}.`,
}));

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug);
}
