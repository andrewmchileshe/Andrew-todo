import fs from "node:fs/promises";
import path from "node:path";

const BASE = "https://d8j0ntlcm91z4.cloudfront.net/user_3G8wOVsX8cCq6k8OJUws2kL1wrq/";

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const heroAbout = [
  { file: "hero", url: "hf_20260824_212219_5e07fa25-1aaf-49ff-b97a-9e5f89f2540b.png" },
  // about + all industries below regenerated for a mixed, majority-people-of-colour team
  { file: "about", url: "hf_20260824_214549_3fae7fee-8d1b-47a0-8e45-4d7f93410212.png" },
];

const industries = [
  { slug: "mining-mineral-processing", url: "hf_20260824_214549_ba5c554f-951c-4e6d-80e0-ac7c06133faf.png" },
  { slug: "water-treatment", url: "hf_20260824_214549_f61ffe7e-08ce-4d2d-b7a2-1fdbfffcdbbf.png" },
  { slug: "academia", url: "hf_20260824_214549_ae124e32-0553-45e0-9fc2-059dac5d4910.png" },
  { slug: "manufacturing", url: "hf_20260824_214549_35da5794-17f5-4d21-b23b-75405e7f3bff.png" },
  { slug: "agriculture", url: "hf_20260824_214549_1ad3e290-7a44-4be9-bec0-890aee78c88e.png" },
  { slug: "medical-clinical", url: "hf_20260824_214549_47fde412-7fa6-4d92-96d7-8b541e8e61cc.png" },
  { slug: "environmental", url: "hf_20260824_214549_15276799-121a-45c4-a658-31cf802e3990.png" },
];

const productPairs = [
  ["DPD No.1 Comparator Tablets (250/pk)", "Lovibond"],
  ["Phenol Red Tablets (250/pk)", "Generic"],
  ["Sulphuric Acid 98% AR Grade (1L)", "Loba Chemie"],
  ["Hydrochloric Acid 2.5L Labpure", "Generic"],
  ["Ethanol Absolute 99.9% (500ml)", "Generic"],
  ["Molecular Grade Ethanol", "Generic"],
  ["Potassium Permanganate AR", "Generic"],
  ["ICP Multi Element Standard Solution IV (100ml)", "Merck"],
  ["Isooctane for Analysis (2.5L)", "Merck"],
  ["Silica Gel Blue (500g)", "Generic"],
  ["Potassium Hydrogen Sulfate AR (500g)", "Generic"],
  ["Citric Acid Anhydrous", "Generic"],
  ["PCR Tubes 0.2ml Flat Cap (500/pk)", "Generic"],
  ["PCR Tube 8-Strip with Flat Cap 0.2ml (125/pk)", "Generic"],
  ["Beaker Set Glass — 50ml, 250ml, 600ml, 1000ml", "ARCO / Duran"],
  ["Erlenmeyer Flask N/N 1000ml", "Generic"],
  ["Filter Paper Grade 1, 150mm (100/pk)", "Whatman"],
  ["McCartney Bottle 28ml Wide Neck (12/pk)", "Generic"],
  ["Plastic Beaker 500ml", "Generic"],
  ["Cryobox Polypropylene Opaque, 81-Place", "Generic"],
  ["Capillary Tubes Non-Heparinised 75mm (100/pk)", "Generic"],
  ["Coverslips 18×18mm (100/pk)", "Generic"],
  ["Slide Storage Box for 50 Slides", "Generic"],
  ["Biohazard Red Bags 40×50cm 50µm", "Generic"],
  ["18G Needles", "Generic"],
  ["ARKRAY Anti-A + B + D (Rh) Monoclonal Reagent", "Arkray"],
  ["Automatic Hand Sanitizer Dispenser 450ml", "Generic"],
  ["Digital Timer Count Up/Down", "Generic"],
  ["Stainless Steel Spatula 15cm", "Generic"],
];

const productUrls = [
  "hf_20260824_212359_b86d6f4a-04dc-45e0-b7d1-91ae9164e72f.png",
  "hf_20260824_212359_b1f51948-48c4-431b-b6f7-e4c5f1585334.png",
  "hf_20260824_212359_d82b419c-5065-46e0-bf93-ec42780d4fe7.png",
  "hf_20260824_212359_5eb6956b-d69d-4386-bc2a-6b489611f7d8.png",
  "hf_20260824_212359_195bb320-3689-404a-b56b-6c3102d3b175.png",
  "hf_20260824_212359_faef868b-a5cc-4445-acc6-d9414fb357d1.png",
  "hf_20260824_212359_c52a600e-ee8a-4e98-84ac-a5ae78be7d8c.png",
  "hf_20260824_212359_04eab80f-3c8b-48fa-a913-39a474ecb856.png",
  "hf_20260824_212359_d92d6966-ff57-49ba-ad8f-33995c35b1a1.png",
  "hf_20260824_212359_8da9994a-ffd7-45b6-b661-626cabc43907.png",
  "hf_20260824_212400_1456402b-e46c-4ce7-8dc0-3aea660c6403.png",
  "hf_20260824_212359_3871fd21-a40f-4aa9-92f4-594949402a03.png",
  "hf_20260824_212419_a8039fe0-9a75-4f28-bd64-79540aa28f2b.png",
  "hf_20260824_212419_73ce5f6f-5136-4572-962a-6e305101ab2d.png",
  "hf_20260824_212419_0cd7fbe5-8d44-4d05-bafc-2894577922ad.png",
  "hf_20260824_212419_2355627f-5a45-4d43-bbf3-c514a03ca185.png",
  "hf_20260824_212419_301297e3-5798-4683-91b7-68d2158b08d1.png",
  "hf_20260824_212419_c608aff2-3ad2-4359-9f82-f1324b822ed6.png",
  "hf_20260824_212419_e838c4af-fce3-4dd4-bc8d-edf78f9cf4dd.png",
  "hf_20260824_212419_17b62c27-8a2b-40b2-98af-d0b5956b7b5d.png",
  "hf_20260824_212419_3374e09e-9126-4f2e-bac4-ea9b3238c35c.png",
  "hf_20260824_212419_f4270e3c-a755-45bf-9cc8-b1f6eeb49ef6.png",
  "hf_20260824_212419_88086307-975d-4f4e-a8c4-0113ebc109df.png",
  "hf_20260824_212419_f20b5bcf-70c1-434a-9279-6f3beeb3bf97.png",
  "hf_20260824_212432_79f8f8e7-7fb6-4183-9cc2-021ed7846c3a.png",
  "hf_20260824_212432_7d7503cc-6fa1-49f9-826a-a9f42cbefd7d.png",
  "hf_20260824_212432_36eded53-28a2-433a-a5ba-53d323d8997d.png",
  "hf_20260824_212432_869e8aa9-7428-4632-a945-23589165e058.png",
  "hf_20260824_212432_43498ed8-4138-4b35-831e-0c553fb883f4.png",
];

async function download(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, buf);
  console.log("saved", destPath, buf.length, "bytes");
}

const publicDir = new URL("../public/images/", import.meta.url).pathname;

async function main() {
  for (const { file, url } of heroAbout) {
    await download(BASE + url, path.join(publicDir, `${file}.png`));
  }
  for (const { slug, url } of industries) {
    await download(BASE + url, path.join(publicDir, "industries", `${slug}.png`));
  }
  if (productPairs.length !== productUrls.length) {
    throw new Error(
      `Mismatch: ${productPairs.length} product pairs vs ${productUrls.length} urls`
    );
  }
  for (let i = 0; i < productPairs.length; i++) {
    const [name, brand] = productPairs[i];
    const slug = slugify(`${name}-${brand}`);
    await download(BASE + productUrls[i], path.join(publicDir, "products", `${slug}.png`));
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
