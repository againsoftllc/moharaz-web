export const ic = {
  cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  gpu: '<rect x="2" y="7" width="20" height="10" rx="1"/><circle cx="8" cy="12" r="2.5"/><circle cx="16" cy="12" r="2.5"/>',
  ram: '<rect x="2" y="7" width="20" height="9" rx="1"/><path d="M6 16v3M10 16v3M14 16v3M18 16v3"/>',
  ssd: '<rect x="3" y="8" width="18" height="8" rx="1"/><path d="M7 12h6"/>',
  mb: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="5" height="5"/><path d="M15 7h2M15 11h2M7 16h10"/>',
  mon: '<rect x="2" y="3" width="20" height="13" rx="1"/><path d="M8 21h8M12 16v5"/>',
  lap: '<rect x="4" y="4" width="16" height="11" rx="1"/><path d="M2 19h20"/>',
  ups: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="m13 7-3 5h4l-3 5"/>',
  psu: '<rect x="2" y="5" width="20" height="14" rx="1"/><circle cx="9" cy="12" r="3.5"/><path d="M16 9h3M16 12h3M16 15h3"/>',
  case: '<rect x="6" y="2" width="12" height="20" rx="1"/><circle cx="12" cy="8" r="2"/><circle cx="12" cy="15" r="2"/>',
  kb: '<rect x="2" y="6" width="20" height="12" rx="1"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  head: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><rect x="2" y="15" width="5" height="6" rx="1"/><rect x="17" y="15" width="5" height="6" rx="1"/>',
  desk: '<rect x="6" y="2" width="12" height="20" rx="1"/><path d="M10 6h4"/>',
  cooler: '<rect x="4" y="3" width="16" height="10" rx="1"/><path d="M4 6h16M4 9h16M8 13v4M16 13v4"/><rect x="6" y="17" width="12" height="4" rx="1"/>',
  hdd: '<rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="10" r="4"/><path d="m12 10 3 5"/><path d="M8 18.5h.01"/>',
  os: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 8h18M7 6h.01M10 6h.01M8 21h8"/>',
  fan: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-6 4-6M14 12c4 0 6 1 6 4M12 14c0 4-1 6-4 6M10 12c-4 0-6-1-6-4"/>',
  wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0"/><path d="M12 20h.01"/>',
  tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  pad: '<rect x="2" y="4" width="20" height="16" rx="3"/><rect x="10" y="8" width="5" height="8" rx="2.5"/>',
  game: '<path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><path d="M17.3 5H6.7a4 4 0 0 0-4 3.6L2 15a3 3 0 0 0 5.3 2l1.3-1.5a2 2 0 0 1 1.5-.7h3.8a2 2 0 0 1 1.5.7l1.3 1.5A3 3 0 0 0 22 15l-.7-6.4A4 4 0 0 0 17.3 5z"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/>',
  mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 6v4"/>',
  shirt: '<path d="M8 3 3 6l2 5 3-1v11h8V10l3 1 2-5-5-3c0 2-1.8 3.2-4 3.2S8 5 8 3z"/>',
  bag: '<path d="M5 9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v12H5z"/><path d="M9 6V4.5a3 3 0 0 1 6 0V6M5 13h14M10 13v2h4v-2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
} as const;

export type IconKey = keyof typeof ic;

/** SVG text takes the page font (next/font, see app/layout.tsx) */
export const FONT = "inherit";

/** '৳' + Indian digit grouping (same output as toLocaleString('en-IN')) */
export const tk = (n: number) => {
  const s = String(n);
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return "৳" + (rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3);
};

export const pad2 = (n: number) => String(n).padStart(2, "0");

/* menu: [top item, dropdown groups?] — a group is [heading, entries]; an entry is a name, or [name, sub-entries]
   for a flyout beside it (a brand there filters the entry's page, anything else searches it) */
type MegaEntry = string | [string, string[]];
type MegaCol = [string, MegaEntry[]];
export const MENU: [string, MegaCol[]?][] = [
  ["Laptop", [
    ["Laptop", [["Gaming Laptop", ["ASUS", "Lenovo", "HP", "Acer", "MSI"]], ["Everyday Laptop", ["ASUS", "Lenovo", "HP", "Dell"]], ["Business Laptop", ["Lenovo", "HP", "Dell"]], "2-in-1 Laptop"]],
    ["Brand", ["ASUS", "Lenovo", "HP", "Dell", "Acer", "MSI"]],
    ["Budget", ["Under ৳50K", "৳50K–80K", "৳80K–1.2L", "Above ৳1.2L"]],
    ["Accessories", ["Laptop Bag", "Cooling Pad", "Adapter"]],
  ]],
  ["PC Components", [
    ["Core", [
      ["Processor", ["AMD", "Intel"]], ["Motherboard", ["ASUS", "MSI", "Gigabyte", "ASRock"]],
      ["Desktop RAM", ["DDR5", "DDR4", "Corsair", "G.Skill", "Kingston", "TeamGroup", "ADATA"]],
      ["Graphics Card", ["GeForce RTX", "Radeon RX", "ASUS", "MSI", "Gigabyte", "Zotac", "Sapphire"]],
      ["Power Supply", ["Corsair", "Antec", "MSI", "Gigabyte", "Thermaltake", "Deepcool", "Cooler Master"]],
      ["Casing", ["Lian Li", "NZXT", "Corsair", "Antec", "Deepcool", "Montech", "Cooler Master"]],
    ]],
    ["Storage", [["NVMe SSD", ["Samsung", "Kingston", "WD", "Crucial", "ADATA"]], "SATA SSD", ["Internal HDD", ["Seagate", "WD", "Toshiba"]], "External SSD"]],
    ["Cooling", [["CPU Air Cooler", ["Deepcool", "Cooler Master", "Thermalright", "ID-Cooling"]], ["AIO Liquid Cooler", ["Deepcool", "Lian Li", "NZXT", "Corsair"]], ["Casing Fan", ["ARCTIC", "Lian Li", "Montech", "Deepcool", "Corsair"]], "Thermal Paste"]],
    ["Top Brands", ["AMD", "Intel", "ASUS", "MSI", "Gigabyte"]],
  ]],
  ["Desktop", [
    ["Desktop PC", [["Brand PC", ["Acer", "ASUS", "Dell", "HP", "Lenovo"]], ["All-in-One PC", ["HP", "Dell", "Lenovo"]], ["Mini PC", ["ASUS", "HP", "Lenovo"]], "Gaming PC", "Workstation PC"]],
    ["Desktop Component", [["Processor", ["AMD", "Intel"]], ["Motherboard", ["ASUS", "MSI", "Gigabyte", "ASRock"]], ["Desktop RAM", ["DDR5", "DDR4"]], ["Graphics Card", ["GeForce RTX", "Radeon RX"]], "Power Supply", "Casing", ["CPU Cooler", ["Air Cooler", "AIO Cooler"]], "Casing Fan"]],
    ["Server", [["Tower Server", ["Dell", "HP", "Lenovo"]], ["Rack Server", ["Dell", "HP", "Lenovo"]]]],
    ["Desktop Accessories", ["Keyboard & Mouse", "Mouse Pad", "UPS", "WiFi Adapter", "PC Accessories"]],
    ["Storage", [["SSD", ["NVMe", "SATA"]], ["Hard Disk", ["Seagate", "WD", "Toshiba"]]]],
  ]],
  ["Monitor", [
    ["Size", ['22"', '24"', '27"', '32"+']],
    ["Type", [["Gaming Monitor", ["ASUS", "LG", "Samsung", "MSI", "AOC", "Gigabyte"]], ["4K Monitor", ["Samsung", "LG", "Dell"]], "Ultrawide", "Curved", "IPS"]],
    ["Brand", ["ASUS", "LG", "Samsung", "Dell", "AOC", "MSI", "Gigabyte"]],
    ["Accessories", ["Monitor Arm", "Cable", "Webcam"]],
  ]],
  ["UPS", [
    ["UPS", [["Offline UPS", ["APC", "Power Guard"]], ["Line Interactive UPS", ["APC", "Maxgreen", "Apollo", "Prolink"]], ["Online UPS", ["APC", "Power Guard"]]]],
    ["Brand", ["APC", "Power Guard", "Maxgreen", "Apollo", "Prolink"]],
    ["Power Solution", ["IPS", "Voltage Stabilizer", "UPS Battery", "Power Station"]],
  ]],
  ["Accessories", [
    ["Input Devices", [["Keyboard", ["Logitech", "Razer", "Fantech", "Redragon", "HyperX", "Corsair"]], ["Mouse", ["Logitech", "Razer", "Fantech"]], ["Keyboard & Mouse Combo", ["Logitech", "Rapoo"]], "Mouse Pad"]],
    ["Audio", [["Headset", ["HyperX", "Logitech", "Razer", "Fantech", "Corsair", "SteelSeries"]], "Microphone", "Speaker", "Earphone"]],
    ["Computer Accessories", ["WiFi Adapter", "PC Accessories", "Webcam", "USB Hub", "Card Reader"]],
  ]],
  ["Gaming Gear", [
    ["Gaming Peripherals", [["Headset", ["HyperX", "Logitech", "Razer", "SteelSeries"]], ["Keyboard & Mouse", ["Logitech", "Razer", "Fantech", "Redragon"]], "Mouse Pad", "Controller", "Microphone"]],
    ["Gaming Brands", ["HyperX", "Logitech", "Razer", "Fantech", "SteelSeries"]],
  ]],
  ["Network", [
    ["Networking", [["Router", ["TP-Link", "Tenda", "Mercusys", "ASUS"]], ["WiFi Adapter", ["TP-Link", "ASUS", "Mercusys", "Tenda"]], "Network Switch", "Access Point", "Range Extender"]],
    ["Cable & Tools", ["LAN Cable", "Connector", "Crimping Tool"]],
  ]],
  ["Gadget", [
    ["Smart Gadget", [["Smart Watch", ["Apple", "Samsung", "Amazfit", "Xiaomi"]], ["Earbuds", ["Apple", "Samsung", "JBL", "Soundcore"]], "Power Bank", "Bluetooth Speaker"]],
  ]],
  ["Office Equipment", [
    ["Printer & Scanner", [["Printer", ["HP", "Canon", "Epson", "Brother"]], "Scanner", "Toner & Ink"]],
    ["Presentation", ["Projector", "Projector Screen", "Interactive Display"]],
    ["Office Essentials", ["Photocopier", "Money Counter", "Paper Shredder"]],
  ]],
  ["Camera", [
    ["Camera", [["DSLR Camera", ["Canon", "Nikon"]], ["Mirrorless Camera", ["Sony", "Canon", "Fujifilm"]], "Action Camera", "IP Camera"]],
    ["Camera Accessories", ["Lens", "Tripod", "Memory Card"]],
  ]],
  ["Tablet", [
    ["Tablet", [["Android Tablet", ["Samsung", "Lenovo", "Xiaomi"]], "iPad", "Graphics Tablet"]],
    ["Tablet Accessories", ["Tablet Cover", "Stylus Pen"]],
  ]],
  ["Software", [
    ["Operating System", [["Windows", ["Windows 11 Home", "Windows 11 Pro"]]]],
    ["Office", ["Office Home 2024", "Microsoft 365"]],
    ["Security", [["Antivirus", ["Kaspersky", "ESET"]]]],
  ]],
];

/* hero banners (stand-ins for real 1320×440 banner images) */
/* hero banners: [image in /public, alt text, link] — all 2828×1052 */
export const BANNERS: [string, string, string][] = [
  ["/banner-amd-ryzen-radeon-v3.webp", "Master the next level — build your gaming PC with AMD Ryzen 9000 and AMD Radeon RX 9000 in the PC Builder", "/pc-builder"],
  ["/banner-ryzen-7000.webp", "Built for the future — AMD Ryzen 7000 Series processors, DDR5 and PCIe 5.0 ready", "/amd-processor"],
  ["/banner-gaming-monitors.webp", "See every frame faster — OLED, QD-OLED and IPS gaming monitors up to 500Hz", "/monitor"],
];

/* promotions: [line1, line2, sub, from, to, icon, seconds left (0 = ongoing)] */
/* promotions: [line1, line2, sub, from, to, icon, seconds left (0 = ongoing), link]
   sub may use {off:<category>} (biggest % off there) or {from:<category>:<search>} (lowest matching price) */
export const PROMOS: [string, string, string, string, string, IconKey, number, string][] = [
  ["SSD", "DEALS", "Best prices on NVMe SSDs", "#1e1b4b", "#6d28d9", "ssd", 0, "/ssd"],
  ["GAMING", "HEADSETS", "HyperX · Logitech · Fantech", "#042f2e", "#0f766e", "head", 0, "/headphone"],
  ["MECHANICAL", "KEYBOARDS", "Mechanical keyboards for every budget", "#1c0a02", "#c2410c", "kb", 0, "/keyboard"],
  ["GRAPHICS", "CARD FEST", "RTX 50 series graphics cards", "#1a0305", "#b91c1c", "gpu", 0, "/graphics-card"],
  ["MONITOR", "WEEK", "Gaming monitors", "#020617", "#1d4ed8", "mon", 0, "/monitor"],
  ["DDR5", "RAM FEST", "Corsair · G.Skill · TeamGroup", "#1a0b2e", "#7c3aed", "ram", 0, "/ddr5-ram"],
  ["LAPTOP", "CARNIVAL", "Laptop deals", "#0c0a09", "#0e7490", "lap", 0, "/laptop"],
  ["UPS", "POWER DAYS", "Online UPS for your PC", "#1c1917", "#a16207", "ups", 0, "/online-ups"],
];



export const BUILDS: [string, string[], number, number, string, string, string][] = [
  ["Ultra Gaming PC — Ryzen 5 9600X + RTX 5060", ["AMD Ryzen 5 9600X", "RTX 5060 8GB", "16GB DDR5-6000", "1TB NVMe Gen4"], 152000, 167000, "#E3121B", "#7C3AED", "Best seller"],
  ["Ultra Gaming PC — Core i5-14400F + RTX 5060", ["Intel Core i5-14400F", "RTX 5060 8GB", "16GB DDR5-6000", "1TB NVMe Gen4"], 148500, 163000, "#1D4ED8", "#38BDF8", ""],
  ["Ultra Pro PC — Ryzen 7 7800X3D + RTX 5060 Ti", ["AMD Ryzen 7 7800X3D", "RTX 5060 Ti 16GB", "32GB DDR5-6000", "1TB NVMe Gen4"], 228000, 248000, "#E3121B", "#FFB020", "Top pick"],
  ["Ultra Pro PC — Core Ultra 5 250K + RTX 5060 Ti", ["Intel Core Ultra 5 250K", "RTX 5060 Ti 16GB", "32GB DDR5-6000", "2TB NVMe Gen4"], 209000, 229000, "#22C55E", "#38BDF8", ""],
  ["Ultra Budget PC — Ryzen 5 5600G", ["AMD Ryzen 5 5600G", "Radeon Vega Graphics", "16GB DDR4-3200", "512GB NVMe"], 48500, 54000, "#A855F7", "#E3121B", "Budget"],
  ["Ultra Creator PC — Ryzen 9 9900X + RTX 5070", ["AMD Ryzen 9 9900X", "RTX 5070 12GB", "64GB DDR5-6000", "2TB NVMe Gen4"], 315000, 338000, "#FFB020", "#E3121B", ""],
];


export type Story = [string, string, string, string, string];
export const STORIES: Story[] = [
  ["Rakib H.", "RTX 5060 build", "#7f1d1d", "#E3121B", "R"], ["Nusrat J.", "New ASUS laptop", "#1e3a8a", "#38BDF8", "N"],
  ["Tanvir A.", "Office setup", "#14532d", "#22C55E", "T"], ["Sajid K.", "Ryzen 7 upgrade", "#4c1d95", "#A855F7", "S"],
  ["Mim & Arif", "Couple gaming PC", "#78350f", "#FFB020", "M"], ["Esports Club", "Team setup", "#831843", "#EC4899", "E"],
  ["Fahim R.", "Streaming kit", "#134e4a", "#2DD4BF", "F"], ["Anika T.", "Creator PC", "#1e293b", "#94A3B8", "A"],
];

export const FAQ: [string, string][] = [
  ["What is the delivery time?", "Inside Dhaka within 24 hours. Outside Dhaka 2–3 working days by courier."],
  ["Are all products original?", "Yes. Every product is 100% genuine, brand new and comes with official warranty."],
  ["Do you offer cash on delivery?", "Cash on delivery is available inside Dhaka. Outside Dhaka, a partial advance payment is required."],
  ["Do you offer EMI?", "Yes, 0% EMI on credit cards of 29 banks for eligible orders."],
  ["Can I build a custom PC?", "Yes. Use our PC Builder to choose compatible parts — we assemble and test it for free."],
  ["How do I claim warranty?", "Contact our support team on 01805042474 with your invoice."],
];
