export interface Industry {
  slug: string;
  name: string;
  short: string;
  needs: string[];
  howWeServe: string;
}

export const industries: Industry[] = [
  {
    slug: "mining-mineral-processing",
    name: "Mining & Mineral Processing",
    short: "Analytical, QC, and sample preparation for mines and processing plants.",
    needs: [
      "Analytical balances and furnaces for assay labs",
      "Sample preparation equipment (crushing, sieving, milling)",
      "ICP and AAS reference standards",
      "Reagents and acids for wet chemistry testing",
    ],
    howWeServe:
      "We supply the consumables and instrumentation mining and mineral processing labs depend on for daily QC — from sample prep through to analytical reagents — with fast RFQ turnaround so testing schedules aren't held up by procurement.",
  },
  {
    slug: "water-treatment",
    name: "Water Treatment Laboratories",
    short: "Environmental testing and regulatory compliance for water utilities and treatment works.",
    needs: [
      "Portable pH, turbidity, and conductivity meters",
      "Benchtop spectrophotometers for full-panel analysis",
      "Reagent tablets and test kits (chlorine, phenol red, DPD)",
      "Calibration standards and consumables",
    ],
    howWeServe:
      "Water labs need dependable, in-stock consumables and calibrated instruments to keep compliance testing on schedule. We stock fast-moving reagent tablets and can source Hach and Hanna instrumentation on RFQ.",
  },
  {
    slug: "academia",
    name: "Academia",
    short: "University and research institution laboratories across teaching and research.",
    needs: [
      "General glassware and plasticware for teaching labs",
      "Chemicals and reagents for practicals and research",
      "Pipettes and consumables for life science research",
      "Bulk and repeat-order supply for departments",
    ],
    howWeServe:
      "We support universities and research institutions with reliable sourcing of glassware, chemicals, and consumables — sized for both teaching-lab volumes and specialised research requirements, quoted transparently against departmental budgets.",
  },
  {
    slug: "manufacturing",
    name: "Manufacturing",
    short: "Production QC and process control laboratories.",
    needs: [
      "In-process QC instrumentation",
      "Reference standards and calibration materials",
      "Consumables for repeat, high-frequency testing",
      "Fast-moving stock items to avoid line stoppages",
    ],
    howWeServe:
      "Manufacturing QC labs can't afford testing downtime. We prioritise fast-moving consumables in stock and give realistic lead times on equipment, so your process control schedule stays predictable.",
  },
  {
    slug: "agriculture",
    name: "Agriculture",
    short: "Soil, water, and food testing laboratories.",
    needs: [
      "Soil and nutrient testing reagents",
      "Water quality test kits",
      "Sample preparation and handling equipment",
      "Field-portable measuring instruments",
    ],
    howWeServe:
      "Agricultural testing labs and extension services get access to genuine testing reagents and portable instrumentation, sourced and quoted with the seasonal urgency agricultural testing often demands.",
  },
  {
    slug: "medical-clinical",
    name: "Medical & Clinical Laboratories",
    short: "Diagnostics and consumables for clinical and hospital laboratories.",
    needs: [
      "PCR tubes, capillary tubes, and coverslips",
      "Blood grouping and diagnostic reagents",
      "Biohazard bags and safety consumables",
      "Slide storage and general clinical consumables",
    ],
    howWeServe:
      "Clinical labs need consumables that are always genuine and always available. We hold strong local stock on high-turnover clinical items and can source diagnostic reagents and equipment on request.",
  },
  {
    slug: "environmental",
    name: "Environmental Laboratories",
    short: "Environmental monitoring and regulatory compliance testing.",
    needs: [
      "Water and soil sampling consumables",
      "Analytical standards for contaminant testing",
      "Portable field measurement instruments",
      "Filtration and sample preparation supplies",
    ],
    howWeServe:
      "Environmental monitoring programmes rely on consistent supply chains for sampling and analysis. We deliver genuine consumables and instrumentation with the documentation compliance work requires.",
  },
];
