export const company = {
  name: "Labmall Scientific",
  tagline: "Empowering Scientific Discovery",
  positioning:
    "An independent laboratory supplies distributor serving Africa's research, industrial, mining, water, and educational laboratories.",
  email: "sales@labmallscientific.com",
  whatsapp: "+260 76 870 4256",
  whatsappDigits: "260768704256",
  address: "3536 Main Street, Ibex Hill, Lusaka, Zambia",
  facebook: "https://www.facebook.com/profile.php?id=61586843866579",
  linkedin: "https://www.linkedin.com/company/labmall-co-zm/",
  domain: "labmallscientific.com",
  sisterCompany: "Chemsol Scientific Ltd",
  businessHours: "Mon–Fri, 08:00–17:00 (CAT)",
};

export function whatsappLink(message: string) {
  return `https://wa.me/${company.whatsappDigits}?text=${encodeURIComponent(message)}`;
}
