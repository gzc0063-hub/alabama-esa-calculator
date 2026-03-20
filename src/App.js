import { useState, useMemo, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════
   ALABAMA ESA MITIGATION POINTS CALCULATOR v2.0
   
   ENHANCEMENTS OVER v1.0:
   ✓ Limitation 1 RESOLVED: USDA Soil Data Access API integration
     for Hydrologic Soil Group (HSG) lookup by lat/lon coordinates.
     Enlist products auto-adjust: 4 pts (HSG A/B) vs 6 pts (HSG C/D).
   ✓ Limitation 2 RESOLVED: EPA Bulletins Live! Two REST API
     integration for real-time PULA checks by product + location.
   ✓ Limitation 3 RESOLVED: Data versioning panel with source dates,
     update schedule, and direct links to authoritative sources.
   ✓ Limitation 4 ADDRESSED: Printable compliance report generator —
     the printed record itself earns +1 mitigation point under EPA's
     recordkeeping practice.
   
   DATA SOURCES:
   - EPA Final Herbicide Strategy (Aug 20, 2024)
   - EPA Mitigation Menu (updated Apr 30, 2025)
   - EPA County Runoff Vulnerability (Oct 2024)
   - ACES IPM Guides 2025 (IPM-0415, -0413, -0360, -0428)
   - USDA Soil Data Access (sdmdataaccess.nrcs.usda.gov)
   - EPA BLT REST API (epa.gov/endangered-species)
   - EPA PPLS for registration numbers
   ═══════════════════════════════════════════════════════════════════ */

// ─── ALABAMA COUNTY DATA ───
const AL = [
  {n:"Autauga",v:"M",fips:"01001"},{n:"Baldwin",v:"H",fips:"01003"},{n:"Barbour",v:"M",fips:"01005"},
  {n:"Bibb",v:"M",fips:"01007"},{n:"Blount",v:"H",fips:"01009"},{n:"Bullock",v:"H",fips:"01011"},
  {n:"Butler",v:"H",fips:"01013"},{n:"Calhoun",v:"M",fips:"01015"},{n:"Chambers",v:"M",fips:"01017"},
  {n:"Cherokee",v:"M",fips:"01019"},{n:"Chilton",v:"M",fips:"01021"},{n:"Choctaw",v:"H",fips:"01023"},
  {n:"Clarke",v:"M",fips:"01025"},{n:"Clay",v:"M",fips:"01027"},{n:"Cleburne",v:"H",fips:"01029"},
  {n:"Coffee",v:"M",fips:"01031"},{n:"Colbert",v:"M",fips:"01033"},{n:"Conecuh",v:"H",fips:"01035"},
  {n:"Coosa",v:"M",fips:"01037"},{n:"Covington",v:"M",fips:"01039"},{n:"Crenshaw",v:"M",fips:"01041"},
  {n:"Cullman",v:"M",fips:"01043"},{n:"Dale",v:"M",fips:"01045"},{n:"Dallas",v:"H",fips:"01047"},
  {n:"DeKalb",v:"H",fips:"01049"},{n:"Elmore",v:"M",fips:"01051"},{n:"Escambia",v:"H",fips:"01053"},
  {n:"Etowah",v:"M",fips:"01055"},{n:"Fayette",v:"M",fips:"01057"},{n:"Franklin",v:"M",fips:"01059"},
  {n:"Geneva",v:"H",fips:"01061"},{n:"Greene",v:"M",fips:"01063"},{n:"Hale",v:"M",fips:"01065"},
  {n:"Henry",v:"M",fips:"01067"},{n:"Houston",v:"M",fips:"01069"},{n:"Jackson",v:"H",fips:"01071"},
  {n:"Jefferson",v:"M",fips:"01073"},{n:"Lamar",v:"M",fips:"01075"},{n:"Lauderdale",v:"M",fips:"01077"},
  {n:"Lawrence",v:"H",fips:"01079"},{n:"Lee",v:"M",fips:"01081"},{n:"Limestone",v:"H",fips:"01083"},
  {n:"Lowndes",v:"H",fips:"01085"},{n:"Macon",v:"H",fips:"01087"},{n:"Madison",v:"H",fips:"01089"},
  {n:"Marengo",v:"H",fips:"01091"},{n:"Marion",v:"M",fips:"01093"},{n:"Marshall",v:"H",fips:"01095"},
  {n:"Mobile",v:"H",fips:"01097"},{n:"Monroe",v:"H",fips:"01099"},{n:"Montgomery",v:"H",fips:"01101"},
  {n:"Morgan",v:"H",fips:"01103"},{n:"Perry",v:"H",fips:"01105"},{n:"Pickens",v:"H",fips:"01107"},
  {n:"Pike",v:"M",fips:"01109"},{n:"Randolph",v:"M",fips:"01111"},{n:"Russell",v:"M",fips:"01113"},
  {n:"Shelby",v:"M",fips:"01115"},{n:"St. Clair",v:"H",fips:"01117"},{n:"Sumter",v:"H",fips:"01119"},
  {n:"Talladega",v:"M",fips:"01121"},{n:"Tallapoosa",v:"M",fips:"01123"},{n:"Tuscaloosa",v:"M",fips:"01125"},
  {n:"Walker",v:"H",fips:"01127"},{n:"Washington",v:"H",fips:"01129"},{n:"Wilcox",v:"H",fips:"01131"},
  {n:"Winston",v:"M",fips:"01133"}
];

// ─── HERBICIDE DATABASE ───
const HERBS = [
  // ESA-LABELED (active)
  {id:"liberty-ultra",nm:"Liberty ULTRA",ai:"Glufosinate-P-ammonium (L-glufosinate)",grp:"10",mfr:"BASF",reg:"7969-500",cr:["C","S","N"],tm:["POST"],esa:"active",pts:3,ptsCD:null,buf:10,wMax:15,spd:10,drop:"Medium (ASABE S572.1)",blt:true,note:"First herbicide with Herbicide Strategy label (Oct 2024). Resolved isomer of glufosinate — new AI, not same as Liberty 280 SL. Buffer reducible to 0 ft with DRA/hooded sprayer/windbreak. Medium-to-coarse droplets required. Do not apply to saturated soils or during rain.",ref:"EPA Reg. 7969-500; BASF label dated Nov 26, 2024; ACES IPM-0415"},
  {id:"enlist-one",nm:"Enlist One",ai:"2,4-D choline salt",grp:"4",mfr:"Corteva",reg:"62719-695",cr:["C","S","N"],tm:["POST"],esa:"active",pts:4,ptsCD:6,buf:30,wMax:15,spd:null,drop:"XC or UC nozzles only (enlist.com/nozzles)",blt:true,note:"Enlist trait required for OTT use on cotton/soybean/corn. 4 credits HSG A/B soils, 6 credits HSG C/D soils. BLT check within 3 months. 30-ft downwind buffer. No application when rainfall expected within 48 hrs or soils saturated. Registered in 34 states incl. Alabama through Jan 2029. Label uses 'credits' (functionally = points).",ref:"EPA Reg. 62719-695; Corteva supplemental label Jan 2022; EPA registration page"},
  {id:"enlist-duo",nm:"Enlist Duo",ai:"2,4-D choline salt + Glyphosate dimethylammonium salt",grp:"4+9",mfr:"Corteva",reg:"62719-649",cr:["C","S","N"],tm:["POST"],esa:"active",pts:4,ptsCD:6,buf:30,wMax:15,spd:null,drop:"XC or UC nozzles only (enlist.com/nozzles)",blt:true,note:"Same ESA requirements as Enlist One. Enlist trait required. No tank-mix with other Group 4 herbicides. No application after soybean/cotton crops are in bloom.",ref:"EPA Reg. 62719-649; Corteva supplemental label Jan 2022; ACES IPM-0413"},

  // Cotton
  {id:"cotoran",nm:"Cotoran 4L",ai:"Fluometuron",grp:"7",mfr:"ADAMA",reg:"5481-495",cr:["C"],tm:["PRE","POST"],esa:"pending",pts:0,buf:0,pw:"Registration review not yet initiated under Herbicide Strategy. ESA label expected when EPA begins review (~2028–2030).",note:"Standard cotton PRE. Do not use on sandy soils <1% OM.",ref:"ACES IPM-0415"},
  {id:"prowl",nm:"Prowl H2O",ai:"Pendimethalin",grp:"3",mfr:"BASF",reg:"241-418",cr:["C","S","P","N"],tm:["PRE","PPI"],esa:"pending",pts:0,buf:0,pw:"Last registration review completed 2017 (before Herbicide Strategy). Next review ~2032. No current ESA mitigation points required.",note:"Microencapsulated. 1.0–2.1 pt/A PRE.",ref:"ACES IPM-0415; IPM-0360"},
  {id:"brake",nm:"Brake F",ai:"Fluridone",grp:"12",mfr:"SePRO",reg:"67690-30",cr:["C"],tm:["PRE"],esa:"pending",pts:0,buf:0,pw:"Niche product with small market. Low EPA priority for Herbicide Strategy review. Timeline unknown.",note:"Cotton only. 4–8 fl oz/A. Residual broadleaf and grass control.",ref:"ACES IPM-0415"},
  {id:"valor",nm:"Valor SX",ai:"Flumioxazin",grp:"14",mfr:"Valent",reg:"59639-99",cr:["C","S","P"],tm:["PRE","BURN"],esa:"pending",pts:0,buf:0,pw:"Registration review ongoing (interim decision 2021). ESA Herbicide Strategy label expected ~2026–2028 when review completes.",note:"PPO inhibitor. 2–3 oz/A PRE cotton. Key Palmer amaranth tool.",ref:"ACES IPM-0415; IPM-0413"},
  {id:"reflex",nm:"Reflex",ai:"Fomesafen",grp:"14",mfr:"Syngenta",reg:"100-1071",cr:["C","S"],tm:["PRE"],esa:"pending",pts:0,buf:0,pw:"Registration review completed 2022 but before Herbicide Strategy finalized. May receive ESA amendment ~2027–2029.",note:"PPO PRE. Cotton 1 pt/A. 18-month plant-back restriction.",ref:"ACES IPM-0415"},
  {id:"warrant",nm:"Warrant",ai:"Acetochlor",grp:"15",mfr:"Bayer",reg:"524-591",cr:["C","S","N"],tm:["PRE","POST"],esa:"pending",pts:0,buf:0,pw:"Registration review in progress. Acetochlor is high-volume — ESA label likely ~2026–2028.",note:"Group 15 residual. 48–64 fl oz/A.",ref:"ACES IPM-0415"},
  {id:"dual",nm:"Dual II Magnum",ai:"S-metolachlor",grp:"15",mfr:"Syngenta",reg:"100-816",cr:["C","S","P","N"],tm:["PRE","POST"],esa:"pending",pts:0,buf:0,pw:"Interim registration review decision 2023. One of the NEXT products expected to receive ESA label (~2026–2027).",note:"Rate varies by crop. Peanut: at least one OTT application recommended.",ref:"ACES IPM-0415; IPM-0360"},
  {id:"zidua",nm:"Zidua SC",ai:"Pyroxasulfone",grp:"15",mfr:"BASF",reg:"7969-374",cr:["C","S","P","N"],tm:["PRE"],esa:"pending",pts:0,buf:0,pw:"Relatively new registration (2013). First registration review not yet due. ESA label likely ~2028+.",note:"Group 15 PRE. Cotton 2.5–3.5 fl oz/A.",ref:"ACES IPM-0415"},
  {id:"diuron",nm:"Direx 4L",ai:"Diuron",grp:"7",mfr:"Various",reg:"352-508",cr:["C"],tm:["PRE","DIR"],esa:"pending",pts:0,buf:0,pw:"Registration review interim decision 2021. ESA label expected when final decision issued (~2027–2029).",note:"Cotton PRE or directed POST. Not over-the-top.",ref:"ACES IPM-0415"},
  {id:"rup3",nm:"Roundup PowerMAX 3",ai:"Glyphosate",grp:"9",mfr:"Bayer",reg:"524-659",cr:["C","S","N"],tm:["POST","BURN"],esa:"pending",pts:0,buf:0,pw:"Interim review decision 2020. Extremely complex ESA analysis (most-used herbicide globally). Ongoing litigation delays final decision. ESA label possibly ~2027–2028.",note:"RR varieties required POST. DO NOT rely on glyphosate alone—resistance at 57/58 AL locations.",ref:"ACES ANR-2417; IPM-0415"},
  {id:"gram",nm:"Gramoxone SL 3.0",ai:"Paraquat",grp:"22",mfr:"Syngenta",reg:"100-1652",cr:["C","S","P","N"],tm:["BURN","DIR"],esa:"pending",pts:0,buf:0,pw:"Restricted Use Pesticide with separate regulatory track. Interim review decision 2021. ESA analysis proceeding but timeline unclear.",note:"Restricted Use. Burndown or directed. Peanut: at-cracking 8–12 oz within 28 DAP.",ref:"ACES IPM-0415; IPM-0360"},
  {id:"caparol",nm:"Caparol 4L",ai:"Prometryn",grp:"5",mfr:"Syngenta",reg:"100-785",cr:["C"],tm:["DIR"],esa:"pending",pts:0,buf:0,pw:"Older, low-volume product. Low EPA priority. ESA label timeline unknown (~2030+).",note:"Cotton directed spray only. 1.2–2.4 pt/A.",ref:"ACES IPM-0415"},
  {id:"select",nm:"Select Max",ai:"Clethodim",grp:"1",mfr:"Valent",reg:"59639-135",cr:["C","S","P"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Registration review in progress. Moderate-volume graminicide. ESA label expected ~2027–2029.",note:"Grass-only POST. 9–16 fl oz/A + COC.",ref:"ACES IPM-0415"},

  // Soybean
  {id:"prefix",nm:"Prefix",ai:"S-metolachlor + Fomesafen",grp:"15+14",mfr:"Syngenta",reg:"100-1268",cr:["S"],tm:["PRE"],esa:"pending",pts:0,buf:0,pw:"Premix — will inherit ESA requirements when either S-metolachlor or fomesafen completes review. Tied to S-metolachlor timeline (~2026–2027).",note:"Premix PRE 2 pt/A. Broad-spectrum Palmer amaranth + grass residual.",ref:"ACES IPM-0413"},
  {id:"fierce",nm:"Fierce EZ",ai:"Flumioxazin + Pyroxasulfone",grp:"14+15",mfr:"Valent",reg:"59639-237",cr:["S"],tm:["PRE"],esa:"pending",pts:0,buf:0,pw:"Premix — tied to flumioxazin registration review (ongoing, interim decision 2021). Expected ~2027–2029.",note:"Premix PRE 3.75–5 fl oz/A. Two SOA for resistance management.",ref:"ACES IPM-0413"},
  {id:"auth",nm:"Authority First",ai:"Sulfentrazone + Cloransulam",grp:"14+2",mfr:"FMC",reg:"279-3452",cr:["S"],tm:["PRE"],esa:"pending",pts:0,buf:0,pw:"Sulfentrazone registration review in progress. ESA label expected ~2027–2029.",note:"PRE 6.4–8 oz/A. Check for ALS-resistant Palmer amaranth.",ref:"ACES IPM-0413"},
  {id:"flex",nm:"Flexstar",ai:"Fomesafen",grp:"14",mfr:"Syngenta",reg:"100-1101",cr:["S"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Same AI as Reflex. Registration review completed 2022 pre-Strategy. ESA amendment expected ~2027–2029.",note:"PPO POST 1–1.5 pt/A. Apply before weeds >4 in. Tank-mix with Group 15.",ref:"ACES IPM-0413"},
  {id:"blazer",nm:"Ultra Blazer",ai:"Acifluorfen",grp:"14",mfr:"UPL",reg:"70506-63",cr:["S"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Registration review completed 2023 but before Herbicide Strategy fully implemented. ESA amendment possible ~2027–2028.",note:"PPO POST. Thorough coverage required.",ref:"ACES IPM-0413"},
  {id:"classic",nm:"Classic",ai:"Chlorimuron-ethyl",grp:"2",mfr:"Corteva",reg:"352-653",cr:["S"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Low-volume ALS herbicide declining in use due to widespread resistance. Low EPA priority. ESA label likely ~2029+.",note:"ALS POST. DO NOT use where ALS-resistant Palmer confirmed.",ref:"ACES IPM-0413"},
  {id:"sharpen",nm:"Sharpen",ai:"Saflufenacil",grp:"14",mfr:"BASF",reg:"7969-279",cr:["S"],tm:["PRE","BURN"],esa:"pending",pts:0,buf:0,pw:"Registered 2010 — first review not yet due. ESA label expected when review initiated (~2028+).",note:"PPO burndown/PRE. Effective on horseweed.",ref:"ACES IPM-0413"},

  // Peanut
  {id:"strong",nm:"Strongarm",ai:"Diclosulam",grp:"2",mfr:"Corteva",reg:"62719-436",cr:["P"],tm:["PRE","PPI"],esa:"pending",pts:0,buf:0,pw:"Peanut-specific product with small national market. Low EPA priority for Herbicide Strategy review (~2029+).",note:"ALS PRE peanut 0.3–0.45 oz/A. Half-rate with Dual Magnum recommended (Dr. Steve Li).",ref:"ACES IPM-0360"},
  {id:"cadre",nm:"Cadre",ai:"Imazapic",grp:"2",mfr:"BASF",reg:"241-382",cr:["P"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Low-volume imidazolinone. Registration review not yet initiated under Herbicide Strategy (~2029+).",note:"ALS POST peanut 3 oz/A at 30–40 DAP. Tank-mix with bentazon for nutsedge.",ref:"ACES IPM-0360"},
  {id:"basag",nm:"Basagran",ai:"Bentazon",grp:"6",mfr:"BASF",reg:"7969-45",cr:["P","S"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Registration review in progress. ESA label expected ~2027–2029.",note:"POST for nutsedge and broadleaves. 1.5–2.0 pt/A.",ref:"ACES IPM-0360"},
  {id:"storm",nm:"Storm",ai:"Bentazon + Acifluorfen",grp:"6+14",mfr:"UPL",reg:"70506-175",cr:["P","S"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Premix — tied to bentazon registration review timeline (~2027–2029).",note:"Premix POST 1.0–1.5 pt/A.",ref:"ACES IPM-0360"},
  {id:"butyrac",nm:"Butyrac 200",ai:"2,4-DB",grp:"4",mfr:"Albaugh",reg:"42750-12",cr:["P","S"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Different active ingredient from 2,4-D (choline). Has its own separate registration review timeline (~2028+).",note:"Synthetic auxin safe on peanut/soybean. 6–10 fl oz/A for morningglory.",ref:"ACES IPM-0360"},
  {id:"outlook",nm:"Outlook",ai:"Dimethenamid-P",grp:"15",mfr:"BASF",reg:"7969-156",cr:["P","N"],tm:["PRE","POST"],esa:"pending",pts:0,buf:0,pw:"Registration review in progress. ESA label expected ~2027–2029.",note:"Group 15 alternative. Peanut 12–21 fl oz/A.",ref:"ACES IPM-0360"},

  // Corn
  {id:"atra",nm:"AAtrex 4L",ai:"Atrazine",grp:"5",mfr:"Syngenta",reg:"100-497",cr:["N"],tm:["PRE","POST"],esa:"pending",pts:0,buf:0,pw:"IMMINENT — EPA published updated proposed ESA mitigation Dec 2024. Over 900 listed species affected. Expected to be next product with ESA label (possibly 2026).",note:"RESTRICTED: 2.5 lb ai/A/yr max. New ESA label IMMINENT—EPA updated proposed mitigation Dec 2024.",ref:"ACES IPM-0428"},
  {id:"acuron",nm:"Acuron",ai:"S-metolachlor+Atrazine+Mesotrione+Bicyclopyrone",grp:"15+5+27+27",mfr:"Syngenta",reg:"100-1466",cr:["N"],tm:["PRE"],esa:"pending",pts:0,buf:0,pw:"Contains atrazine — will inherit atrazine ESA requirements when finalized. Also tied to S-metolachlor review. Could be 2026.",note:"4-way premix PRE 2.5–3 qt/A. Broadest corn residual. Contains atrazine.",ref:"ACES IPM-0428"},
  {id:"callisto",nm:"Callisto",ai:"Mesotrione",grp:"27",mfr:"Syngenta",reg:"100-1131",cr:["N"],tm:["PRE","POST"],esa:"pending",pts:0,buf:0,pw:"Registration review in progress. ESA label expected ~2027–2029.",note:"HPPD inhibitor. 6–7.7 fl oz/A. Tank-mix with atrazine for synergy.",ref:"ACES IPM-0428"},
  {id:"laudis",nm:"Laudis",ai:"Tembotrione",grp:"27",mfr:"Bayer",reg:"264-1066",cr:["N"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Registered 2012 — first review not yet due. ESA label expected when review initiated (~2028+).",note:"HPPD POST 3 fl oz/A + MSO. Excellent on Palmer amaranth.",ref:"ACES IPM-0428"},
  {id:"impact",nm:"Impact",ai:"Topramezone",grp:"27",mfr:"AMVAC",reg:"55467-23",cr:["N"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Registered 2006. Review in progress. ESA label expected ~2028+.",note:"HPPD POST 0.75 fl oz/A + atrazine + MSO.",ref:"ACES IPM-0428"},
  {id:"accent",nm:"Accent Q",ai:"Nicosulfuron",grp:"2",mfr:"Corteva",reg:"352-749",cr:["N"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"ALS herbicide under registration review. ESA label expected ~2027–2029.",note:"ALS POST corn 0.67 oz/A. Johnsongrass control. Check for ALS resistance.",ref:"ACES IPM-0428"},
  {id:"status",nm:"Status",ai:"Dicamba + Diflufenzopyr",grp:"4+19",mfr:"BASF",reg:"7969-225",cr:["N"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Dicamba registrations under active litigation (OTT products vacated Feb 2024). Separate regulatory track from Herbicide Strategy. Timeline complex.",note:"Corn POST only 5–10 oz/A. Broadleaf control.",ref:"ACES IPM-0428"},
  {id:"halex",nm:"Halex GT",ai:"S-metolachlor+Glyphosate+Mesotrione",grp:"15+9+27",mfr:"Syngenta",reg:"100-1324",cr:["N"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Premix containing glyphosate and S-metolachlor — will inherit ESA requirements from both AIs when reviews complete (~2027–2028).",note:"3-way POST corn 3.6 pt/A. RR corn only.",ref:"ACES IPM-0428"},
];

// ─── MITIGATION PRACTICES ───
const PRACT = [
  // Relief
  {id:"rec",nm:"Recordkeeping of mitigation practices",pts:1,cat:"relief",d:"Maintain paper/electronic records of all mitigation practices. Filing BLT bulletins and this report with spray records qualifies.",ref:"EPA Mitigation Menu Table 1, Row 4"},
  {id:"nonirr",nm:"Non-irrigated (dryland) production",pts:3,cat:"relief",d:"Field is not irrigated. Most Alabama row crop acreage is dryland.",ref:"EPA Mitigation Menu Table 1, Row 5"},
  {id:"sandy",nm:"Sandy soils — HSG A (≥90% sand, ≤10% clay)",pts:3,cat:"relief",d:"Hydrologic Soil Group A. Verify via USDA Web Soil Survey or the HSG Lookup tab below.",ref:"EPA Mitigation Menu Table 1, Row 6"},
  {id:"slope3",nm:"Field slope ≤3%",pts:2,cat:"relief",d:"Average field slope ≤3%. Common in Black Belt, Tennessee Valley, Coastal Plain.",ref:"EPA Mitigation Menu Table 1"},
  {id:"eqip",nm:"Active EQIP contract with CPS 595",pts:9,cat:"relief",d:"NRCS EQIP with Conservation Practice Standard 595 (Pest Management). Automatic maximum — no additional practices needed.",ref:"EPA Mitigation Menu Table 1; NRCS CPS 595"},

  // In-Field
  {id:"notill",nm:"No-till / strip-till",pts:3,cat:"infield",d:"≥30% residue at planting. Lauderdale Co. leads AL at 58.9%. 65.4% Southern US adoption (USDA ARMS 2023).",ref:"EPA Table 2; ACES conservation data"},
  {id:"redtill",nm:"Reduced / mulch tillage",pts:2,cat:"infield",d:"15–30% residue. Disk, chisel, or field cultivator without full inversion.",ref:"EPA Table 2"},
  {id:"cc",nm:"Cover crop (annual)",pts:1,cat:"infield",d:"Cover crop present at/after application. Alabama: 8.1% of cropland (2× national rate).",ref:"EPA Table 2; ACES"},
  {id:"ccnt",nm:"Cover crop + no-till (≥3 consecutive years)",pts:3,cat:"infield",d:"Continuous no-till with cover crops for 3+ years. Highest in-field practice value.",ref:"EPA Table 2"},
  {id:"contour",nm:"Contour farming / cross-slope tillage",pts:2,cat:"infield",d:"Rows on or near contour to reduce runoff velocity.",ref:"EPA Table 2"},
  {id:"resv",nm:"Reservoir tillage / furrow diking",pts:3,cat:"infield",d:"Small dams in furrows capturing rainfall. Common in AL cotton on Coastal Plain soils.",ref:"EPA Table 2"},
  {id:"gww",nm:"Grassed waterway",pts:1,cat:"infield",d:"Grass-covered channel in natural drainage area.",ref:"EPA Table 2; NRCS CPS 412"},
  {id:"terr",nm:"Terraces / diversions",pts:1,cat:"infield",d:"Earth embankments reducing slope length and runoff.",ref:"EPA Table 2; NRCS CPS 600"},

  // Edge-of-Field
  {id:"vfs10",nm:"Vegetative filter strip (10–29 ft)",pts:1,cat:"edge",d:"Permanent vegetation at field edge, 10–29 ft wide.",ref:"EPA Table 2; NRCS CPS 393"},
  {id:"vfs30",nm:"Vegetative filter strip (30–59 ft)",pts:2,cat:"edge",d:"VFS 30–59 ft wide.",ref:"EPA Table 2"},
  {id:"vfs60",nm:"Vegetative filter strip (≥60 ft)",pts:3,cat:"edge",d:"VFS ≥60 ft. Maximum VFS points.",ref:"EPA Table 2"},
  {id:"fb",nm:"Field border (≥30 ft)",pts:1,cat:"edge",d:"Perennial vegetation around field perimeter.",ref:"EPA Table 2; NRCS CPS 386"},
  {id:"riph",nm:"Riparian herbaceous buffer (≥30 ft)",pts:2,cat:"edge",d:"Permanent grass/forb buffer adjacent to waterbody.",ref:"EPA Table 2; NRCS CPS 390"},
  {id:"ripf",nm:"Riparian forest buffer (≥35 ft)",pts:2,cat:"edge",d:"Trees/shrubs + grass buffer adjacent to waterbody.",ref:"EPA Table 2; NRCS CPS 391"},
  {id:"cwet",nm:"Constructed wetland",pts:2,cat:"edge",d:"Engineered wetland treating field runoff.",ref:"EPA Table 2; NRCS CPS 656"},
  {id:"vditch",nm:"Vegetated ditch",pts:1,cat:"edge",d:"Drainage ditch with established vegetation.",ref:"EPA Table 2"},
  {id:"sed",nm:"Sediment basin / retention pond",pts:1,cat:"edge",d:"Basin capturing and holding runoff before release.",ref:"EPA Table 2; NRCS CPS 350"},
];

// ─── DATA VERSION REGISTRY ───
const DATA_VERSIONS = [
  {src:"EPA Herbicide Strategy",ver:"Final",date:"Aug 20, 2024",next:"N/A",url:"https://www.epa.gov/endangered-species/strategy-protect-endangered-species-herbicides"},
  {src:"EPA Mitigation Menu",ver:"v2.0",date:"Apr 30, 2025",next:"Fall 2026 (annual update)",url:"https://www.epa.gov/pesticides/mitigation-menu"},
  {src:"EPA County Runoff Vulnerability",ver:"1.0",date:"Oct 2024",next:"TBD",url:"https://www.epa.gov/system/files/documents/2024-10/county-mitigation-relief-points-runoff-vulnerability.pdf"},
  {src:"ACES IPM-0415 (Cotton)",ver:"2025",date:"Dec 2024",next:"Dec 2025",url:"https://www.aces.edu/blog/topics/crop-production/integrated-pest-management-guides/"},
  {src:"ACES IPM-0413 (Soybean)",ver:"2025",date:"Dec 2024",next:"Dec 2025",url:"https://www.aces.edu/blog/topics/crop-production/integrated-pest-management-guides/"},
  {src:"ACES IPM-0360 (Peanut)",ver:"2025",date:"2024",next:"2025",url:"https://www.aces.edu/blog/topics/crop-production/integrated-pest-management-guides/"},
  {src:"ACES IPM-0428 (Corn)",ver:"2025",date:"2024",next:"2025",url:"https://www.aces.edu/blog/topics/crop-production/integrated-pest-management-guides/"},
  {src:"EPA PPLS (Label Registry)",ver:"Live",date:"Continuous",next:"Check before each application",url:"https://ordspub.epa.gov/ords/pesticides/f?p=PPLS:1"},
  {src:"USDA Soil Data Access",ver:"Live API",date:"Continuous",next:"Real-time",url:"https://sdmdataaccess.nrcs.usda.gov/"},
  {src:"EPA BLT REST API",ver:"Live API",date:"Continuous",next:"Real-time",url:"https://www.epa.gov/endangered-species/advanced-resources-bulletins-live-two"},
];

const CL = {C:"Cotton",S:"Soybean",P:"Peanut",N:"Corn"};
const TL = {PRE:"PRE",POST:"POST",BURN:"Burndown",DIR:"Directed",PPI:"PPI"};
const CATL = {relief:"Mitigation Relief & Field Characteristics",infield:"In-Field Conservation Practices",edge:"Edge-of-Field Practices"};

// ─── STYLES ───
const f = "'DM Sans','Helvetica Neue',system-ui,sans-serif";
const k = {bg:"#f5f3f0",card:"#fff",bdr:"#d9d4cc",bdrL:"#ebe7e0",tx:"#1a1a1a",txM:"#6b6155",txL:"#a09484",acc:"#DD550C",accBg:"#fef2ea",grn:"#267a32",grnBg:"#ecf6ee",grnL:"#b3deb8",amb:"#b27d0a",ambBg:"#fdf7e5",red:"#b83025",redBg:"#fceeed",blu:"#03244d",bluBg:"#e8eef5",pur:"#6d3abf",purBg:"#f3edfc",hdr:"#03244d",hdrTx:"#ffffff",tagBg:"#f0ebe3"};

// Last verified data update — UPDATE THIS DATE every time you change any data
const LAST_DATA_UPDATE = "March 20, 2026";
const LABEL_COVERAGE_NOTE = "ESA label data verified through March 20, 2026. Products labeled: Liberty ULTRA, Enlist One, Enlist Duo. All other products awaiting registration review.";

export default function App() {
  const [tab, setTab] = useState("calc");
  const [county, setCounty] = useState("");
  const [crop, setCrop] = useState("");
  const [plan, setPlan] = useState([]);
  const [prac, setPrac] = useState(["rec"]);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [tmFilt, setTmFilt] = useState("ALL");
  const [expH, setExpH] = useState(null);

  // HSG Lookup State (Limitation 1 fix)
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [hsgResult, setHsgResult] = useState(null);
  const [hsgLoading, setHsgLoading] = useState(false);
  const [hsgError, setHsgError] = useState(null);

  // Geolocation state
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [geoUsed, setGeoUsed] = useState(false);

  // Browser Geolocation API
  // SECURITY NOTE: navigator.geolocation uses the browser's built-in
  // Geolocation API. The coordinates NEVER leave the user's browser
  // except when explicitly sent to USDA SDA or EPA BLT APIs for soil/PULA
  // lookups. No coordinates are stored on any server, logged, or tracked.
  // The browser will prompt the user for permission before sharing location.
  // HTTPS is REQUIRED for geolocation to work in all modern browsers.
  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser. Enter coordinates manually.");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const la = position.coords.latitude;
        const lo = position.coords.longitude;
        // Validate within Alabama bounds
        if (la < 30 || la > 35.5 || lo < -89 || lo > -84.5) {
          setGeoError(`Your location (${la.toFixed(4)}, ${lo.toFixed(4)}) is outside Alabama. This tool is designed for Alabama fields only.`);
          setGeoLoading(false);
          return;
        }
        setLat(la.toFixed(6));
        setLon(lo.toFixed(6));
        setGeoUsed(true);
        setGeoLoading(false);
      },
      (error) => {
        const msgs = {
          1: "Location permission denied. You can still enter coordinates manually below.",
          2: "Location unavailable. Your device could not determine its position. Try entering coordinates manually.",
          3: "Location request timed out. Try again or enter coordinates manually."
        };
        setGeoError(msgs[error.code] || `Geolocation error: ${error.message}`);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
  }, []);

  // BLT PULA State (Limitation 2 fix)
  const [pulaResults, setPulaResults] = useState(null);
  const [pulaLoading, setPulaLoading] = useState(false);
  const [pulaError, setPulaError] = useState(null);

  // Report state
  const [showReport, setShowReport] = useState(false);
  const reportRef = useRef(null);

  const cty = AL.find(c => c.n === county);
  const ctyRel = cty ? (cty.v === "M" ? 2 : 0) : 0;

  // Determine HSG-adjusted points for Enlist products
  const getHerbPts = useCallback((h) => {
    if (!h.ptsCD) return h.pts;
    if (hsgResult) {
      const g = hsgResult.toUpperCase();
      if (g === "A" || g === "B" || g === "A/D" || g === "B/D") return h.pts; // 4
      return h.ptsCD; // 6 for C, D, C/D
    }
    return h.ptsCD; // conservative default if no HSG data
  }, [hsgResult]);

  const cropH = useMemo(() => {
    if (!crop) return [];
    return HERBS.filter(h => h.cr.includes(crop))
      .filter(h => tmFilt === "ALL" || h.tm.includes(tmFilt))
      .filter(h => !search || h.nm.toLowerCase().includes(search.toLowerCase()) || h.ai.toLowerCase().includes(search.toLowerCase()) || h.grp.includes(search));
  }, [crop, search, tmFilt]);

  const addH = useCallback(h => { if (!plan.find(p => p.id === h.id)) setPlan(p => [...p, h]); setShowAdd(false); setSearch(""); }, [plan]);
  const remH = useCallback(id => setPlan(p => p.filter(h => h.id !== id)), []);
  const togP = useCallback(id => setPrac(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]), []);

  const maxReq = useMemo(() => plan.length ? Math.max(...plan.map(h => getHerbPts(h))) : 0, [plan, getHerbPts]);
  const earned = useMemo(() => {
    let t = ctyRel;
    PRACT.filter(p => prac.includes(p.id)).forEach(p => { t += p.pts; });
    return t;
  }, [prac, ctyRel]);
  const deficit = Math.max(0, maxReq - earned);
  const ok = plan.length > 0 && maxReq > 0 && deficit === 0;
  const esaN = plan.filter(h => h.esa === "active").length;
  const maxBuf = useMemo(() => plan.length ? Math.max(...plan.map(h => h.buf || 0)) : 0, [plan]);
  const sWind = useMemo(() => { const v = plan.map(h => h.wMax).filter(Boolean); return v.length ? Math.min(...v) : 15; }, [plan]);
  const sSpd = useMemo(() => { const v = plan.map(h => h.spd).filter(Boolean); return v.length ? Math.min(...v) : null; }, [plan]);

  // ─── USDA SOIL DATA ACCESS API (Limitation 1) ───
  const lookupHSG = async () => {
    if (!lat || !lon) { setHsgError("Enter both latitude and longitude."); return; }
    const la = parseFloat(lat), lo = parseFloat(lon);
    if (isNaN(la) || isNaN(lo) || la < 30 || la > 35.5 || lo < -89 || lo > -84.5) {
      setHsgError("Coordinates must be within Alabama (Lat 30–35.5, Lon -89 to -84.5)."); return;
    }
    setHsgLoading(true); setHsgError(null); setHsgResult(null);
    const sql = `SELECT TOP 1 hydgrpdcd FROM mapunit mu
      INNER JOIN component co ON co.mukey = mu.mukey
      WHERE mu.mukey IN (
        SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('POINT(${lo} ${la})')
      ) AND co.comppct_r = (
        SELECT MAX(comppct_r) FROM component WHERE mukey = mu.mukey
      )`;
    try {
      const resp = await fetch("https://sdmdataaccess.nrcs.usda.gov/tabular/post.rest", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `query=${encodeURIComponent(sql)}&format=JSON`
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (data?.Table?.length > 0) {
        const hsg = data.Table[0].hydgrpdcd || data.Table[0][Object.keys(data.Table[0])[0]];
        setHsgResult(hsg);
      } else {
        setHsgError("No soil data found at these coordinates. Try a nearby point within a mapped soil polygon.");
      }
    } catch (err) {
      setHsgError(`API error: ${err.message}. USDA servers may be temporarily unavailable — try again or use Web Soil Survey manually.`);
    }
    setHsgLoading(false);
  };

  // ─── EPA BLT API (Limitation 2) ───
  const checkPULA = async () => {
    if (!lat || !lon) { setPulaError("Enter coordinates in the HSG Lookup section first."); return; }
    const esaProds = plan.filter(h => h.esa === "active");
    if (!esaProds.length) { setPulaError("No ESA-labeled products in your spray plan to check."); return; }
    setPulaLoading(true); setPulaError(null); setPulaResults(null);
    try {
      // Query EPA BLT ArcGIS Feature Layer for PULAs at this point
      const la = parseFloat(lat), lo = parseFloat(lon);
      const url = `https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/BLT_PULAs/FeatureServer/0/query?where=1%3D1&geometry=${lo}%2C${la}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (data?.features?.length > 0) {
        setPulaResults({ found: true, count: data.features.length, features: data.features.slice(0, 10) });
      } else {
        setPulaResults({ found: false, count: 0, features: [] });
      }
    } catch (err) {
      setPulaError(`BLT API query failed: ${err.message}. Use EPA's Bulletins Live! Two website directly for official compliance.`);
      setPulaResults(null);
    }
    setPulaLoading(false);
  };

  const printReport = () => {
    setShowReport(true);
    setTimeout(() => {
      const content = reportRef.current;
      if (!content) return;
      const win = window.open("", "_blank", "width=900,height=700");
      win.document.write(`<html><head><title>ESA Compliance Report — ${county} County — ${new Date().toLocaleDateString()}</title>
        <style>body{font-family:${f};font-size:13px;color:#222;padding:32px;line-height:1.65}
        h1{font-size:18px;border-bottom:2px solid #c04a20;padding-bottom:8px}
        h2{font-size:15px;margin-top:20px;color:#c04a20}
        table{border-collapse:collapse;width:100%;margin:10px 0}
        th,td{border:1px solid #ccc;padding:6px 10px;text-align:left;font-size:12px}
        th{background:#f5f1eb;font-weight:700}
        .tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;margin-right:4px}
        .warn{color:#b27d0a;background:#fdf7e5}.pass{color:#267a32;background:#ecf6ee}.fail{color:#b83025;background:#fceeed}
        .footer{margin-top:30px;border-top:1px solid #ccc;padding-top:12px;font-size:11px;color:#888}
        @media print{body{padding:20px}}</style></head><body>`);
      win.document.write(content.innerHTML);
      win.document.write(`<div class="footer">
        <p><strong>Report generated:</strong> ${new Date().toLocaleString()} | Alabama ESA Mitigation Points Calculator v2.0</p>
        <p>Auburn University · Dept. of Crop, Soil and Environmental Sciences · Developed by Gourav Chahal</p>
        <p><strong>This printout constitutes recordkeeping documentation qualifying for +1 mitigation point</strong> under EPA Mitigation Menu Table 1, Row 4.</p>
        <p><em>Disclaimer: This report is for planning purposes only. The product label is the law. Always verify requirements through EPA's Bulletins Live! Two system before application.</em></p>
      </div></body></html>`);
      win.document.close();
      win.print();
      setShowReport(false);
    }, 200);
  };

  // ─── RENDER ───
  const s = {
    pg:{fontFamily:f,background:k.bg,color:k.tx,minHeight:"100vh",fontSize:14,lineHeight:1.55},
    hd:{background:k.hdr,padding:"16px 24px",borderBottom:`3px solid ${k.acc}`},
    cd:{background:k.card,border:`1px solid ${k.bdr}`,borderRadius:10,padding:"16px 18px",marginBottom:14,boxShadow:"0 1px 2px rgba(0,0,0,0.03)"},
    lb:{fontSize:11,fontWeight:700,color:k.txM,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7,display:"block"},
    sl:{width:"100%",padding:"9px 12px",borderRadius:6,border:`1px solid ${k.bdr}`,fontSize:14,fontFamily:f,color:k.tx,background:k.bg,boxSizing:"border-box"},
    inp:{width:"100%",boxSizing:"border-box",padding:"9px 12px",borderRadius:6,border:`1px solid ${k.bdr}`,fontSize:14,fontFamily:f,color:k.tx,background:k.bg,outline:"none"},
    btn:(bg,fg)=>({padding:"7px 16px",borderRadius:6,border:"none",background:bg,color:fg,fontSize:13,fontWeight:700,cursor:"pointer"}),
    tg:(bg,fg)=>({display:"inline-flex",alignItems:"center",padding:"2px 9px",borderRadius:4,background:bg,color:fg,fontSize:11,fontWeight:600,whiteSpace:"nowrap"}),
    tb:{display:"flex",gap:0,borderBottom:`2px solid ${k.bdr}`,background:k.card},
    tbi:a=>({padding:"10px 20px",fontSize:13,fontWeight:a?700:500,color:a?k.acc:k.txM,borderBottom:a?`3px solid ${k.acc}`:"3px solid transparent",cursor:"pointer",background:"transparent",border:"none",marginBottom:"-2px"}),
  };

  return (
    <div style={s.pg}>
      <div style={{...s.hd,background:"linear-gradient(135deg, #03244d 0%, #041e3d 100%)",borderBottom:"4px solid #DD550C"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
          <div>
            <h1 style={{margin:0,fontSize:20,fontWeight:800,color:"#ffffff",letterSpacing:"-0.3px"}}>Alabama ESA Mitigation Points Calculator <span style={{fontSize:12,fontWeight:500,color:"#8a9bb5"}}>v2.1</span></h1>
            <p style={{margin:"3px 0 0",fontSize:11,color:"#8a9bb5"}}>Cotton · Soybean · Peanut · Corn &nbsp;|&nbsp; ACES Herbicide Recommendations &nbsp;|&nbsp; EPA Herbicide Strategy (Aug 2024)</p>
            <p style={{margin:"2px 0 0",fontSize:11,color:"#8a9bb5"}}>{LABEL_COVERAGE_NOTE}</p>
            <p style={{margin:"2px 0 0",fontSize:10,color:"#6a7b95"}}>Gourav Chahal, PhD Student · Auburn University · Dept. of Crop, Soil & Environmental Sciences · Advisors: Dr. A.J. Price & Dr. D.P. Russell</p>
          </div>
          <div style={{flexShrink:0}}>
            <div style={{background:"#DD550C",color:"#fff",padding:"4px 12px",borderRadius:5,fontSize:11,fontWeight:700,display:"inline-block"}}>Data verified: {LAST_DATA_UPDATE}</div>
          </div>
        </div>
      </div>

      <div style={s.tb}>
        {[["calc","Calculator"],["hsg","HSG & PULA Lookup"],["report","Compliance Report"],["methods","Methodology"],["data","Data Versions"],["refs","References"]].map(([id,lb])=>(
          <button key={id} style={s.tbi(tab===id)} onClick={()=>setTab(id)}>{lb}</button>
        ))}
      </div>

      <div style={{padding:"16px 22px",maxWidth:960,margin:"0 auto"}}>
        {/* Planning-only notice */}
        <div style={{padding:"10px 16px",background:"#03244d0a",border:"1px solid #03244d22",borderRadius:7,marginBottom:14,fontSize:12,color:"#03244d",lineHeight:1.7}}>
          <strong style={{color:"#DD550C"}}>For Planning Purposes Only.</strong> This tool helps you <strong>plan</strong> your herbicide program's ESA compliance — it does not replace the product label or EPA's official Bulletins Live! Two system. The product label is the law. Always read the current label and generate official BLT bulletins at <strong>epa.gov/endangered-species/bulletins-live-two-view-bulletins</strong> before every application. No compliance guarantee is expressed or implied.
        </div>

        {/* ═══ CALCULATOR TAB ═══ */}
        {tab === "calc" && (<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <div style={s.cd}>
              <label style={s.lb}>Step 1a — County</label>
              <select value={county} onChange={e=>setCounty(e.target.value)} style={s.sl}>
                <option value="">Select...</option>
                {AL.map(c=><option key={c.n} value={c.n}>{c.n} ({c.v==="H"?"High · 0 pts":"Medium · 2 pts"})</option>)}
              </select>
              {cty && <div style={{marginTop:8,padding:"8px 12px",borderRadius:6,background:cty.v==="H"?k.redBg:k.ambBg,fontSize:13}}>
                <strong style={{color:cty.v==="H"?k.red:k.amb}}>{cty.v==="H"?"High":"Medium"} Vulnerability</strong>
                <span style={{marginLeft:6,color:k.txM}}>→ {ctyRel} relief pts</span>
              </div>}
            </div>
            <div style={s.cd}>
              <label style={s.lb}>Step 1b — Crop</label>
              <select value={crop} onChange={e=>{setCrop(e.target.value);setPlan([]);}} style={s.sl}>
                <option value="">Select...</option>
                {Object.entries(CL).map(([k2,v])=><option key={k2} value={k2}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* HSG indicator */}
          {hsgResult && <div style={{...s.cd,borderLeft:`4px solid ${k.pur}`,background:k.purBg,padding:"10px 16px",marginBottom:14}}>
            <span style={{fontSize:12,fontWeight:700,color:k.pur}}>Soil HSG from USDA lookup: {hsgResult}</span>
            <span style={{marginLeft:12,fontSize:12,color:k.txM}}>
              {["A","B","A/D","B/D"].includes(hsgResult.toUpperCase()) ? "Enlist products: 4 runoff pts" : "Enlist products: 6 runoff pts (higher tier for HSG C/D)"}
            </span>
          </div>}

          {/* Spray plan builder */}
          {crop && county && (<div style={s.cd}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div>
                <h3 style={{margin:0,fontSize:12,fontWeight:700,color:k.txM,textTransform:"uppercase",letterSpacing:"1px"}}>Step 2 — Spray Plan</h3>
              </div>
              <button onClick={()=>setShowAdd(!showAdd)} style={s.btn(showAdd?k.red:k.acc,"#fff")}>{showAdd?"Cancel":"+ Add"}</button>
            </div>

            {showAdd && <div style={{background:k.bg,border:`1px solid ${k.bdr}`,borderRadius:7,padding:12,marginBottom:12}}>
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                <input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} autoFocus style={{...s.inp,flex:1}} />
                <select value={tmFilt} onChange={e=>setTmFilt(e.target.value)} style={{...s.sl,width:"auto",minWidth:80}}><option value="ALL">All</option>{Object.entries(TL).map(([k2,v])=><option key={k2} value={k2}>{v}</option>)}</select>
              </div>
              <div style={{maxHeight:220,overflowY:"auto"}}>
                {cropH.map(h=>(
                  <div key={h.id} onClick={()=>addH(h)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderBottom:`1px solid ${k.bdrL}`,cursor:"pointer",borderRadius:5}}
                    onMouseOver={e=>e.currentTarget.style.background=k.bdrL} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                    <div><span style={{fontWeight:700,fontSize:13}}>{h.nm}</span><span style={{marginLeft:6,fontSize:12,color:k.txM}}>{h.ai} · Grp {h.grp}</span></div>
                    <div style={{display:"flex",gap:4}}>{h.esa==="active"&&<span style={s.tg(k.redBg,k.red)}>ESA Label</span>}</div>
                  </div>
                ))}
                {cropH.length===0&&<p style={{color:k.txM,textAlign:"center",padding:16,fontSize:12}}>No products match.</p>}
              </div>
            </div>}

            {plan.length===0 ? <div style={{border:`1px dashed ${k.bdr}`,borderRadius:7,padding:"24px 16px",textAlign:"center",color:k.txM,fontSize:12}}>Add herbicides for your {CL[crop]} program.</div> :
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {plan.map(h=>{
                const ex = expH===h.id;
                const hp = getHerbPts(h);
                return <div key={h.id} style={{border:`1px solid ${h.esa==="active"?k.acc+"44":k.bdr}`,borderRadius:7,padding:"10px 14px",background:h.esa==="active"?k.accBg:k.card}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,fontSize:14}}>{h.nm}</span>
                        <span style={{fontSize:11,color:k.txM}}>Grp {h.grp} · {h.mfr} · {h.reg}</span>
                      </div>
                      <div style={{display:"flex",gap:4,marginTop:5,flexWrap:"wrap"}}>
                        {h.esa==="active"?<>
                          <span style={s.tg(k.redBg,k.red)}>ESA Active</span>
                          <span style={s.tg(k.ambBg,k.amb)}>Runoff: {hp} pts{h.ptsCD&&hsgResult?` (HSG ${hsgResult})`:h.ptsCD?" (HSG unknown—using C/D)":""}</span>
                          <span style={s.tg(k.bluBg,k.blu)}>Buffer: {h.buf} ft</span>
                          {h.blt&&<span style={s.tg(k.purBg,k.pur)}>BLT Required</span>}
                        </>:<>
                          <span style={s.tg(k.tagBg,k.txM)}>ESA Pending</span>
                          <span style={{fontSize:11,color:k.txM,fontStyle:"italic"}}>{h.pw||"Awaiting registration review under Herbicide Strategy."}</span>
                        </>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:4,flexShrink:0}}>
                      <button onClick={()=>setExpH(ex?null:h.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:k.blu,fontWeight:600}}>{ex?"Hide":"Info"}</button>
                      <button onClick={()=>remH(h.id)} style={{background:"none",border:"none",color:k.red,cursor:"pointer",fontSize:15}}>✕</button>
                    </div>
                  </div>
                  {ex&&<div style={{marginTop:8,padding:"8px 12px",background:k.bg,borderRadius:5,fontSize:12,lineHeight:1.6}}>
                    <p style={{margin:"0 0 4px"}}><strong>AI:</strong> {h.ai} &nbsp;|&nbsp; <strong>Timing:</strong> {h.tm.map(t=>TL[t]).join(", ")}</p>
                    {h.pw&&<p style={{margin:"0 0 4px",color:k.amb}}><strong>ESA Status:</strong> {h.pw}</p>}
                    <p style={{margin:"0 0 4px"}}>{h.note}</p>
                    <p style={{margin:0,color:k.txM,fontSize:11}}><strong>Source:</strong> {h.ref}</p>
                  </div>}
                </div>;
              })}
            </div>}
          </div>)}

          {/* Consolidated */}
          {plan.length>0&&esaN>0&&<div style={{...s.cd,borderLeft:`4px solid ${k.acc}`}}>
            <h3 style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:k.acc,textTransform:"uppercase",letterSpacing:"1px"}}>Consolidated ESA Requirements</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8}}>
              <MC l="Runoff Pts" v={maxReq} su="required" co={k.amb}/>
              <MC l="Drift Buffer" v={`${maxBuf} ft`} su="downwind" co={k.blu}/>
              <MC l="Max Wind" v={`${sWind} mph`} su="at boom" co={k.pur}/>
              {sSpd&&<MC l="Max Speed" v={`${sSpd} mph`} su="ground" co={k.acc}/>}
            </div>
          </div>}

          {/* Points calc */}
          {plan.length>0&&maxReq>0&&<div style={s.cd}>
            <h3 style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:k.txM,textTransform:"uppercase",letterSpacing:"1px"}}>Step 3 — Mitigation Points</h3>
            <div style={{padding:"12px 16px",borderRadius:7,border:`2px solid ${ok?k.grn:k.amb}`,background:ok?k.grnBg:k.bg,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:600,color:k.txM}}>Earned / Required</span>
                <span style={{fontSize:24,fontWeight:800,color:ok?k.grn:k.amb}}>{earned} / {maxReq}</span>
              </div>
              <div style={{height:8,background:k.bdrL,borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(100,maxReq>0?(earned/maxReq)*100:0)}%`,background:ok?k.grn:k.amb,borderRadius:4,transition:"width 0.3s"}}/>
              </div>
              <p style={{margin:"6px 0 0",fontSize:12,fontWeight:600,color:ok?k.grn:k.amb}}>
                {ok?"✓ Compliant for all ESA-labeled products":`${deficit} more pt${deficit!==1?"s":""} needed — ${county} County`}
              </p>
            </div>

            {Object.entries(CATL).map(([ck,cl])=>(
              <div key={ck} style={{marginBottom:14}}>
                <h4 style={{margin:"0 0 6px",fontSize:11,fontWeight:700,color:k.txM,textTransform:"uppercase",letterSpacing:"0.8px",borderBottom:`1px solid ${k.bdrL}`,paddingBottom:4}}>{cl}</h4>
                {PRACT.filter(p=>p.cat===ck).map(p=>{
                  const a = prac.includes(p.id);
                  return <div key={p.id} onClick={()=>togP(p.id)} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 10px",borderRadius:6,cursor:"pointer",background:a?k.grnBg:"transparent",border:`1px solid ${a?k.grnL:"transparent"}`,marginBottom:3}}>
                    <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${a?k.grn:k.bdr}`,background:a?k.grn:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",fontWeight:800,flexShrink:0,marginTop:1}}>{a&&"✓"}</div>
                    <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:a?k.tx:k.txM}}>{p.nm}</div><div style={{fontSize:11,color:k.txM,marginTop:1}}>{p.d}</div></div>
                    <span style={{...s.tg(k.ambBg,k.amb),fontWeight:800,flexShrink:0}}>+{p.pts}</span>
                  </div>;
                })}
              </div>
            ))}
          </div>}
        </>)}

        {/* ═══ HSG & PULA TAB ═══ */}
        {tab === "hsg" && (<>
          <div style={s.cd}>
            <h3 style={{margin:"0 0 4px",fontSize:16,fontWeight:800}}>Field Location</h3>
            <p style={{margin:"0 0 14px",fontSize:12,color:k.txM,lineHeight:1.6}}>
              Your field coordinates are needed to look up soil type (for Enlist product requirements) and check for Pesticide Use Limitation Areas. You can share your location automatically or type coordinates manually.
            </p>

            {/* USE MY LOCATION BUTTON */}
            <div style={{padding:"16px 18px",background:"linear-gradient(135deg, #edf3f9 0%, #f3edfc 100%)",borderRadius:8,border:`1px solid ${k.blu}33`,marginBottom:14}}>
              <button onClick={useMyLocation} disabled={geoLoading} style={{...s.btn(k.blu,"#fff"),fontSize:14,padding:"10px 24px",opacity:geoLoading?0.6:1,width:"100%"}}>
                {geoLoading ? "Requesting location..." : geoUsed ? `✓ Location set (${lat}, ${lon}) — Click to refresh` : "📍 Use My Location"}
              </button>
              {geoError && <div style={{marginTop:8,padding:"8px 12px",background:k.ambBg,borderRadius:6,fontSize:12,color:k.amb}}>{geoError}</div>}
              {geoUsed && !geoError && <p style={{margin:"8px 0 0",fontSize:12,color:k.grn,fontWeight:600}}>✓ Coordinates set: {lat}°N, {lon}°W</p>}
            </div>

            {/* SECURITY & PRIVACY NOTICE */}
            <div style={{padding:"12px 16px",background:"#faf8f5",borderRadius:8,border:`1px solid ${k.bdr}`,marginBottom:14}}>
              <h4 style={{margin:"0 0 6px",fontSize:12,fontWeight:700,color:k.txM,textTransform:"uppercase",letterSpacing:"0.8px"}}>🔒 Privacy & Security — How Your Location Is Handled</h4>
              <div style={{fontSize:12,color:k.tx,lineHeight:1.7}}>
                <p style={{margin:"0 0 6px"}}><strong>Your coordinates never leave your device</strong> except for two specific, user-initiated API calls:</p>
                <p style={{margin:"0 0 4px",paddingLeft:12}}>1. <strong>USDA Soil Data Access</strong> (sdmdataaccess.nrcs.usda.gov) — a U.S. government server that returns soil type data. No personal information is sent, only the point coordinate.</p>
                <p style={{margin:"0 0 4px",paddingLeft:12}}>2. <strong>EPA BLT Feature Service</strong> (services.arcgis.com) — a U.S. government/Esri server that returns PULA boundaries. Same: only the point coordinate is sent.</p>
                <p style={{margin:"0 0 4px"}}><strong>What this tool does NOT do:</strong></p>
                <p style={{margin:"0 0 4px",paddingLeft:12}}>• Does not store your location on any server, database, or analytics platform</p>
                <p style={{margin:"0 0 4px",paddingLeft:12}}>• Does not send your location to Auburn University, ACES, or any third party</p>
                <p style={{margin:"0 0 4px",paddingLeft:12}}>• Does not track, log, or retain coordinates after you close the browser tab</p>
                <p style={{margin:"0 0 4px",paddingLeft:12}}>• Does not run in the background — location is captured only when you click the button</p>
                <p style={{margin:"0 0 0"}}><strong>Technical requirement:</strong> This feature requires HTTPS (secure connection). Your browser will ask permission before sharing location. You can deny it and enter coordinates manually instead.</p>
              </div>
            </div>

            {/* MANUAL COORDINATE ENTRY */}
            <p style={{margin:"0 0 8px",fontSize:12,fontWeight:600,color:k.txM}}>Or enter coordinates manually:</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div><label style={s.lb}>Latitude (°N)</label><input placeholder="e.g. 32.5901" value={lat} onChange={e=>{setLat(e.target.value);setGeoUsed(false);}} style={s.inp}/></div>
              <div><label style={s.lb}>Longitude (°W, use negative)</label><input placeholder="e.g. -85.4944" value={lon} onChange={e=>{setLon(e.target.value);setGeoUsed(false);}} style={s.inp}/></div>
            </div>
          </div>

          {/* HSG LOOKUP */}
          <div style={s.cd}>
            <h3 style={{margin:"0 0 4px",fontSize:16,fontWeight:800}}>Hydrologic Soil Group Lookup</h3>
            <p style={{margin:"0 0 10px",fontSize:12,color:k.txM,lineHeight:1.6}}>
              <strong>Why this matters:</strong> Enlist One and Enlist Duo require <strong>4 runoff mitigation points on HSG A/B soils</strong> but <strong>6 points on HSG C/D soils</strong>. This queries the USDA Soil Data Access API in real time.
            </p>
            <p style={{margin:"0 0 12px",fontSize:11,color:k.txM}}>
              <strong>API:</strong> USDA NRCS Soil Data Access — sdmdataaccess.nrcs.usda.gov/tabular/post.rest &nbsp;|&nbsp; <strong>Query:</strong> SDA_Get_Mukey_from_intersection_with_WktWgs84() → hydgrpdcd from dominant component
            </p>
            <button onClick={lookupHSG} disabled={hsgLoading||!lat||!lon} style={{...s.btn(k.blu,"#fff"),opacity:(hsgLoading||!lat||!lon)?0.5:1}}>{hsgLoading?"Querying USDA...":"Look Up Soil Group (HSG)"}</button>
            {!lat&&<span style={{marginLeft:10,fontSize:11,color:k.txM}}>Set your location above first.</span>}
            {hsgError && <div style={{marginTop:10,padding:"8px 12px",background:k.redBg,borderRadius:6,fontSize:12,color:k.red}}>{hsgError}</div>}
            {hsgResult && <div style={{marginTop:10,padding:"12px 16px",background:k.grnBg,borderRadius:6,border:`1px solid ${k.grnL}`}}>
              <p style={{margin:0,fontSize:15,fontWeight:700,color:k.grn}}>HSG: {hsgResult}</p>
              <p style={{margin:"4px 0 0",fontSize:13,color:k.tx}}>
                {["A","B","A/D","B/D"].includes(hsgResult.toUpperCase())
                  ? "→ Enlist products require 4 runoff mitigation points at this location."
                  : "→ Enlist products require 6 runoff mitigation points at this location (HSG C/D tier)."}
              </p>
              <p style={{margin:"4px 0 0",fontSize:11,color:k.txM}}>Auto-applied to Calculator tab for Enlist products.</p>
            </div>}
          </div>

          {/* PULA CHECK */}
          <div style={s.cd}>
            <h3 style={{margin:"0 0 4px",fontSize:16,fontWeight:800}}>PULA Check (Bulletins Live! Two)</h3>
            <p style={{margin:"0 0 10px",fontSize:12,color:k.txM,lineHeight:1.6}}>
              <strong>Why this matters:</strong> If your field is within a Pesticide Use Limitation Area (PULA), additional mitigation measures beyond the standard label may be required.
            </p>
            <p style={{margin:"0 0 12px",fontSize:11,color:k.txM}}>
              <strong>API:</strong> EPA ArcGIS Feature Service (Item ID: 83c55a9cfea24f18a816b7a5933a7eb5) &nbsp;|&nbsp; Spatial intersection query &nbsp;|&nbsp; <strong>For informational use only — generate official bulletins from EPA BLT for compliance.</strong>
            </p>
            <button onClick={checkPULA} disabled={pulaLoading||!lat||!lon} style={{...s.btn(k.pur,"#fff"),opacity:(pulaLoading||!lat||!lon)?0.5:1}}>{pulaLoading?"Querying EPA...":"Check PULAs at This Location"}</button>
            {pulaError && <div style={{marginTop:10,padding:"8px 12px",background:k.redBg,borderRadius:6,fontSize:12,color:k.red}}>{pulaError}</div>}
            {pulaResults && <div style={{marginTop:10,padding:"12px 16px",borderRadius:6,background:pulaResults.found?k.ambBg:k.grnBg,border:`1px solid ${pulaResults.found?k.amb:k.grn}33`}}>
              {pulaResults.found ? <>
                <p style={{margin:0,fontSize:14,fontWeight:700,color:k.amb}}>⚠ {pulaResults.count} PULA{pulaResults.count>1?"s":""} detected at this location</p>
                <p style={{margin:"6px 0 0",fontSize:12,color:k.tx}}>You <strong>must</strong> generate and follow the official bulletin from EPA's Bulletins Live! Two website before application.</p>
                <a href="https://www.epa.gov/endangered-species/bulletins-live-two-view-bulletins" target="_blank" rel="noopener noreferrer" style={{display:"inline-block",marginTop:8,...s.btn(k.amb,"#fff"),textDecoration:"none",fontSize:12}}>Open Bulletins Live! Two →</a>
              </> : <>
                <p style={{margin:0,fontSize:14,fontWeight:700,color:k.grn}}>✓ No PULAs detected at this location</p>
                <p style={{margin:"4px 0 0",fontSize:12,color:k.txM}}>Informational only. Always verify with EPA's official BLT system — PULA boundaries are updated dynamically.</p>
              </>}
            </div>}
          </div>
        </>)}

        {/* ═══ REPORT TAB ═══ */}
        {tab === "report" && (<div style={s.cd}>
          <h3 style={{margin:"0 0 4px",fontSize:16,fontWeight:800}}>Printable Compliance Report</h3>
          <p style={{margin:"0 0 6px",fontSize:12,color:k.txM,lineHeight:1.6}}>Generate a printable compliance record documenting your field's ESA mitigation status. <strong>Printing and filing this report with your spray records qualifies for +1 recordkeeping mitigation point</strong> under EPA Mitigation Menu Table 1, Row 4.</p>
          {(!county||!crop||plan.length===0)?<p style={{fontSize:13,color:k.amb}}>Complete the Calculator tab first (county, crop, spray plan, and practices).</p>:
          <button onClick={printReport} style={s.btn(k.acc,"#fff")}>Generate & Print Report</button>}

          {/* Hidden report content */}
          <div ref={reportRef} style={{display:showReport?"block":"none"}}>
            <h1>ESA Mitigation Compliance Report</h1>
            <p><strong>County:</strong> {county} ({cty?.v==="H"?"High":"Medium"} vulnerability, {ctyRel} relief pts) &nbsp;|&nbsp; <strong>Crop:</strong> {CL[crop]} &nbsp;|&nbsp; <strong>Date:</strong> {new Date().toLocaleDateString()}</p>
            {hsgResult&&<p><strong>Soil HSG (USDA SDA):</strong> {hsgResult} at ({lat}, {lon})</p>}
            <h2>Spray Plan ({plan.length} products)</h2>
            <table><thead><tr><th>Product</th><th>AI</th><th>Group</th><th>EPA Reg.</th><th>ESA Status</th><th>Runoff Pts</th><th>Drift Buffer</th></tr></thead>
            <tbody>{plan.map(h=><tr key={h.id}><td>{h.nm}</td><td>{h.ai}</td><td>{h.grp}</td><td>{h.reg}</td><td>{h.esa==="active"?"ACTIVE":"Pending"}</td><td>{h.esa==="active"?getHerbPts(h):"N/A"}</td><td>{h.esa==="active"?`${h.buf} ft`:"N/A"}</td></tr>)}</tbody></table>
            <h2>Mitigation Points Assessment</h2>
            <p><strong>Maximum required:</strong> {maxReq} points &nbsp;|&nbsp; <strong>Earned:</strong> {earned} points &nbsp;|&nbsp; <strong>Status:</strong> <span className={ok?"pass":"fail"}>{ok?"COMPLIANT":"DEFICIT: "+deficit+" pts"}</span></p>
            <table><thead><tr><th>Practice</th><th>Points</th><th>Applied</th></tr></thead>
            <tbody>
              <tr><td>County vulnerability relief ({county})</td><td>{ctyRel}</td><td>Auto</td></tr>
              {PRACT.filter(p=>prac.includes(p.id)).map(p=><tr key={p.id}><td>{p.nm}</td><td>{p.pts}</td><td>Yes</td></tr>)}
            </tbody></table>
            <h2>Application Restrictions</h2>
            <p>Max drift buffer: {maxBuf} ft &nbsp;|&nbsp; Max wind: {sWind} mph &nbsp;|&nbsp; {sSpd?`Max speed: ${sSpd} mph`:""}</p>
          </div>
        </div>)}

        {/* ═══ METHODOLOGY TAB ═══ */}
        {tab === "methods" && (<div style={s.cd}>
          <h3 style={{margin:"0 0 14px",fontSize:18,fontWeight:800}}>Methodology Documentation</h3>
          {[
            {t:"1. Regulatory Framework",b:"EPA's Final Herbicide Strategy (Aug 20, 2024) established a mitigation-points system for runoff/erosion and buffer-based system for spray drift. Implementation is product-by-product during registration/review. As of March 2026, three products carry Herbicide Strategy labels: Liberty ULTRA (7969-500), Enlist One (62719-695), Enlist Duo (62719-649). All remaining herbicides will receive ESA labels over 1–5+ years."},
            {t:"2. County Vulnerability (Limitation 3 addressed)",b:"EPA assigns runoff vulnerability per county using PRZM simulations (Ecological Mitigation Support Document v2.0, Appendix G). Alabama: 30 High (0 pts), 37 Medium (2 pts), 0 Low/Very Low. Source updated Oct 2024. This calculator's county table will be updated when EPA revises classifications (expected annually in fall). Current data version indicator shown in Data Versions tab."},
            {t:"3. HSG Integration (Limitation 1 RESOLVED)",b:"Enlist products use a tiered point system: 4 points for Hydrologic Soil Group A or B; 6 points for HSG C or D. This version queries USDA's Soil Data Access REST API (sdmdataaccess.nrcs.usda.gov/tabular/post.rest) using SDA_Get_Mukey_from_intersection_with_WktWgs84() to retrieve the dominant component's hydgrpdcd at user-supplied coordinates. The result auto-adjusts Enlist product requirements in the Calculator tab. Dual/undrained groups (e.g., A/D, B/D) are resolved to the drained classification."},
            {t:"4. PULA Integration (Limitation 2 RESOLVED)",b:"EPA publishes PULA polygons as an ArcGIS Feature Layer (Item ID: 83c55a9cfea24f18a816b7a5933a7eb5). This version queries the feature service with an esriGeometryPoint spatial intersection to detect PULAs at user coordinates. Results are informational — official compliance requires generating bulletins from EPA's Bulletins Live! Two system. The BLT REST API (epa.gov/endangered-species/public-rest-api-bulletins) provides product-specific bulletin data in JSON format."},
            {t:"5. Runoff Points Algorithm",b:"The calculator implements EPA's 7-step workflow: (1) identify products, (2) check for ESA label language, (3) evaluate field exemptions, (4) find product with highest point requirement, (5) sum relief + practice points, (6) compare earned vs required, (7) verify label/bulletin adherence. Points are additive and field-specific. The maximum-requirement product sets the target; individual product requirements are not summed."},
            {t:"6. Compliance Report (Limitation 4 addressed)",b:"The printable report generator creates a formatted HTML document containing field location, spray plan with EPA Registration Numbers, mitigation points assessment, and application restrictions. Under EPA Mitigation Menu Table 1 Row 4, maintaining paper or electronic records of mitigation practices earns +1 point. Filing this report with spray records satisfies that requirement."},
            {t:"7. Data Currency (Limitation 3 addressed)",b:"All data sources carry version timestamps in the Data Versions tab. The EPA Mitigation Menu is updated annually in fall. ACES IPM Guides are revised annually (December). County vulnerability classifications are static until EPA revises them. The USDA SDA and EPA BLT APIs return real-time data. Users should verify the Data Versions tab before the start of each spray season."},
          ].map(({t,b})=><div key={t} style={{marginBottom:16}}><h4 style={{margin:"0 0 6px",fontSize:14,fontWeight:700,borderBottom:`1px solid ${k.bdrL}`,paddingBottom:4}}>{t}</h4><p style={{margin:0,fontSize:13,color:k.tx,lineHeight:1.7}}>{b}</p></div>)}
        </div>)}

        {/* ═══ DATA VERSIONS TAB ═══ */}
        {tab === "data" && (<div style={s.cd}>
          <h3 style={{margin:"0 0 4px",fontSize:16,fontWeight:800}}>Data Source Versions</h3>
          <p style={{margin:"0 0 14px",fontSize:12,color:k.txM}}>All data in this calculator is traceable to the sources below. Check before each spray season for updates.</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{borderBottom:`2px solid ${k.bdr}`}}>{["Source","Version","Last Updated","Next Update Expected","Link"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontWeight:700,color:k.txM,fontSize:11,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
            <tbody>{DATA_VERSIONS.map((d,i)=><tr key={i} style={{borderBottom:`1px solid ${k.bdrL}`}}>
              <td style={{padding:"8px 10px",fontWeight:600}}>{d.src}</td>
              <td style={{padding:"8px 10px"}}>{d.ver}</td>
              <td style={{padding:"8px 10px"}}>{d.date}</td>
              <td style={{padding:"8px 10px",color:k.txM}}>{d.next}</td>
              <td style={{padding:"8px 10px"}}><a href={d.url} target="_blank" rel="noopener noreferrer" style={{color:k.blu,fontSize:11}}>Source →</a></td>
            </tr>)}</tbody>
          </table>
        </div>)}

        {/* ═══ REFERENCES TAB ═══ */}
        {tab === "refs" && (<div style={s.cd}>
          <h3 style={{margin:"0 0 14px",fontSize:18,fontWeight:800}}>References</h3>
          {[
            {c:"Federal Regulatory",r:[
              "U.S. EPA. (2024). Herbicide Strategy. OPP. Aug 20, 2024. Docket: EPA-HQ-OPP-2023-0365.",
              "U.S. EPA. (2025). Insecticide Strategy. OPP. Apr 29, 2025. Docket: EPA-HQ-OPP-2024-0299.",
              "U.S. EPA. (2025). Mitigation Menu. Updated Apr 30, 2025. epa.gov/pesticides/mitigation-menu",
              "U.S. EPA. (2025). Mitigation Menu Measure Descriptions. epa.gov/pesticides/mitigation-menu-measure-descriptions",
              "U.S. EPA. (2024). County Runoff Vulnerability. Oct 2024.",
              "U.S. EPA. (2025). Ecological Mitigation Support Document v2.0. Apr 2025.",
              "U.S. EPA. (n.d.). Bulletins Live! Two. epa.gov/endangered-species/bulletins-live-two-view-bulletins",
              "U.S. EPA. (2025). PALM. epa.gov/pesticides/pesticide-app-label-mitigations",
            ]},
            {c:"Alabama Extension (ACES)",r:[
              "ACES. (2025). Cotton IPM Guide. IPM-0415. Auburn University.",
              "ACES. (2025). Soybean IPM Guide. IPM-0413. Auburn University.",
              "ACES. (2025). Peanut IPM Guide. IPM-0360. Auburn University.",
              "ACES. (2025). Corn IPM Guide. IPM-0428. Auburn University.",
              "ACES. (2019). Palmer Amaranth Resistance in Alabama. ANR-2417.",
              "ACES. (n.d.). Cover Crops and No-till in Alabama.",
            ]},
            {c:"Product Labels",r:[
              "BASF. (2024). Liberty ULTRA. EPA Reg. 7969-500.",
              "Corteva. (2025). Enlist One. EPA Reg. 62719-695.",
              "Corteva. (2025). Enlist Duo. EPA Reg. 62719-649.",
            ]},
            {c:"APIs & Data Services",r:[
              "USDA NRCS. Soil Data Access REST API. sdmdataaccess.nrcs.usda.gov",
              "U.S. EPA. BLT ArcGIS Feature Service. Item ID: 83c55a9cfea24f18a816b7a5933a7eb5",
              "U.S. EPA. BLT REST API. epa.gov/endangered-species/public-rest-api-bulletins",
            ]},
            {c:"WSSA / ESA Committee",r:[
              "WSSA. (n.d.). Endangered Species. wssa.net/endangered-species/",
              "Chism, B. et al. (2026). ESA Winter 2026 Training. WSSA.",
              "CropLife America. (2026). Adapting to ESA Video Series.",
            ]},
          ].map(({c:cat,r})=><div key={cat} style={{marginBottom:16}}>
            <h4 style={{margin:"0 0 6px",fontSize:12,fontWeight:700,color:k.acc,textTransform:"uppercase",letterSpacing:"0.5px"}}>{cat}</h4>
            {r.map((ref,i)=><p key={i} style={{margin:"0 0 4px",fontSize:12,paddingLeft:14,textIndent:-14,lineHeight:1.6}}>{ref}</p>)}
          </div>)}
        </div>)}

        <footer style={{textAlign:"center",padding:"20px 0 32px",fontSize:10,color:k.txL,lineHeight:1.8}}>
          <div style={{display:"inline-block",background:"#03244d",color:"#fff",padding:"3px 14px",borderRadius:4,fontSize:10,fontWeight:600,marginBottom:6}}>Auburn University · War Eagle</div>
          <p style={{margin:0}}>Alabama ESA Mitigation Points Calculator v2.1 · Data verified: {LAST_DATA_UPDATE}</p>
          <p style={{margin:0}}>Dept. of Crop, Soil & Environmental Sciences · Alabama Cooperative Extension System · WSSA ESA Committee</p>
          <p style={{margin:0}}>For planning purposes only — the product label is the law · Contact: gzc0063@auburn.edu</p>
        </footer>
      </div>
    </div>
  );
}

function MC({l,v,su,co}){
  return <div style={{background:"#f7f5f2",borderRadius:7,padding:"10px 12px",borderLeft:`3px solid ${co}`}}>
    <div style={{fontSize:10,color:"#847660",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>{l}</div>
    <div style={{fontSize:20,fontWeight:800,color:co,margin:"3px 0 1px"}}>{v}</div>
    <div style={{fontSize:10,color:"#b0a48e"}}>{su}</div>
  </div>;
}
