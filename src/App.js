import { useState, useMemo, useCallback, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════════
   ALABAMA ESA MITIGATION POINTS CALCULATOR v2.1
   
   ENHANCEMENTS OVER v1.0:
   ✓ Limitation 1 RESOLVED: USDA Soil Data Access API integration
     for Hydrologic Soil Group (HSG) lookup by lat/lon coordinates.
     Enlist products auto-adjust: 4 pts (HSG A/B) vs 6 pts (HSG C/D).
   ✓ Limitation 2 RESOLVED: EPA Bulletins Live! Two REST API
     integration for real-time PULA checks by product + location.
   ✓ Limitation 3 RESOLVED: Data versioning panel with source dates,
     update schedule, and direct links to authoritative sources.
   ✓ Limitation 4 ADDRESSED: Printable compliance report generator —
     the printed report, kept on file as the paper or electronic record
     of the mitigations employed, supports the +1 mitigation tracking
     point under EPA Mitigation Menu Table 1 (EPA verification §1(d);
     printing alone, without maintaining the record, does not earn it).
   
   DATA SOURCES:
   - EPA Final Herbicide Strategy (Aug 20, 2024)
   - EPA Mitigation Menu (updated Apr 30, 2025)
   - EPA County Runoff Vulnerability (Oct 2024)
   - ACES IPM Guides 2025 (IPM-0415, -0413, -0360, -0428; 2026 cotton IPM-0415-A is insect-control only)
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
  {id:"liberty-ultra",nm:"Liberty ULTRA",ai:"Glufosinate-P-ammonium (L-glufosinate)",grp:"10",mfr:"BASF",reg:"7969-500",cr:["C","S","N"],tm:["POST"],esa:"active",pts:3,ptsCD:null,buf:10,wMax:15,wMin:3,spd:null,drop:"Medium (ASABE S572.1)",blt:true,note:"First herbicide with Herbicide Strategy label (Oct 2024). Resolved isomer of glufosinate — new AI, not same as Liberty 280 SL. Buffer reducible to 0 ft with DRA/hooded sprayer/windbreak. Medium-to-coarse droplets required. Do not apply to saturated soils or during rain. Buffer 10 ft ground, 50 ft aerial.",ref:"EPA Reg. 7969-500 (PPLS); ACES IPM-0415"},
  {id:"enlist-one",nm:"Enlist One",ai:"2,4-D choline salt",grp:"4",mfr:"Corteva",reg:"62719-695",cr:["C","S","N"],tm:["POST"],esa:"active",pts:4,ptsCD:6,buf:30,wMax:15,wMin:3,wMinAdv:true,spd:null,drop:"XC or UC nozzles only (enlist.com/nozzles)",blt:true,restr:["Do not aerially apply this product (label, Jan 25, 2024).","Enlist trait required for over-the-top use on cotton, soybean and corn.","Do not apply when rainfall is expected within 48 hours or soils are saturated."],note:"Enlist trait required for OTT use on cotton/soybean/corn. 4 credits HSG A/B soils, 6 credits HSG C/D soils. BLT check within 6 months. 30-ft downwind buffer. Wind: do not apply above 15 mph; label recommends 3-10 mph for best results (the 3 mph lower bound is a recommendation, not a ban). No application when rainfall expected within 48 hrs or soils saturated. Registered in 34 states incl. Alabama through Jan 11, 2029. Label uses 'credits' (functionally = points).",ref:"EPA Reg. 62719-695; EPA-accepted label Jan 25, 2024 (PPLS); EPA registration page"},
  {id:"enlist-duo",nm:"Enlist Duo",ai:"2,4-D choline salt + Glyphosate dimethylammonium salt",grp:"4+9",mfr:"Corteva",reg:"62719-649",cr:["C","S","N"],tm:["POST"],esa:"active",pts:4,ptsCD:6,buf:30,wMax:15,wMin:3,wMinAdv:true,spd:null,drop:"XC or UC nozzles only (enlist.com/nozzles)",blt:true,restr:["Do not aerially apply this product (label, Jan 25, 2024).","Enlist trait required for over-the-top use.","Cotton: do not apply after first white bloom. Soybean: apply through R1, do not apply after R1.","Tank-mix only with products tested and listed at Enlist.com/TankMix."],note:"Same ESA requirements as Enlist One. Wind: do not apply above 15 mph; label recommends 3-10 mph for best results (the 3 mph lower bound is a recommendation, not a ban). Enlist trait required. Tank-mix only with products tested and listed at Enlist.com/TankMix; avoid more than 2 in-crop applications of Enlist Duo plus any other Group 4 or 9 herbicide per season unless mixed with another mode of action. Cotton: do not apply after first white bloom. Soybean: apply through R1, do not apply after R1.",ref:"EPA Reg. 62719-649; EPA-accepted label, specimen rev. June 24, 2024 (PPLS); ACES IPM-0413"},
  {id:"engenia",nm:"Engenia",ai:"Dicamba (BAPMA salt)",grp:"4",mfr:"BASF",reg:"7969-507",cr:["C","S"],tm:["POST"],esa:"active",pts:3,ptsCD:null,ptsPULA:6,buf:240,wMax:10,wMin:3,spd:15,blt:true,restr:["Qualified VRA must be tank-mixed with every application (Feb 6, 2026 registration terms).","Temperature: do not apply if the forecast high is 95°F or above on the day of or day after treatment; if 85°F to below 95°F, apply to no more than 50% of your dicamba-tolerant soybean and cotton acres in the county.","Growth stage: do not apply after R1 in soybean — maximum two applications of 0.5 lb a.e./A each.","Annual dicamba-specific training is mandatory in Alabama.","Sandy soils: do not apply to sand soils with less than 3% organic matter where groundwater is shallow.","Restricted Use pesticide; registration expires Feb 6, 2028."],note:"Over-the-top dicamba, EPA-registered Feb 2026 for the 2026–2027 seasons only (label dated Feb 6, 2026); registration expires Feb 6, 2028 and is under legal challenge. Restricted Use. Minimum 3 runoff/erosion mitigation points outside a PULA, 6 points inside a PULA. Drift buffer up to 240 ft. 1 lb dicamba per season cap; temperature cutoffs apply. Wind 3-10 mph; ground speed max 15 mph. Label: do not apply to sand soils with less than 3% organic matter where groundwater is shallow. Approved in Alabama for 2026–2027. See the label and BLT bulletin before every application.",ref:"EPA Reg. 7969-507; EPA label Feb 6, 2026 (PPLS); Auburn Extension May 13, 2026"},
  {id:"stryax",nm:"Stryax",ai:"Dicamba (diglycolamine salt)",grp:"4",mfr:"Bayer",reg:"264-1241",cr:["C","S"],tm:["POST"],esa:"active",pts:3,ptsCD:null,ptsPULA:6,buf:240,wMax:10,wMin:3,spd:15,blt:true,restr:["Qualified VRA must be tank-mixed with every application (Feb 6, 2026 registration terms).","Temperature: do not apply if the forecast high is 95°F or above on the day of or day after treatment; if 85°F to below 95°F, apply to no more than 50% of your dicamba-tolerant soybean and cotton acres in the county.","Growth stage: do not apply after R1 in soybean — maximum two applications of 0.5 lb a.e./A each.","Annual dicamba-specific training is mandatory in Alabama.","Sandy soils: do not apply to sand soils with less than 3% organic matter where groundwater is shallow.","Restricted Use pesticide; registration expires Feb 6, 2028."],note:"Over-the-top dicamba (replacement for XtendiMax), EPA-registered Feb 2026 for the 2026–2027 seasons only (label dated Feb 6, 2026); registration expires Feb 6, 2028 and is under legal challenge. Restricted Use. Minimum 3 runoff/erosion mitigation points outside a PULA, 6 points inside a PULA. Drift buffer up to 240 ft. 1 lb dicamba per season cap; temperature cutoffs apply. Wind 3-10 mph; ground speed max 15 mph. Label: do not apply to sand soils with less than 3% organic matter where groundwater is shallow. Approved in Alabama for 2026–2027. See the label and BLT bulletin before every application.",ref:"EPA Reg. 264-1241; EPA label Feb 6, 2026 (PPLS); Auburn Extension May 13, 2026"},
  {id:"tavium",nm:"Tavium Plus VaporGrip Technology",ai:"Dicamba (diglycolamine salt) + S-metolachlor",grp:"4+15",mfr:"Syngenta",reg:"100-1753",cr:["C","S"],tm:["POST"],esa:"active",pts:3,ptsCD:null,ptsPULA:6,buf:240,wMax:10,wMin:3,spd:15,blt:true,restr:["Qualified VRA must be tank-mixed with every application (Feb 6, 2026 registration terms).","Temperature: do not apply if the forecast high is 95°F or above on the day of or day after treatment; if 85°F to below 95°F, apply to no more than 50% of your dicamba-tolerant soybean and cotton acres in the county.","Growth stage: do not apply after V4 in soybean. The June 12 cutoffs on the label are Iowa/Indiana-specific, not Alabama.","Annual dicamba-specific training is mandatory in Alabama.","Sandy soils: do not use on sand or loamy sand soils; no more than one application on coarse-textured soils.","Restricted Use pesticide; registration expires Feb 6, 2028."],note:"Over-the-top dicamba + S-metolachlor premix, EPA-registered Feb 2026 for the 2026–2027 seasons only (label dated Feb 6, 2026); registration expires Feb 6, 2028 and is under legal challenge. Restricted Use. Minimum 3 runoff/erosion mitigation points outside a PULA, 6 points inside a PULA. Drift buffer up to 240 ft. 1 lb dicamba per season cap; temperature cutoffs apply. Wind 3-10 mph; ground speed max 15 mph. Label: do not use on sand or loamy sand soils; no more than one application on coarse-textured soils. Approved in Alabama for 2026–2027. See the label and BLT bulletin before every application.",ref:"EPA Reg. 100-1753; EPA label Feb 6, 2026 (PPLS); Auburn Extension May 13, 2026"},

  {"id":"voraxor","nm":"Voraxor","ai":"Trifludimoxazin + Saflufenacil","grp":"14","mfr":"BASF","reg":"7969-495","cr":["S","N"],"tm":["PRE","BURN"],"esa":"active","pts":6,"ptsCD":null,"buf":15,"wMax":15,"spd":15,"blt":true,"note":"6 runoff points. Corn and soybean in this tool; the label also covers legume vegetables, small grains, sorghum and postharvest/fallow, not cotton or peanut. Do not apply after crop emergence. MSO adjuvant system required for optimum burndown; follow label additive directions. BLT check within 6 months. Drift buffers: 110 ft aerial, 15 ft ground; maximum ground speed 15 mph. Alabama-registered per NPIRS, checked Nov 18, 2026, PR0012464, expires 2027. Ninth Circuit petition filed Aug 28, 2026, Case No. 26-5590; whether the opening brief was filed by Nov 16, 2026, the tool does not know — CourtListener was blocked and a PACER check is needed.","ref":"EPA Reg. 7969-495; EPA label June 30, 2026 (PPLS)"},
  {"id":"convintro","nm":"Convintro","ai":"Diflufenican","grp":"12","mfr":"Bayer","reg":"264-1213","cr":["S","N"],"tm":["PRE"],"esa":"active","pts":2,"ptsCD":null,"buf":0,"wMax":15,"wMin":3,"spd":null,"blt":true,"note":"2 runoff points for all field crops on the label. Preplant or preemergence for field corn and soybean. BLT check within 6 months. Alabama-registered per NPIRS, checked Nov 18, 2026, PR0012068, expires 2027. Wind 3–15 mph (label: sustained wind must register between 3 and 15 mph). No drift buffer or ground-speed limit verified from the June 30, 2026 label — check the label before use.","ref":"EPA Reg. 264-1213; EPA label June 30, 2026 (PPLS)"},
  {"id":"empera","nm":"Empera","ai":"Epyrifenacil","grp":"14","mfr":"Valent","reg":"59639-262","cr":["S","N"],"tm":["PRE","BURN"],"esa":"active","pts":0,"ptsCD":null,"buf":0,"wMax":null,"spd":null,"blt":true,"ptsPULA":3,"note":"0 runoff points generally; 3 points inside its 6 PULAs (VSAP), per EPA final decision memo, docket EPA-HQ-OPP-2022-0354, not on the label itself. Memo copy read on goldbergsegalla.com, not regulations.gov; the official regulations.gov copy still needs filing. Preplant for field corn; preplant or preemergence for soybean — follow label timing restrictions. Corn and soybean in this tool; the label also covers canola, wheat, fallow and non-crop bare ground. BLT check within 6 months. Alabama-registered per NPIRS, checked Nov 18, 2026, PR0012600, expires Dec 31, 2026; 2027 renewal not filed as of Nov 17, 2026. Re-check NPIRS in January 2027; Alabama registration for 2027 is NOT CONFIRMED. Buffer, wind and speed limits are not modelled here (0/null are placeholders, not verified absence of limits); check the label before use. PULA points now apply when the PULA check finds this field inside a PULA.","ref":"EPA Reg. 59639-262; EPA label Aug 28, 2026 (PPLS); EPA final decision memo, docket EPA-HQ-OPP-2022-0354"},

  // Cotton
  {id:"cotoran",nm:"Cotoran 4L",ai:"Fluometuron",grp:"7",mfr:"ADAMA",reg:"66222-181",cr:["C"],tm:["PRE","POST"],esa:"pending",pts:0,buf:0,pw:"Registration review: draft risk assessments published Mar 8, 2021; no interim decision found. EPA publishes no ESA-label timeline for fluometuron.",note:"Standard cotton PRE. Sandy soils: the label restriction \"do not use on sandy or coarse-textured soil of less than 1% organic matter\" is Arizona and New Mexico only — it does not apply in Alabama, so Cotoran does not block sandy-soil points in this tool. In Alabama, use the lower rate on light silt and sandy soils low in organic matter (label, Apr 15, 2016). Groundwater advisory: where aquifers are 30 ft or less deep, do not apply where soils are Hydrologic Group A (label). The tool does not track aquifer depth, so check this before applying on HSG A soils.",ref:"ACES IPM-0415; EPA Reg. 66222-181 label Apr 15, 2016 (PPLS)"},
  {id:"prowl",nm:"Prowl H2O",ai:"Pendimethalin",grp:"3",mfr:"BASF",reg:"241-418",cr:["C","S","P","N"],tm:["PRE","PPI"],esa:"pending",pts:0,buf:0,pw:"Registration review: proposed interim decision Sept 22, 2017; final interim decision May 1, 2018 (before Herbicide Strategy). No current ESA mitigation points required. EPA publishes no ESA-label timeline for pendimethalin.",note:"Microencapsulated. 1.0–2.1 pt/A PRE.",ref:"ACES IPM-0415; IPM-0360"},
  {id:"brake",nm:"Brake F",ai:"Fluridone",grp:"12",mfr:"SePRO",reg:"67690-78",cr:["C"],tm:["PRE"],esa:"pending",pts:0,buf:0,pw:"Registration-review label mitigation for fluridone issued Dec 30, 2024; that is registration-review mitigation, not a Herbicide Strategy ESA-points label. EPA publishes no ESA-label timeline for fluridone.",note:"Cotton only. 4–8 fl oz/A. Residual broadleaf and grass control.",ref:"ACES IPM-0415"},
  {id:"valor",nm:"Valor SX",ai:"Flumioxazin",grp:"14",mfr:"Valent",reg:"59639-99",cr:["C","S","P"],tm:["PRE","BURN"],esa:"pending",pts:0,buf:0,pw:"Registration review ongoing (interim decision Apr 28, 2021). EPA issued a registration-review mitigation label amendment Sep 17, 2026; whether it contains Herbicide Strategy ESA points is not yet confirmed. EPA publishes no ESA-label timeline for flumioxazin.",note:"PPO inhibitor. 2–3 oz/A PRE cotton. Key Palmer amaranth tool.",ref:"ACES IPM-0415; IPM-0413"},
  {id:"reflex",nm:"Reflex",ai:"Fomesafen",grp:"14",mfr:"Syngenta",reg:"100-993",cr:["C","S"],tm:["PRE"],esa:"pending",pts:0,buf:0,pw:"Registration review: final interim decision Aug 9, 2018 (before Herbicide Strategy finalized). EPA publishes no ESA-label timeline for fomesafen.",note:"PPO PRE. Cotton 1 pt/A. 18-month plant-back restriction.",ref:"ACES IPM-0415"},
  {id:"warrant",nm:"Warrant",ai:"Acetochlor",grp:"15",mfr:"Bayer",reg:"524-591",cr:["C","S","N"],tm:["PRE","POST"],esa:"pending",pts:0,buf:0,pw:"Registration review in progress; no EPA interim or proposed interim decision for acetochlor found. Acetochlor is high-volume. EPA publishes no ESA-label timeline for acetochlor.",note:"Group 15 residual. 48–64 fl oz/A.",ref:"ACES IPM-0415"},
  {id:"dual",nm:"Dual II Magnum",ai:"S-metolachlor",grp:"15",mfr:"Syngenta",reg:"100-818",cr:["C","S","P","N"],tm:["PRE","POST"],esa:"pending",pts:0,buf:0,pw:"Interim registration review decision in force by Nov 10, 2021 (exact date not established). EPA publishes no ESA-label timeline for S-metolachlor.",note:"Rate varies by crop. Peanut: at least one OTT application recommended.",ref:"ACES IPM-0415; IPM-0360"},
  {id:"zidua",nm:"Zidua SC",ai:"Pyroxasulfone",grp:"15",mfr:"BASF",reg:"7969-374",cr:["C","S","P","N"],tm:["PRE"],esa:"pending",pts:0,buf:0,pw:"Relatively new registration (2013). First registration review not yet due. EPA publishes no ESA-label timeline for pyroxasulfone.",note:"Group 15 PRE. Cotton 2.5–3.5 fl oz/A.",ref:"ACES IPM-0415"},
  {id:"diuron",nm:"Direx 4L",ai:"Diuron",grp:"7",mfr:"ADAMA",reg:"66222-54",cr:["C"],tm:["PRE","DIR"],esa:"pending",pts:0,buf:0,pw:"Registration review: proposed interim decision Apr 28, 2022 (docket EPA-HQ-OPP-2015-0077); no final interim decision date established. EPA publishes no ESA-label timeline for diuron.",note:"Cotton PRE or directed POST. Not over-the-top.",ref:"ACES IPM-0415"},
  {id:"rup3",nm:"Roundup PowerMAX 3",ai:"Glyphosate",grp:"9",mfr:"Bayer",reg:"524-659",cr:["C","S","N"],tm:["POST","BURN"],esa:"pending",pts:0,buf:0,pw:"Interim review decision Jan 2020. Extremely complex ESA analysis (most-used herbicide globally). Ongoing litigation delays final decision. EPA publishes no ESA-label timeline for glyphosate.",note:"RR varieties required POST. DO NOT rely on glyphosate alone—resistance at 57/58 AL locations.",ref:"ACES ANR-2417; IPM-0415"},
  {id:"gram",nm:"Gramoxone SL 3.0",ai:"Paraquat",grp:"22",mfr:"Syngenta",reg:"100-1652",cr:["C","S","P","N"],tm:["BURN","DIR"],esa:"pending",pts:0,buf:0,pw:"Restricted Use Pesticide with separate regulatory track. Interim review decision Oct 22, 2020. EPA publishes no ESA-label timeline for paraquat.",note:"Restricted Use. Burndown or directed. Peanut: at-cracking 8–12 oz within 28 DAP.",ref:"ACES IPM-0415; IPM-0360"},
  {id:"caparol",nm:"Caparol 4L",ai:"Prometryn",grp:"5",mfr:"Syngenta",reg:"100-620",cr:["C"],tm:["DIR"],esa:"pending",pts:0,buf:0,pw:"Older, low-volume product. Low EPA priority. EPA publishes no ESA-label timeline for prometryn.",note:"Cotton directed spray only. 1.2–2.4 pt/A.",ref:"ACES IPM-0415"},
  {id:"select",nm:"Select Max",ai:"Clethodim",grp:"1",mfr:"Valent",reg:"59639-132",cr:["C","S","P"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Registration review in progress. Moderate-volume graminicide. EPA publishes no ESA-label timeline for clethodim.",note:"Grass-only POST. 9–16 fl oz/A + COC.",ref:"ACES IPM-0415"},

  // Soybean
  {id:"prefix",nm:"Prefix",ai:"S-metolachlor + Fomesafen",grp:"15+14",mfr:"Syngenta",reg:"100-1268",cr:["S"],tm:["PRE"],esa:"pending",pts:0,buf:0,pw:"Premix — will inherit ESA requirements when either S-metolachlor or fomesafen completes review. EPA publishes no ESA-label timeline for either AI. (EPA incorporated fomesafen registration-review mitigation into this product's label Sep 20, 2019.)",note:"Premix PRE 2 pt/A. Broad-spectrum Palmer amaranth + grass residual.",ref:"ACES IPM-0413"},
  {id:"fierce",nm:"Fierce EZ",ai:"Flumioxazin + Pyroxasulfone",grp:"14+15",mfr:"Valent",reg:"59639-237",cr:["S"],tm:["PRE"],esa:"pending",pts:0,buf:0,pw:"Premix — tied to flumioxazin registration review (ongoing, interim decision Apr 28, 2021). EPA publishes no ESA-label timeline for flumioxazin or pyroxasulfone.",note:"Premix PRE 3.75–5 fl oz/A. Two SOA for resistance management.",ref:"ACES IPM-0413"},
  {id:"auth",nm:"Authority First",ai:"Sulfentrazone + Cloransulam",grp:"14+2",mfr:"FMC",reg:"279-3246",cr:["S"],tm:["PRE"],esa:"pending",pts:0,buf:0,pw:"Sulfentrazone registration review in progress. EPA publishes no ESA-label timeline for sulfentrazone.",note:"PRE 6.4–8 oz/A. Check for ALS-resistant Palmer amaranth.",ref:"ACES IPM-0413"},
  {id:"flex",nm:"Flexstar",ai:"Fomesafen",grp:"14",mfr:"Syngenta",reg:"100-1101",cr:["S"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Same AI as Reflex. Registration review: final interim decision Aug 9, 2018 (before Herbicide Strategy). EPA publishes no ESA-label timeline for fomesafen.",note:"PPO POST 1–1.5 pt/A. Apply before weeds >4 in. Tank-mix with Group 15.",ref:"ACES IPM-0413"},
  {id:"blazer",nm:"Ultra Blazer",ai:"Acifluorfen",grp:"14",mfr:"UPL",reg:"70506-60",cr:["S"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Registration review: proposed interim decisions for sodium acifluorfen and bentazon published Apr 21, 2016; no final interim decision date established. EPA publishes no ESA-label timeline for acifluorfen.",note:"PPO POST. Thorough coverage required.",ref:"ACES IPM-0413"},
  {id:"classic",nm:"Classic",ai:"Chlorimuron-ethyl",grp:"2",mfr:"AMVAC",reg:"5481-681",cr:["S"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Low-volume ALS herbicide declining in use due to widespread resistance. Low EPA priority. EPA publishes no ESA-label timeline for chlorimuron-ethyl.",note:"ALS POST. DO NOT use where ALS-resistant Palmer confirmed.",ref:"ACES IPM-0413; EPA Reg. 5481-681 (AMVAC, PPLS; formerly Corteva 352-436, transferred Mar 12, 2020)"},
  {id:"sharpen",nm:"Sharpen",ai:"Saflufenacil",grp:"14",mfr:"BASF",reg:"7969-278",cr:["S"],tm:["PRE","BURN"],esa:"pending",pts:0,buf:0,pw:"Registered 2010 — first review not yet due. EPA publishes no ESA-label timeline for saflufenacil.",note:"PPO burndown/PRE. Effective on horseweed.",ref:"ACES IPM-0413"},

  // Peanut
  {id:"strong",nm:"Strongarm",ai:"Diclosulam",grp:"2",mfr:"Corteva",reg:"62719-288",cr:["P"],tm:["PRE","PPI"],esa:"pending",pts:0,buf:0,pw:"Peanut-specific product with small national market. Low EPA priority. EPA publishes no ESA-label timeline for diclosulam.",note:"ALS PRE peanut 0.3–0.45 oz/A. Half-rate with Dual Magnum recommended (Dr. Steve Li).",ref:"ACES IPM-0360"},
  {id:"cadre",nm:"Cadre",ai:"Imazapic",grp:"2",mfr:"BASF",reg:"241-364",cr:["P"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Low-volume imidazolinone. Registration review not yet initiated under Herbicide Strategy. EPA publishes no ESA-label timeline for imazapic.",note:"ALS POST peanut 3 oz/A at 30–40 DAP. Tank-mix with bentazon for nutsedge.",ref:"ACES IPM-0360"},
  {id:"basag",nm:"Basagran",ai:"Bentazon",grp:"6",mfr:"BASF",reg:"7969-45",cr:["P","S"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Registration review: proposed interim decision Apr 21, 2016; no final interim decision date established. EPA publishes no ESA-label timeline for bentazon.",note:"POST for nutsedge and broadleaves. 1.5–2.0 pt/A.",ref:"ACES IPM-0360"},
  {id:"storm",nm:"Storm",ai:"Bentazon + Acifluorfen",grp:"6+14",mfr:"UPL",reg:"70506-59",cr:["P","S"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Registration-review label mitigation for sodium acifluorfen and sodium bentazon incorporated Sep 27, 2023; whether it includes Herbicide Strategy ESA points is not yet confirmed. EPA publishes no ESA-label timeline for this premix.",note:"Premix POST 1.0–1.5 pt/A.",ref:"ACES IPM-0360"},
  {id:"butyrac",nm:"Butyrac 200",ai:"2,4-DB",grp:"4",mfr:"Albaugh",reg:"42750-38",cr:["P","S"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Different active ingredient from 2,4-D (choline). Registration review: proposed interim decisions noticed July 31, 2019. EPA publishes no ESA-label timeline for 2,4-DB.",note:"Synthetic auxin safe on peanut/soybean. 6–10 fl oz/A for morningglory.",ref:"ACES IPM-0360"},
  {id:"outlook",nm:"Outlook",ai:"Dimethenamid-P",grp:"15",mfr:"BASF",reg:"7969-156",cr:["P","N"],tm:["PRE","POST"],esa:"pending",pts:0,buf:0,pw:"Registration review in progress. EPA publishes no ESA-label timeline for dimethenamid-P.",note:"Group 15 alternative. Peanut 12–21 fl oz/A.",ref:"ACES IPM-0360"},

  // Corn
  {id:"atra",nm:"AAtrex 4L",ai:"Atrazine",grp:"5",mfr:"Syngenta",reg:"100-497",cr:["N"],tm:["PRE","POST"],esa:"pending",pts:0,buf:0,pw:"EPA published updated proposed ESA surface-water mitigation Dec 2024; FWS final Biological Opinion dated Apr 10, 2026. No final atrazine ESA label found as of Nov 12, 2026. Over 900 listed species affected (EPA 2021 Biological Evaluation).",note:"RESTRICTED: 2.5 lb ai/A/yr max. No final ESA label as of Nov 12, 2026; EPA updated proposed mitigation Dec 2024; FWS final Biological Opinion Apr 10, 2026.",ref:"ACES IPM-0428"},
  {id:"acuron",nm:"Acuron",ai:"S-metolachlor+Atrazine+Mesotrione+Bicyclopyrone",grp:"15+5+27+27",mfr:"Syngenta",reg:"100-1466",cr:["N"],tm:["PRE"],esa:"pending",pts:0,buf:0,pw:"Contains atrazine — will inherit atrazine ESA requirements when finalized. No final atrazine ESA label as of Nov 12, 2026.",note:"4-way premix PRE 2.5–3 qt/A. Broadest corn residual. Contains atrazine.",ref:"ACES IPM-0428"},
  {id:"callisto",nm:"Callisto",ai:"Mesotrione",grp:"27",mfr:"Syngenta",reg:"100-1131",cr:["N"],tm:["PRE","POST"],esa:"pending",pts:0,buf:0,pw:"Registration review in progress. EPA accepted a registration-review mitigation label amendment Apr 9, 2026; whether it contains Herbicide Strategy ESA points is not yet confirmed. EPA publishes no ESA-label timeline for mesotrione.",note:"HPPD inhibitor. 6–7.7 fl oz/A. Tank-mix with atrazine for synergy.",ref:"ACES IPM-0428"},
  {id:"laudis",nm:"Laudis",ai:"Tembotrione",grp:"27",mfr:"Bayer",reg:"264-860",cr:["N"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Registered 2008 — first review not yet due. EPA publishes no ESA-label timeline for tembotrione.",note:"HPPD POST 3 fl oz/A + MSO. Excellent on Palmer amaranth.",ref:"ACES IPM-0428"},
  {id:"impact",nm:"Impact",ai:"Topramezone",grp:"27",mfr:"AMVAC",reg:"5481-524",cr:["N"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Registered 2006. Review in progress. EPA publishes no ESA-label timeline for topramezone.",note:"HPPD POST 0.75 fl oz/A + atrazine + MSO.",ref:"ACES IPM-0428"},
  {id:"accent",nm:"Accent Q",ai:"Nicosulfuron",grp:"2",mfr:"Corteva",reg:"352-773",cr:["N"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"ALS herbicide under registration review. EPA publishes no ESA-label timeline for nicosulfuron.",note:"ALS POST corn 0.67 oz/A. Johnsongrass control. Check for ALS resistance.",ref:"ACES IPM-0428"},
  {id:"status",nm:"Status",ai:"Dicamba + Diflufenzopyr",grp:"4+19",mfr:"BASF",reg:"7969-242",cr:["N"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Corn POST dicamba + diflufenzopyr product on a separate track from the vacated over-the-top dicamba registrations (the Feb 2024 vacatur did not concern Status). EPA publishes no ESA-label timeline for this product.",note:"Corn POST only 5–10 oz/A. Broadleaf control.",ref:"ACES IPM-0428"},
  {id:"halex",nm:"Halex GT",ai:"S-metolachlor+Glyphosate+Mesotrione",grp:"15+9+27",mfr:"Syngenta",reg:"100-1282",cr:["N"],tm:["POST"],esa:"pending",pts:0,buf:0,pw:"Premix containing glyphosate and S-metolachlor — will inherit ESA requirements from both AIs when reviews complete. EPA publishes no ESA-label timeline for either AI.",note:"3-way POST corn 3.6 pt/A. RR corn only.",ref:"ACES IPM-0428"},
];

// ─── MITIGATION PRACTICES ───
const PRACT = [
  // Relief
  {id:"rec",nm:"Mitigation tracking (paper or electronic record)",pts:1,cat:"relief",d:"Track the mitigation measures employed, on paper or electronically, at the field or farm level. Keeping this report on file as your record earns 1 point, provided the listed measures are actually in place. EPA Mitigation Menu Table 1 (Mitigation tracking).",ref:"EPA Mitigation Menu Table 1 (Mitigation tracking)"},
  {id:"nonirr",nm:"Non-irrigated (dryland) production",pts:3,cat:"infield",bcat:"infield",d:"Field is not irrigated at any time of the year. Most Alabama row crop acreage is dryland.",ref:"EPA Mitigation Menu Table 2, Irrigation water management"},
  {id:"sandy",nm:"Sandy soils — HSG A (≥90% sand, ≤10% clay)",pts:3,cat:"relief",d:"Hydrologic Soil Group A. Only if the product label does not prohibit application on sandy soils. Verify via USDA Web Soil Survey or the HSG Lookup tab below.",ref:"EPA Mitigation Menu Table 1, Predominantly sandy soils (HSG A tier)"},
  {id:"sandyB",nm:"Sandy soils — HSG B (50–90% sand, 10–20% clay)",pts:2,cat:"relief",d:"Hydrologic Soil Group B. Only if the product label does not prohibit application on sandy soils. Verify via USDA Web Soil Survey or the HSG Lookup tab below. EPA Mitigation Menu Table 1, Predominantly sandy soils (HSG B tier) — one sandy tier only; select HSG A or HSG B, not both.",ref:"EPA Mitigation Menu Table 1, Predominantly sandy soils (HSG B tier)"},
  {id:"slope3",nm:"Field slope ≤3%",pts:2,cat:"relief",d:"Average field slope ≤3%. Common in Black Belt, Tennessee Valley, Coastal Plain.",ref:"EPA Mitigation Menu Table 1"},
  {id:"eqip",nm:"EPA-Qualified Conservation Program (EQIP + CPS 595)",pts:9,cat:"relief",d:"USDA-NRCS EQIP incorporating Conservation Practice Standard 595 Pest Management Conservation System with the Additional Criteria for water quality, with the recommended practices implemented before or at the time of pesticide application. Meets the 9-point maximum — no additional practices needed. An EQIP contract without CPS 595 with Additional Criteria is a non-qualified conservation program (2 pts, Table 1 Row 5), not 9.",ref:"EPA Mitigation Menu Table 1, EPA-Qualified Conservation Program; NRCS CPS 595"},
  {id:"techspec",nm:"Working with a technical specialist",pts:1,cat:"relief",d:"Working with and following recommendations from a technical specialist who has training, education and/or experience in an agricultural discipline, water or soil conservation, or a relevant discipline, participates in continuing education in the area of expertise, and has experience advising on site-specific runoff/erosion plans using Table 2 measures. EPA Mitigation Menu Table 1 — select one: technical specialist or non-qualified conservation program, not both.",ref:"EPA Mitigation Menu Table 1, Technical specialist"},
  {id:"nonqual",nm:"Participating in a conservation program (non-qualified)",pts:2,cat:"relief",d:"Participating in a conservation program that provides advice from individuals meeting the technical-specialist characteristics, site-specific guidance for your crop and location, focuses on reducing or managing runoff/erosion, and documents enrollment and verifies implementation of the recommended measures. 2 points until EPA designates the program as EPA-Qualified. EPA Mitigation Menu Table 1 — select one: technical specialist or non-qualified program, not both; do not combine with the EPA-Qualified Conservation Program (the 9 points already include the 2 points for program participation).",ref:"EPA Mitigation Menu Table 1, Conservation program (non-qualified)"},

  // Application parameters (Table 2 — not counted toward the multi-category bonus)
  {id:"rate10",nm:"Annual application rate reduction (10 to <30% less)",pts:1,cat:"app",d:"Any application 10% to less than 30% less than the maximum labeled annual application rate. EPA Mitigation Menu Table 2, Annual application rate reduction — select one option only.",ref:"EPA Mitigation Menu Table 2, Annual application rate reduction"},
  {id:"rate30",nm:"Annual application rate reduction (30 to <60% less)",pts:2,cat:"app",d:"Any application 30% to less than 60% less than the maximum labeled annual application rate. EPA Mitigation Menu Table 2, Annual application rate reduction — select one option only.",ref:"EPA Mitigation Menu Table 2, Annual application rate reduction"},
  {id:"rate60",nm:"Annual application rate reduction (≥60% less)",pts:3,cat:"app",d:"Any application 60% or more less than the maximum labeled annual application rate. EPA Mitigation Menu Table 2, Annual application rate reduction — select one option only.",ref:"EPA Mitigation Menu Table 2, Annual application rate reduction"},
  {id:"pam",nm:"Anionic polyacrylamide (PAM)",pts:2,cat:"app",d:"Application of water-soluble formulations of anionic PAM. EPA Mitigation Menu Table 2, Anionic Polyacrylamide (PAM).",ref:"EPA Mitigation Menu Table 2, Anionic Polyacrylamide (PAM)"},
  {id:"prop10",nm:"Proportion of field NOT treated (10 to <30%)",pts:2,cat:"app",d:"Banded application, partial field treatment, ground precision sprayer, smart sprayer, or other specialized method leaving 10% to less than 30% of the field untreated. EPA Mitigation Menu Table 2, Reduction in the proportion of field treated — select one option only.",ref:"EPA Mitigation Menu Table 2, Reduction in the proportion of field treated"},
  {id:"prop30",nm:"Proportion of field NOT treated (30 to <60%)",pts:3,cat:"app",d:"Same methods, leaving 30% to less than 60% of the field untreated. EPA Mitigation Menu Table 2, Reduction in the proportion of field treated — select one option only.",ref:"EPA Mitigation Menu Table 2, Reduction in the proportion of field treated"},
  {id:"prop60",nm:"Proportion of field NOT treated (≥60%)",pts:4,cat:"app",d:"Same methods, leaving 60% or more of the field untreated. EPA Mitigation Menu Table 2, Reduction in the proportion of field treated — select one option only.",ref:"EPA Mitigation Menu Table 2, Reduction in the proportion of field treated"},
  {id:"soilinc",nm:"Soil incorporation (watering-in or mechanical)",pts:1,cat:"app",d:"Watering-in or mechanical incorporation before a runoff-producing event — a 50% or greater chance of rainfall of 1 inch or more within 48 hours of application, as predicted by NOAA/National Weather Service. EPA Mitigation Menu Table 2, Soil incorporation.",ref:"EPA Mitigation Menu Table 2, Soil incorporation"},

  // In-Field
  {id:"notill",nm:"No-till",pts:3,cat:"infield",bcat:"infield",d:"No-till, including perennial crops. ≥30% residue cover in place the entire time points are claimed. Cherokee Co. leads AL at 67% no-till; Lauderdale 63.5% (2022 Census of Agriculture). No-till plus reduced tillage make up 65.4% of tillage practices in selected southern states (2022 Census). EPA Mitigation Menu Table 2, Conservation tillage — select one option only.",ref:"EPA Mitigation Menu Table 2, Conservation tillage"},
  {id:"redtill",nm:"Reduced / strip / ridge / mulch tillage",pts:2,cat:"infield",bcat:"infield",d:"Reduced tillage, strip tillage, ridge tillage, or mulch tillage. ≥30% residue cover. Disk, chisel, or field cultivator without full inversion. EPA Mitigation Menu Table 2, Conservation tillage — select one option only.",ref:"EPA Mitigation Menu Table 2, Conservation tillage"},
  {id:"cc",nm:"Cover crop (annual) — with tillage",pts:1,cat:"infield",bcat:"infield",d:"Cover crop with tillage (terminated using a tillage operation, or tillage used between cover crop termination and planting). Alabama: 7.6% of cropland vs 4.7% nationally (2022 Census of Agriculture). EPA Mitigation Menu Table 2, Cover crop — select one option only; cannot combine with no-till or reduced tillage.",ref:"EPA Mitigation Menu Table 2, Cover crop or continuous ground cover"},
  {id:"ccnt",nm:"Cover crop + no-till (long duration)",pts:3,cat:"infield",bcat:"infield",d:"Fall-planted cover crop that overwinters and grows into spring (or perennial continuous cover), with no tillage. Highest in-field practice value. EPA Mitigation Menu Table 2, Cover crop — select one option only.",ref:"EPA Mitigation Menu Table 2, Cover crop or continuous ground cover"},
  {id:"contour",nm:"Contour farming / cross-slope tillage",pts:2,cat:"infield",bcat:"infield",d:"Rows on or near contour to reduce runoff velocity.",ref:"EPA Table 2"},
  {id:"resv",nm:"Reservoir tillage / furrow diking",pts:3,cat:"infield",bcat:"infield",d:"Small dams in furrows capturing rainfall. Common in AL cotton on Coastal Plain soils.",ref:"EPA Table 2"},
  {id:"gww",nm:"Grassed waterway",pts:2,cat:"infield",bcat:"edge",d:"Grass-covered channel in natural drainage area.",ref:"EPA Mitigation Menu Table 2, Grassed waterway (2 pts)"},
  {id:"terr",nm:"Terraces",pts:2,cat:"infield",bcat:"infield",d:"Terrace farming: earth embankments reducing slope length and runoff.",ref:"EPA Mitigation Menu Table 2, Terrace farming (2 pts); NRCS CPS 600"},
  {id:"ccshort",nm:"Cover crop + no-till (short-term)",pts:2,cat:"infield",bcat:"infield",d:"Cover crop or continuous ground cover with no tillage, short-term cover crop. EPA Mitigation Menu Table 2, Cover crop — select one option only; defined as no tillage, so it cannot combine with no-till or reduced tillage (same conservative default as the long-duration tier).",ref:"EPA Mitigation Menu Table 2, Cover crop or continuous ground cover"},
  {id:"infstrip",nm:"Vegetative strips — in-field",pts:2,cat:"infield",bcat:"infield",d:"Inter-row vegetated strips, strip cropping or intercropping, alley cropping, prairie strips, contour buffer strips, or vegetative barrier in a contoured field. EPA Mitigation Menu Table 2, Vegetative Strips — In-Field.",ref:"EPA Mitigation Menu Table 2, Vegetative Strips — In-Field"},
  {id:"irriggen",nm:"Irrigation water management (general)",pts:2,cat:"infield",bcat:"infield",d:"Soil moisture sensors / evapotranspiration meters with center pivots and sprinklers; above-ground drip tape, drip emitters, or micro-sprinklers. EPA Mitigation Menu Table 2, Irrigation water management — select one option only (general management, or no irrigation).",ref:"EPA Mitigation Menu Table 2, Irrigation water management"},
  {id:"mulchA",nm:"Mulching — permeable artificial materials",pts:1,cat:"infield",bcat:"infield",d:"Mulching with permeable artificial materials (landscape fabrics, synthetic mulches). EPA Mitigation Menu Table 2, Mulching — select one option only.",ref:"EPA Mitigation Menu Table 2, Mulching"},
  {id:"mulchN",nm:"Mulching — natural materials",pts:3,cat:"infield",bcat:"infield",d:"Mulching with natural materials. EPA Mitigation Menu Table 2, Mulching — select one option only.",ref:"EPA Mitigation Menu Table 2, Mulching"},
  {id:"erobar",nm:"Erosion barriers (wattles, silt fences)",pts:2,cat:"infield",bcat:"infield",d:"Wattles or silt fences. EPA Mitigation Menu Table 2, Erosion barriers.",ref:"EPA Mitigation Menu Table 2, Erosion barriers"},

  // Edge-of-Field
  {id:"vfs10",nm:"Vegetative filter strip (20–30 ft)",pts:1,cat:"edge",bcat:"edge",d:"Permanent vegetation at field edge, 20–30 ft wide. Strips 10–19 ft wide earn 0 points (minimum 20 ft). EPA Mitigation Menu Table 2, VFS / field border — select one option only.",ref:"EPA Mitigation Menu Table 2, VFS or field border; NRCS CPS 393"},
  {id:"vfs30",nm:"Vegetative filter strip (30–<60 ft)",pts:2,cat:"edge",bcat:"edge",d:"VFS 30 to <60 ft wide. EPA Mitigation Menu Table 2, VFS / field border — select one option only.",ref:"EPA Mitigation Menu Table 2, VFS or field border"},
  {id:"vfs60",nm:"Vegetative filter strip (≥60 ft)",pts:3,cat:"edge",bcat:"edge",d:"VFS ≥60 ft. Maximum VFS points. EPA Mitigation Menu Table 2, VFS / field border — select one option only.",ref:"EPA Mitigation Menu Table 2, VFS or field border"},
  {id:"fb",nm:"Field border (30–<60 ft)",pts:2,cat:"edge",bcat:"edge",d:"Perennial vegetation around field perimeter, 30 to <60 ft wide. EPA Mitigation Menu Table 2, VFS / field border — select one option only.",ref:"EPA Mitigation Menu Table 2, VFS or field border; NRCS CPS 386"},
  {id:"riph",nm:"Riparian herbaceous buffer (30–<60 ft)",pts:2,cat:"edge",bcat:"edge",d:"Permanent grass/forb buffer adjacent to waterbody, 30 to <60 ft wide. EPA Mitigation Menu Table 2, Riparian area — select one option only.",ref:"EPA Mitigation Menu Table 2, Riparian area; NRCS CPS 390"},
  {id:"ripf",nm:"Riparian forest buffer (30–<60 ft)",pts:2,cat:"edge",bcat:"edge",d:"Trees/shrubs + grass buffer adjacent to waterbody, 30 to <60 ft wide. EPA Mitigation Menu Table 2, Riparian area — select one option only.",ref:"EPA Mitigation Menu Table 2, Riparian area; NRCS CPS 391"},
  {id:"cwet",nm:"Constructed wetland",pts:3,cat:"edge",bcat:"edge",d:"Engineered wetland treating field runoff.",ref:"EPA Mitigation Menu Table 2, Constructed and natural wetlands (3 pts); NRCS CPS 656"},
  {id:"vditch",nm:"Vegetated ditch",pts:1,cat:"edge",bcat:"edge",d:"Drainage ditch with established vegetation.",ref:"EPA Table 2"},
  {id:"rip1",nm:"Riparian area (20 to <30 ft)",pts:1,cat:"edge",bcat:"edge",d:"Riparian area, riparian forest buffer, or riparian herbaceous cover, 20 to less than 30 ft. EPA Mitigation Menu Table 2, Riparian area — select one option only (one width tier).",ref:"EPA Mitigation Menu Table 2, Riparian area"},
  {id:"rip3",nm:"Riparian area (≥60 ft)",pts:3,cat:"edge",bcat:"edge",d:"Riparian area, riparian forest buffer, or riparian herbaceous cover, 60 ft or wider. EPA Mitigation Menu Table 2, Riparian area — select one option only (one width tier).",ref:"EPA Mitigation Menu Table 2, Riparian area"},
  {id:"thab1",nm:"Terrestrial habitat (20 to <30 ft)",pts:1,cat:"edge",bcat:"edge",d:"Terrestrial habitat landscape improvement (critical area planting, cross wind trap strips, hedgerow planting, herbaceous wind barriers, windbreak-shelterbelt, tree/shrub planting, forest stand improvement, upland wildlife habitat management), 20 to less than 30 ft. EPA Mitigation Menu Table 2 — select one option only.",ref:"EPA Mitigation Menu Table 2, Terrestrial habitat landscape improvement"},
  {id:"thab2",nm:"Terrestrial habitat (30 to <60 ft)",pts:2,cat:"edge",bcat:"edge",d:"Terrestrial habitat landscape improvement, 30 to less than 60 ft. EPA Mitigation Menu Table 2 — select one option only.",ref:"EPA Mitigation Menu Table 2, Terrestrial habitat landscape improvement"},
  {id:"thab3",nm:"Terrestrial habitat (≥60 ft)",pts:3,cat:"edge",bcat:"edge",d:"Terrestrial habitat landscape improvement, 60 ft or wider. EPA Mitigation Menu Table 2 — select one option only.",ref:"EPA Mitigation Menu Table 2, Terrestrial habitat landscape improvement"},
  {id:"filtC",nm:"Filtering devices — activated carbon",pts:3,cat:"edge",bcat:"edge",d:"Filters, sleeves, socks, or filtration units containing activated carbon. EPA Mitigation Menu Table 2, Filtering devices — select one option only.",ref:"EPA Mitigation Menu Table 2, Filtering devices"},
  {id:"filtComp",nm:"Filtering devices — compost amendments",pts:1,cat:"edge",bcat:"edge",d:"Filters, sleeves, socks, or filtration units containing compost amendments. EPA Mitigation Menu Table 2, Filtering devices — select one option only.",ref:"EPA Mitigation Menu Table 2, Filtering devices"},
  {id:"sed",nm:"Sediment basin / retention pond",pts:2,cat:"system",bcat:"system",d:"Basin capturing and holding runoff before release.",ref:"EPA Mitigation Menu Table 2, Water retention systems (2 pts); NRCS CPS 350"},
  {id:"subdrain",nm:"Subsurface drainage without controlled drainage structure",pts:1,cat:"system",bcat:"system",d:"Subsurface tile drains installed without a controlled drainage structure. EPA Mitigation Menu Table 2, Subsurface drainages and tile drainage installed without controlled drainage structure. Note: tile drains WITH a water control structure and controlled outlet are a Step 3 exemption (no additional mitigation needed), not this practice — do not claim both.",ref:"EPA Mitigation Menu Table 2, Subsurface drainages and tile drainage installed without controlled drainage structure"},
];

// ─── DATA VERSION REGISTRY ───
const DATA_VERSIONS = [
  {src:"EPA Herbicide Strategy",ver:"Final",date:"Aug 20, 2024",next:"N/A",url:"https://www.epa.gov/endangered-species/strategy-protect-endangered-species-herbicides"},
  {src:"EPA Mitigation Menu",ver:"Current",date:"Apr 30, 2025",next:"Fall 2026 (not yet posted as of Nov 18, 2026)",url:"https://www.epa.gov/pesticides/mitigation-menu"},
  {src:"EPA County Runoff Vulnerability",ver:"Current",date:"Oct 2024",next:"TBD",url:"https://www.epa.gov/system/files/documents/2024-10/county-mitigation-relief-points-runoff-vulnerability.pdf"},
  {src:"ACES IPM-0415 (Cotton)",ver:"2025",date:"Dec 2024",next:"Dec 2026 (2026 ed. insect-only)",url:"https://www.aces.edu/blog/topics/crop-production/integrated-pest-management-guides/"},
  {src:"ACES IPM-0413 (Soybean)",ver:"2025",date:"Dec 2024",next:"Dec 2026",url:"https://www.aces.edu/blog/topics/crop-production/integrated-pest-management-guides/"},
  {src:"ACES IPM-0360 (Peanut)",ver:"2025",date:"Dec 2024",next:"Dec 2026",url:"https://www.aces.edu/blog/topics/crop-production/integrated-pest-management-guides/"},
  {src:"ACES IPM-0428 (Corn)",ver:"2025",date:"Jan 2025",next:"Dec 2026",url:"https://www.aces.edu/blog/topics/crop-production/integrated-pest-management-guides/"},
  {src:"EPA PPLS (Label Registry)",ver:"Live",date:"Continuous",next:"Check before each application",url:"https://ordspub.epa.gov/ords/pesticides/f?p=PPLS:1"},
  {src:"USDA Soil Data Access",ver:"Live API",date:"Continuous",next:"Real-time",url:"https://sdmdataaccess.nrcs.usda.gov/"},
  {src:"EPA BLT REST API",ver:"Live API",date:"Continuous",next:"Real-time",url:"https://www.epa.gov/endangered-species/advanced-resources-bulletins-live-two"},
];

const CL = {C:"Cotton",S:"Soybean",P:"Peanut",N:"Corn"};
const TL = {PRE:"PRE",POST:"POST",BURN:"Burndown",DIR:"Directed",PPI:"PPI"};
const CATL = {relief:"Mitigation Relief & Field Characteristics",app:"Application Parameters",infield:"In-Field Conservation Practices",edge:"Edge-of-Field Practices",system:"Systems That Capture Runoff"};

// ─── MUTUAL EXCLUSIVITY (EPA Mitigation Menu, Apr 30 2025; EPA verification §3) ───
// Every group below is one EPA "Select one option" row, or a definitional
// conflict between rows. Selecting one member deselects the others.
const EXCL_GROUPS = [
  {ids:["notill","redtill"], note:"Conservation tillage (EPA Mitigation Menu Table 2): select one option only — no-till or reduced/strip/ridge/mulch tillage, not both."},
  {ids:["cc","ccnt","ccshort"], note:"Cover crop (EPA Mitigation Menu Table 2): select one option only — with tillage, no-till short-term, or no-till long duration, not both."},
  {ids:["vfs10","vfs30","vfs60","fb"], note:"Vegetative filter strip / field border (EPA Mitigation Menu Table 2): select one option only — one width tier, not several."},
  {ids:["riph","ripf","rip1","rip3"], note:"Riparian area (EPA Mitigation Menu Table 2): select one option only — one width tier (20–<30 ft, 30–<60 ft, or ≥60 ft), not several."},
  {ids:["sandy","sandyB"], note:"Predominantly sandy soils (EPA Mitigation Menu Table 1): one tier only — HSG A (3 pts) or HSG B (2 pts), not both."},
  // Definitional double-counting (EPA verification §3.3 D1): the 1-pt cover tier is
  // defined as cover crop WITH tillage, so it cannot combine with no-till/reduced tillage.
  {ids:["cc","notill","redtill"], note:"Cover crop with tillage cannot combine with no-till or reduced tillage (EPA Mitigation Menu Table 2: the 1-point cover tier is defined as cover crop WITH tillage)."},
  // Definitional double-counting (EPA verification §3.3 D2): the 3-pt cover tier is
  // defined as cover crop with NO tillage, so counting it alongside no-till would
  // count the same no-till field twice. Treated as exclusive as the CONSERVATIVE
  // default; the Menu does not explicitly mark these two rows mutually exclusive,
  // so this is a judgement call — confirm against EPA's runoff calculator before release.
  {ids:["ccnt","notill"], note:"Cover crop + no-till (long duration) cannot combine with no-till: both price the same no-till field (EPA verification §3.3 D2, conservative default — confirm against EPA's calculator before release)."},
  {ids:["ccshort","notill"], note:"Cover crop + no-till (short-term) cannot combine with no-till: both price the same no-till field (same conservative default as the long-duration tier)."},
  // Same no-tillage definition: long-duration cover crop is a no-tillage practice,
  // so reduced/strip/ridge/mulch tillage conflicts with it as well.
  {ids:["ccnt","redtill"], note:"Cover crop + no-till (long duration) cannot combine with reduced/strip/ridge/mulch tillage: the cover tier is defined as no tillage."},
  {ids:["ccshort","redtill"], note:"Cover crop + no-till (short-term) cannot combine with reduced/strip/ridge/mulch tillage: the cover tier is defined as no tillage."},
  {ids:["techspec","nonqual"], note:"Technical specialist OR non-qualified conservation program (EPA Mitigation Menu Table 1): select one; points are not additive for doing both."},
  {ids:["eqip","nonqual"], note:"EPA-Qualified Conservation Program (9 pts) already includes the 2 points for participating in a conservation program (EPA Mitigation Menu Table 1), so it cannot combine with the non-qualified program."},
  {ids:["rate10","rate30","rate60"], note:"Annual application rate reduction (EPA Mitigation Menu Table 2): select one option only — one reduction tier, not several."},
  {ids:["prop10","prop30","prop60"], note:"Reduction in the proportion of field treated (EPA Mitigation Menu Table 2): select one option only — one untreated-portion tier, not several."},
  {ids:["irriggen","nonirr"], note:"Irrigation water management (EPA Mitigation Menu Table 2): select one option only — general irrigation management, or no irrigation, not both."},
  {ids:["mulchA","mulchN"], note:"Mulching (EPA Mitigation Menu Table 2): select one option only — permeable artificial materials or natural materials, not both."},
  {ids:["thab1","thab2","thab3"], note:"Terrestrial habitat landscape improvement (EPA Mitigation Menu Table 2): select one option only — one width tier, not several."},
  {ids:["filtC","filtComp"], note:"Filtering devices (EPA Mitigation Menu Table 2): select one option only — activated carbon or compost amendments, not both."},
];
// Practice ids that conflict with `id` (union over every group containing it).
const conflictsOf = (id) => [...new Set(EXCL_GROUPS.filter(g => g.ids.includes(id)).flatMap(g => g.ids))].filter(x => x !== id);
// Note text for a deselection caused by selecting `id`.
const conflictNoteFor = (id, dropped) => {
  const g = EXCL_GROUPS.find(g => g.ids.includes(id) && dropped.some(d => g.ids.includes(d)));
  const names = dropped.map(d => (PRACT.find(p => p.id === d) || {}).nm || d).join(", ");
  return `Deselected ${names}. ` + (g ? g.note : "These practices cannot be combined under the EPA Mitigation Menu.");
};

// ─── STYLES ───
const f = "'DM Sans','Helvetica Neue',system-ui,sans-serif";
const k = {bg:"#f5f3f0",card:"#fff",bdr:"#d9d4cc",bdrL:"#ebe7e0",tx:"#1a1a1a",txM:"#5a5147",txL:"#8a7b6b",acc:"#1f5c2e",accBg:"#eaf3ec",grn:"#1f6429",grnBg:"#ecf6ee",grnL:"#a0cfa5",amb:"#8a6007",ambBg:"#fdf7e5",red:"#9a281f",redBg:"#fceeed",blu:"#234434",bluBg:"#e6efe9",pur:"#59309b",purBg:"#f3edfc",hdr:"#234434",hdrTx:"#ffffff",tagBg:"#f0ebe3"};

// Last verified data update — UPDATE THIS DATE every time you change any data
const LAST_DATA_UPDATE = "November 20, 2026";
const LABEL_COVERAGE_NOTE = "ESA label data verified through November 18, 2026. Products labeled: Liberty ULTRA, Enlist One, Enlist Duo, Engenia, Stryax, Tavium Plus, Voraxor, Convintro, Empera. All other products awaiting registration review.";

export default function App() {
  const [tab, setTab] = useState("calc");
  const [county, setCounty] = useState("");
  const [crop, setCrop] = useState("");
  const [plan, setPlan] = useState([]);
  const [prac, setPrac] = useState([]); // EPA verification §1(e): mitigation tracking starts UNCHECKED — nothing has been earned on first load.
  const [exclNote, setExclNote] = useState(""); // explains the most recent exclusivity deselection / disabled state
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

  // Determine HSG-adjusted points for Enlist products, and PULA-adjusted
  // points for dicamba / Empera (Fix 2). A PULA hit raises dicamba to 6 and
  // Empera to 3; without a confirmed PULA hit the outside-PULA value stands.
  // The tool says plainly when it does not know: no PULA result yet means
  // the PULA requirement is unknown, not zero.
  const getHerbPts = useCallback((h) => {
    if (pulaResults?.found && h.ptsPULA != null) return h.ptsPULA;
    if (!h.ptsCD) return h.pts;
    if (hsgResult) {
      const g = hsgResult.toUpperCase();
      if (g === "A" || g === "B" || g === "A/D" || g === "B/D") return h.pts; // 4
      return h.ptsCD; // 6 for C, D, C/D
    }
    return h.ptsCD; // conservative default if no HSG data
  }, [hsgResult, pulaResults]);

  const cropH = useMemo(() => {
    if (!crop) return [];
    return HERBS.filter(h => h.cr.includes(crop))
      .filter(h => tmFilt === "ALL" || h.tm.includes(tmFilt))
      .filter(h => !search || h.nm.toLowerCase().includes(search.toLowerCase()) || h.ai.toLowerCase().includes(search.toLowerCase()) || h.grp.includes(search));
  }, [crop, search, tmFilt]);

  const addH = useCallback(h => { if (!plan.find(p => p.id === h.id)) setPlan(p => [...p, h]); setShowAdd(false); setSearch(""); }, [plan]);
  const remH = useCallback(id => setPlan(p => p.filter(h => h.id !== id)), []);
  // Exclusive-aware practice toggle (EPA verification §3). Selecting a practice
  // deselects every practice it conflicts with (EXCL_GROUPS above) and reports
  // why on screen. Selecting EQIP deselects everything else: it alone meets
  // the 9-point maximum (EPA verification §3.2).
  const togP = useCallback(id => {
    if (prac.includes(id)) { setPrac(p => p.filter(x => x !== id)); setExclNote(""); return; }
    if (id === "eqip") {
      const dropped = prac.filter(x => x !== "eqip");
      setPrac(["eqip"]);
      setExclNote(dropped.length ? "Maximum met — no additional practices needed. Deselected " + dropped.map(d => (PRACT.find(p => p.id === d) || {}).nm || d).join(", ") + ": an EPA-Qualified Conservation Program (EQIP + CPS 595) alone meets the 9-point maximum (EPA Mitigation Menu Table 1)." : "Maximum met — no additional practices needed: an EPA-Qualified Conservation Program (EQIP + CPS 595) alone meets the 9-point maximum (EPA Mitigation Menu Table 1).");
      return;
    }
    if (prac.includes("eqip")) return; // other practices are disabled while EQIP is selected
    const dropped = prac.filter(x => conflictsOf(id).includes(x));
    setPrac(p => [...p.filter(x => !conflictsOf(id).includes(x)), id]);
    setExclNote(dropped.length ? conflictNoteFor(id, dropped) : "");
  }, [prac]);

  // Sandy-soil gating (EPA verification §3.1 E5): which sandy tier, if any, the
  // HSG lookup allows. A/D and B/D resolve to the drained group (A / B).
  // C/D soils are not HSG A or B, so neither sandy tier is available.
  const hsgLetter = hsgResult ? hsgResult.toUpperCase().replace("/D", "") : null;
  const sandyReason = useCallback((id) => {
    if (!hsgLetter) return null;
    if (["C", "D"].includes(hsgLetter)) return "Not available: the HSG lookup returned HSG " + hsgResult + ", which is not predominantly sandy soil (EPA Mitigation Menu Table 1 — HSG A or B only).";
    if (hsgLetter === "B" && id === "sandy") return "Not available: the HSG lookup returned HSG B, so only the 2-point HSG B tier applies (EPA Mitigation Menu Table 1).";
    if (hsgLetter === "A" && id === "sandyB") return "Not available: the HSG lookup returned HSG A, so only the 3-point HSG A tier applies (EPA Mitigation Menu Table 1).";
    return null;
  }, [hsgLetter, hsgResult]);
  // If a later HSG lookup makes a selected sandy tier ineligible, drop it.
  useEffect(() => {
    if (!hsgLetter) return;
    setPrac(p => p.filter(id => !sandyReason(id)));
  }, [hsgLetter, sandyReason]);
  // Sandy-soil gating: Enlist One/Duo labels prohibit application on sandy
  // soils with less than 1% organic matter, and the Feb 6, 2026 dicamba
  // labels (Engenia, Stryax, Tavium Plus) prohibit application to sand
  // soils with less than 3% organic matter where groundwater is shallow
  // (Tavium Plus bans sand/loamy sand outright). This tool does not track
  // soil organic matter or groundwater depth, so the sandy-soil tiers are
  // unavailable whenever one of these products is in the plan
  // (conservative default; PPLS label check Nov 12, 2026).
  const enlistInPlan = plan.some(h => h.id === "enlist-one" || h.id === "enlist-duo");
  const dicambaInPlan = plan.some(h => h.id === "engenia" || h.id === "stryax" || h.id === "tavium");
  const sandBlockedInPlan = enlistInPlan || dicambaInPlan;
  const sandBlockReason = dicambaInPlan
    ? "Not available: the Feb 6, 2026 dicamba labels (Engenia, Stryax, Tavium Plus) prohibit application to sand soils with less than 3% organic matter where groundwater is shallow; Tavium Plus bans sand/loamy sand outright. This tool does not track soil organic matter or groundwater depth."
    : "Not available: Enlist One/Duo labels prohibit application on sandy soils with less than 1% organic matter; this tool does not track soil organic matter.";
  useEffect(() => {
    if (!sandBlockedInPlan) return;
    setPrac(p => p.filter(id => id !== "sandy" && id !== "sandyB"));
  }, [sandBlockedInPlan]);

  const maxReq = useMemo(() => plan.length ? Math.max(...plan.map(h => getHerbPts(h))) : 0, [plan, getHerbPts]);
  // EPA verification §3.2: cap the earned total at 9 — the maximum any label
  // can require. EQIP alone meets it; county relief + practices cannot exceed it.
  // EPA Mitigation Menu Table 2, "Using mitigation measures from multiple
  // categories": +1 point when practices come from at least 2 of in-field,
  // field-adjacent, or systems that capture runoff and discharge. Relief and
  // application-parameter practices do not count toward it (bcat is null).
  // The bonus is shown separately on screen and in the print report.
  const multiBonus = useMemo(() => {
    const cats = new Set(PRACT.filter(p => prac.includes(p.id) && p.bcat).map(p => p.bcat));
    return cats.size >= 2 ? 1 : 0;
  }, [prac]);
  const earned = useMemo(() => {
    let t = ctyRel + multiBonus;
    PRACT.filter(p => prac.includes(p.id)).forEach(p => { t += p.pts; });
    return Math.min(9, t);
  }, [prac, ctyRel, multiBonus]);
  const deficit = Math.max(0, maxReq - earned);
  const ok = plan.length > 0 && maxReq > 0 && deficit === 0;
  const esaN = plan.filter(h => h.esa === "active").length;
  const maxBuf = useMemo(() => plan.length ? Math.max(...plan.map(h => h.buf || 0)) : 0, [plan]);
  const sWind = useMemo(() => { const v = plan.map(h => h.wMax).filter(Boolean); return v.length ? Math.min(...v) : null; }, [plan]);
  // Most restrictive lower wind bound in the plan (highest wMin). A wMin is
  // mandatory for dicamba and Liberty ULTRA; for Enlist it is a label
  // recommendation ("for best results"), flagged by wMinAdv.
  const sWindMin = useMemo(() => { const v = plan.map(h => h.wMin).filter(x => x != null); return v.length ? Math.max(...v) : null; }, [plan]);
  const windMinAdv = plan.some(h => h.wMin != null && h.wMinAdv);
  const windText = sWind == null ? null : (sWindMin != null ? `${sWindMin}–${sWind} mph` : `${sWind} mph`);
  const sSpd = useMemo(() => { const v = plan.map(h => h.spd).filter(Boolean); return v.length ? Math.min(...v) : null; }, [plan]);

  // ─── USDA SOIL DATA ACCESS API (Limitation 1) ───
  const lookupHSG = async () => {
    if (!lat || !lon) { setHsgError("Enter both latitude and longitude."); return; }
    const la = parseFloat(lat), lo = parseFloat(lon);
    if (isNaN(la) || isNaN(lo) || la < 30 || la > 35.5 || lo < -89 || lo > -84.5) {
      setHsgError("Coordinates must be within Alabama (Lat 30–35.5, Lon -89 to -84.5)."); return;
    }
    setHsgLoading(true); setHsgError(null); setHsgResult(null);
    const sql = `SELECT TOP 1 hydgrp FROM mapunit mu
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
        const hsg = data.Table[0].hydgrp || data.Table[0][Object.keys(data.Table[0])[0]];
        setHsgResult(hsg);
      } else {
        setHsgError("No soil data found at these coordinates. Try a nearby point within a mapped soil polygon.");
      }
    } catch (err) {
      setHsgError(`API error: ${err.message}. USDA servers may be temporarily unavailable or you have a poor network connection — try again or use Web Soil Survey manually.`);
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
      // Query EPA BLT PULA MapServer (blt.epa.gov) layer 0, "Effective Pulas"
      const la = parseFloat(lat), lo = parseFloat(lon);
      const url = `https://blt.epa.gov/arcgis/rest/services/BLT/PesticideUsageLimitationAreas/MapServer/0/query?where=1%3D1&geometry=${lo}%2C${la}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (data?.error) throw new Error(data.error.message || "BLT service error");
      if (data?.features?.length > 0) {
        setPulaResults({ found: true, count: data.features.length, features: data.features.slice(0, 10) });
      } else {
        setPulaResults({ found: false, count: 0, features: [] });
      }
    } catch (err) {
      setPulaError(`BLT API query failed: ${err.message}. The tool does not know whether this field is inside a PULA, because the check failed — it does not assume the field is outside a PULA. Generate a BLT bulletin before application. You may have a poor network connection. Use EPA's Bulletins Live! Two website directly for official compliance.`);
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
      if (!win) return;
      // Static shell only: no user-entered values are interpolated into HTML
      // strings here. The report body is attached as a cloned DOM node and
      // the footer is built with textContent, so nothing the user typed can
      // become markup in the print window.
      win.document.write(`<html><head><title>ESA Compliance Report</title>
        <style>body{font-family:${f};font-size:13px;color:#222;padding:32px;line-height:1.65}
        h1{font-size:18px;border-bottom:2px solid #c04a20;padding-bottom:8px}
        h2{font-size:15px;margin-top:20px;color:#c04a20}
        table{border-collapse:collapse;width:100%;margin:10px 0}
        th,td{border:1px solid #ccc;padding:6px 10px;text-align:left;font-size:12px}
        th{background:#f5f1eb;font-weight:700}
        .tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;margin-right:4px}
        .warn{color:#b27d0a;background:#fdf7e5}.pass{color:#267a32;background:#ecf6ee}.fail{color:#b83025;background:#fceeed}
        .footer{margin-top:30px;border-top:1px solid #ccc;padding-top:12px;font-size:11px;color:#888}
        @media print{body{padding:20px}}</style></head><body><div id="report-root"></div><div id="report-footer" class="footer"></div></body></html>`);
      win.document.close();
      win.document.title = `ESA Compliance Report — ${county} County — ${new Date().toLocaleDateString()}`;
      const root = win.document.getElementById("report-root");
      if (root) root.appendChild(content.cloneNode(true));
      const footer = win.document.getElementById("report-footer");
      if (footer) {
        const p1 = win.document.createElement("p");
        p1.textContent = `Report generated: ${new Date().toLocaleString()} | Alabama ESA Mitigation Points Calculator v2.1`;
        const p2 = win.document.createElement("p");
        p2.textContent = "Managed and developed by Gourav Chahal, PhD student, working under Dr. David Russell and Dr. Andrew Price";
        const p3 = win.document.createElement("p");
        p3.textContent = "Keep this report on file with your spray records as your paper or electronic record of the mitigation measures employed. Mitigation tracking earns +1 point under EPA Mitigation Menu Table 1 (Mitigation tracking) when the listed measures are in place and the record is maintained.";
        const p4 = win.document.createElement("p");
        p4.textContent = "Disclaimer: This report is for planning purposes only. The product label is the law. Always verify requirements through EPA's Bulletins Live! Two system before application.";
        footer.append(p1, p2, p3, p4);
      }
      win.print();
      setShowReport(false);
    }, 200);
  };

  // ─── RENDER ───
  const s = {
    pg:{fontFamily:f,background:k.bg,color:k.tx,minHeight:"100vh",fontSize:14,lineHeight:1.55},
    hd:{background:k.hdr,padding:"16px 24px",borderBottom:`3px solid ${k.acc}`},
    cd:{background:k.card,border:`1px solid ${k.bdr}`,borderRadius:10,padding:"16px 18px",marginBottom:14,boxShadow:"0 1px 2px rgba(0,0,0,0.03)"},
    lb:{fontSize:14,fontWeight:700,color:k.txM,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7,display:"block"},
    sl:{width:"100%",padding:"9px 12px",minHeight:"44px",borderRadius:6,border:`1px solid ${k.bdr}`,fontSize:14,fontFamily:f,color:k.tx,background:k.bg,boxSizing:"border-box"},
    inp:{width:"100%",boxSizing:"border-box",padding:"9px 12px",minHeight:"44px",borderRadius:6,border:`1px solid ${k.bdr}`,fontSize:14,fontFamily:f,color:k.tx,background:k.bg,outline:"none"},
    btn:(bg,fg)=>({padding:"7px 16px",minHeight:"44px",minWidth:"44px",borderRadius:6,border:"none",background:bg,color:fg,fontSize:14,fontWeight:700,cursor:"pointer"}),
    tg:(bg,fg)=>({display:"inline-flex",alignItems:"center",padding:"2px 9px",borderRadius:4,background:bg,color:fg,fontSize:14,fontWeight:600,whiteSpace:"nowrap"}),
    tb:{display:"flex",gap:0,borderBottom:`2px solid ${k.bdr}`,background:k.card},
    tbi:a=>({padding:"10px 20px",minHeight:"44px",fontSize:14,fontWeight:a?700:500,color:a?k.acc:k.txM,borderBottom:a?`3px solid ${k.acc}`:"3px solid transparent",cursor:"pointer",background:"transparent",border:"none",marginBottom:"-2px"}),
  };

  return (
    <div style={s.pg}>
      <div style={{background:"#FFF3CD",borderBottom:"2px solid #E0A800",padding:"8px 22px",fontSize:13,lineHeight:1.5,color:"#664D03"}}>
        <strong>Disclaimer:</strong> Personal research and learning prototype. Not an official Auburn University, EPA, or regulatory tool and not a substitute for current EPA guidance, Bulletins Live! Two, or the pesticide label. Verify all requirements before use.
      </div>
      <div style={{...s.hd,background:"linear-gradient(135deg, #234434 0%, #162e1f 100%)",borderBottom:"4px solid #1f5c2e"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
          <div>
            <h1 style={{margin:0,fontSize:20,fontWeight:800,color:"#ffffff",letterSpacing:"-0.3px"}}>Alabama ESA Mitigation Points Calculator <span style={{fontSize:14,fontWeight:500,color:"#cdd6e4"}}>v2.1</span></h1>
            <p style={{margin:"3px 0 0",fontSize:14,color:"#cdd6e4"}}>Cotton · Soybean · Peanut · Corn &nbsp;|&nbsp; EPA Herbicide Strategy (Aug 2024)</p>
            <p style={{margin:"2px 0 0",fontSize:14,color:"#cdd6e4"}}>{LABEL_COVERAGE_NOTE}</p>
            <p style={{margin:"2px 0 0",fontSize:14,color:"#a6b5c9"}}>Gourav Chahal, PhD Student · Advisors: Dr. Andrew Price & Dr. David Russell</p>
          </div>
          <div style={{flexShrink:0}}>
            <div style={{background:"#1f5c2e",color:"#fff",padding:"4px 12px",borderRadius:5,fontSize:14,fontWeight:700,display:"inline-block"}}>Data verified: {LAST_DATA_UPDATE}</div>
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
        <div style={{padding:"14px 18px",background:"#fff8f5",border:"2px solid #1f5c2e",borderRadius:8,marginBottom:16,fontSize:14,color:"#1a1a1a",lineHeight:1.6}}>
          <strong style={{color:"#1f5c2e",fontSize:15,display:"block",marginBottom:6}}>⚠️ FOR PLANNING PURPOSES ONLY — THE LABEL IS THE LAW</strong>
          This tool helps you <strong>plan</strong> your herbicide program's ESA compliance. It does not replace the product label or EPA's official Bulletins Live! Two system. Always read the current label and generate official BLT bulletins at <strong>epa.gov/endangered-species/bulletins-live-two-view-bulletins</strong> before every application. No compliance guarantee is expressed or implied.
          <div style={{marginTop:8,padding:"8px 12px",background:"#eaf3ec",borderLeft:"3px solid #1f5c2e",borderRadius:4,fontSize:13}}>
            <strong>Agronomic Best Practices:</strong> Do not compromise effective weed control (e.g., using multiple effective sites of action) simply to avoid ESA mitigation points. Products listed as "ESA Pending" are expected to require mitigation points in the future as EPA completes their registration reviews.
          </div>
        </div>

        {/* ═══ CALCULATOR TAB ═══ */}
        {tab === "calc" && (<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <div style={s.cd}>
              <label htmlFor="county-select" style={s.lb}>Step 1a — County</label>
              <select id="county-select" value={county} onChange={e=>setCounty(e.target.value)} style={s.sl}>
                <option value="">Select...</option>
                {AL.map(c=><option key={c.n} value={c.n}>{c.n} ({c.v==="H"?"High · 0 pts":"Medium · 2 pts"})</option>)}
              </select>
              {cty && <div style={{marginTop:8,padding:"8px 12px",borderRadius:6,background:cty.v==="H"?k.redBg:k.ambBg,fontSize:14}}>
                <strong style={{color:cty.v==="H"?k.red:k.amb}}>{cty.v==="H"?"High":"Medium"} Vulnerability</strong>
                <span style={{marginLeft:6,color:k.txM}}>→ {ctyRel} relief pts</span>
              </div>}
            </div>
            <div style={s.cd}>
              <label htmlFor="crop-select" style={s.lb}>Step 1b — Crop</label>
              <select id="crop-select" value={crop} onChange={e=>{setCrop(e.target.value);setPlan([]);}} style={s.sl}>
                <option value="">Select...</option>
                {Object.entries(CL).map(([k2,v])=><option key={k2} value={k2}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* HSG indicator */}
          {hsgResult && <div style={{...s.cd,borderLeft:`4px solid ${k.pur}`,background:k.purBg,padding:"10px 16px",marginBottom:14}}>
            <span style={{fontSize:14,fontWeight:700,color:k.pur}}>Soil HSG from USDA lookup: {hsgResult}</span>
            <span style={{marginLeft:12,fontSize:14,color:k.txM}}>
              {["A","B","A/D","B/D"].includes(hsgResult.toUpperCase()) ? "Enlist products: 4 runoff pts" : "Enlist products: 6 runoff pts (higher tier for HSG C/D)"}
            </span>
          </div>}

          {/* Spray plan builder */}
          {crop && county && (<div style={s.cd}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div>
                <h2 style={{margin:0,fontSize:14,fontWeight:700,color:k.txM,textTransform:"uppercase",letterSpacing:"1px"}}>Step 2 — Spray Plan</h2>
              </div>
              <button onClick={()=>setShowAdd(!showAdd)} style={s.btn(showAdd?k.red:k.acc,"#fff")}>{showAdd?"Cancel":"+ Add"}</button>
            </div>

            {showAdd && <div style={{background:k.bg,border:`1px solid ${k.bdr}`,borderRadius:7,padding:12,marginBottom:12}}>
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                <input aria-label="Search herbicides" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} autoFocus style={{...s.inp,flex:1}} />
                <select aria-label="Filter by timing" value={tmFilt} onChange={e=>setTmFilt(e.target.value)} style={{...s.sl,width:"auto",minWidth:80}}><option value="ALL">All</option>{Object.entries(TL).map(([k2,v])=><option key={k2} value={k2}>{v}</option>)}</select>
              </div>
              <div style={{maxHeight:220,overflowY:"auto"}}>
                {cropH.map(h=>(
                  <div key={h.id} onClick={()=>addH(h)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",minHeight:"44px",borderBottom:`1px solid ${k.bdrL}`,cursor:"pointer",borderRadius:5}}
                    onMouseOver={e=>e.currentTarget.style.background=k.bdrL} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                    <div><span style={{fontWeight:700,fontSize:14}}>{h.nm}</span><span style={{marginLeft:6,fontSize:14,color:k.txM}}>{h.ai} · Grp {h.grp}</span></div>
                    <div style={{display:"flex",gap:4}}>{h.esa==="active"&&<span style={s.tg(k.redBg,k.red)}>ESA Label</span>}</div>
                  </div>
                ))}
                {cropH.length===0&&<p style={{color:k.txM,textAlign:"center",padding:16,fontSize:14}}>No products match.</p>}
              </div>
            </div>}

            {plan.length===0 ? <div style={{border:`1px dashed ${k.bdr}`,borderRadius:7,padding:"24px 16px",textAlign:"center",color:k.txM,fontSize:14}}>Add herbicides for your {CL[crop]} program.</div> :
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {plan.map(h=>{
                const ex = expH===h.id;
                const hp = getHerbPts(h);
                return <div key={h.id} style={{border:`1px solid ${h.esa==="active"?k.acc+"44":k.bdr}`,borderRadius:7,padding:"10px 14px",background:h.esa==="active"?k.accBg:k.card}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,fontSize:14}}>{h.nm}</span>
                        <span style={{fontSize:14,color:k.txM}}>Grp {h.grp} · {h.mfr} · {h.reg}</span>
                      </div>
                      <div style={{display:"flex",gap:4,marginTop:5,flexWrap:"wrap"}}>
                        {h.esa==="active"?<>
                          <span style={s.tg(k.redBg,k.red)}>ESA Active</span>
                          <span style={s.tg(k.ambBg,k.amb)}>Runoff: {hp} pts{h.ptsCD&&hsgResult?` (HSG ${hsgResult})`:h.ptsCD?" (HSG unknown—using C/D)":""}{pulaResults?.found&&h.ptsPULA!=null?" (inside PULA)":""}</span>
                          <span style={s.tg(k.bluBg,k.blu)}>Buffer: {h.buf} ft</span>
                          {h.blt&&<span style={s.tg(k.purBg,k.pur)}>BLT Required</span>}
                        </>:<>
                          <span style={s.tg(k.tagBg,k.txM)}>ESA Pending</span>
                          <span style={{fontSize:14,color:k.txM,fontStyle:"italic"}}>{h.pw||"Awaiting registration review under Herbicide Strategy."}</span>
                        </>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:4,flexShrink:0}}>
                      <button onClick={()=>setExpH(ex?null:h.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:k.blu,fontWeight:600,minWidth:"44px",minHeight:"44px"}}>{ex?"Hide":"Info"}</button>
                      <button onClick={()=>remH(h.id)} style={{background:"none",border:"none",color:k.red,cursor:"pointer",fontSize:15,minWidth:"44px",minHeight:"44px"}}>✕</button>
                    </div>
                  </div>
                  {ex&&<div style={{marginTop:8,padding:"8px 12px",background:k.bg,borderRadius:5,fontSize:14,lineHeight:1.6}}>
                    <p style={{margin:"0 0 4px"}}><strong>AI:</strong> {h.ai} &nbsp;|&nbsp; <strong>Timing:</strong> {h.tm.map(t=>TL[t]).join(", ")}</p>
                    {h.pw&&<p style={{margin:"0 0 4px",color:k.amb}}><strong>ESA Status:</strong> {h.pw}</p>}
                    <p style={{margin:"0 0 4px"}}>{h.note}</p>
                    <p style={{margin:0,color:k.txM,fontSize:14}}><strong>Source:</strong> {h.ref}</p>
                  </div>}
                </div>;
              })}
            </div>}
          </div>)}

          {/* Consolidated */}
          {plan.length>0&&esaN>0&&<div style={{...s.cd,borderLeft:`4px solid ${k.acc}`}}>
            <h2 style={{margin:"0 0 10px",fontSize:14,fontWeight:700,color:k.acc,textTransform:"uppercase",letterSpacing:"1px"}}>Consolidated ESA Requirements</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8}}>
              <MC l="Runoff Pts" v={maxReq} su="required" co={k.amb}/>
              <MC l="Drift Buffer" v={`${maxBuf} ft`} su="downwind" co={k.blu}/>
              {sWind&&<MC l="Wind" v={windText} su={windMinAdv?"at boom · lower bound advisory":"at boom"} co={k.pur}/> }
              {sSpd&&<MC l="Max Speed" v={`${sSpd} mph`} su="ground" co={k.acc}/>}
            </div>
          </div>}

          {/* Points calc */}
          {plan.length>0&&maxReq>0&&<div style={s.cd}>
            <h2 style={{margin:"0 0 10px",fontSize:14,fontWeight:700,color:k.txM,textTransform:"uppercase",letterSpacing:"1px"}}>Step 3 — Mitigation Points</h2>
            <div style={{padding:"12px 16px",borderRadius:7,border:`2px solid ${ok?k.grn:k.amb}`,background:ok?k.grnBg:k.bg,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:14,fontWeight:600,color:k.txM}}>Earned / Required</span>
                <span style={{fontSize:24,fontWeight:800,color:ok?k.grn:k.amb}}>{earned} / {maxReq}</span>
              </div>
              <div style={{height:8,background:k.bdrL,borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(100,maxReq>0?(earned/maxReq)*100:0)}%`,background:ok?k.grn:k.amb,borderRadius:4,transition:"width 0.3s"}}/>
              </div>
              <p style={{margin:"6px 0 0",fontSize:14,fontWeight:600,color:ok?k.grn:k.amb}}>
                {ok?"✓ Points requirement met — label restrictions not checked":`${deficit} more pt${deficit!==1?"s":""} needed — ${county} County`}
              </p>
            </div>

            {prac.includes("eqip") && <div style={{padding:"10px 14px",borderRadius:7,background:k.grnBg,border:`1px solid ${k.grnL}`,marginBottom:12,fontSize:14,color:k.grn,fontWeight:600}}>Maximum met — no additional practices needed. An EPA-Qualified Conservation Program (EQIP + CPS 595) alone meets the 9-point maximum (EPA Mitigation Menu Table 1). Other practices are disabled because they are not needed.</div>}
            {multiBonus===1 && <div style={{padding:"10px 14px",borderRadius:7,background:k.grnBg,border:`1px solid ${k.grnL}`,marginBottom:12,fontSize:14,color:k.grn,fontWeight:600}}>Multi-category bonus +1 point — your selected practices come from at least two categories (in-field, field-adjacent, or systems that capture runoff). EPA Mitigation Menu Table 2, "Using mitigation measures from multiple categories".</div>}
            {exclNote && !prac.includes("eqip") && <div style={{padding:"10px 14px",borderRadius:7,background:k.ambBg,border:`1px solid #e8c96a`,marginBottom:12,fontSize:14,color:k.amb}}>{exclNote}</div>}
            {hsgResult && <div style={{padding:"10px 14px",borderRadius:7,background:k.purBg,border:`1px solid #c9b8e8`,marginBottom:12,fontSize:14,color:k.pur}}>Soil HSG {hsgResult}: {["C","D","C/D"].includes(hsgResult.toUpperCase()) ? "neither sandy-soil tier is available (HSG A or B only)." : hsgResult.toUpperCase().replace("/D","") === "B" ? "only the 2-point HSG B sandy tier applies." : "only the 3-point HSG A sandy tier applies."} (EPA Mitigation Menu Table 1, Predominantly sandy soils.)</div>}
            {plan.some(h=>h.ptsPULA!=null) && (pulaResults?.found
              ? <div style={{padding:"10px 14px",borderRadius:7,background:k.ambBg,border:`1px solid #e8c96a`,marginBottom:12,fontSize:14,color:k.amb,fontWeight:600}}>Requirement raised because this field is inside a PULA: dicamba needs 6 points, Empera needs 3 points inside its PULAs. This is what the tool knows from the PULA check at your coordinates — it does not know your product or month, so generate the BLT bulletin and follow it before application.</div>
              : <div style={{padding:"10px 14px",borderRadius:7,background:k.ambBg,border:`1px solid #e8c96a`,marginBottom:12,fontSize:14,color:k.amb,fontWeight:600}}>PULA check not run — the tool does not know whether this field is inside a PULA. Dicamba requires 6 points inside a PULA and Empera requires 3 points inside its PULAs. Run the PULA check, or generate a BLT bulletin, before relying on this result.</div>)}
            {plan.length>0 && <div style={{padding:"12px 16px",borderRadius:7,background:"#fff7e6",border:"1px solid #e8c96a",marginBottom:14}}>
              <h3 style={{margin:"0 0 6px",fontSize:14,fontWeight:700,color:k.amb}}>Label restrictions this tool does NOT check</h3>
              <p style={{margin:"0 0 8px",fontSize:14,color:k.tx,lineHeight:1.6}}>The verdict above covers runoff/erosion points only. These label restrictions decide whether an application is legal — this tool does not check them. Read the label and the BLT bulletin before every application.</p>
              {plan.filter(h=>h.restr).map(h=>(<div key={h.id} style={{marginBottom:8}}><strong style={{fontSize:14}}>{h.nm} (EPA Reg. {h.reg}):</strong><ul style={{margin:"4px 0 0",paddingLeft:20,fontSize:14,color:k.tx,lineHeight:1.6}}>{h.restr.map((r,i)=><li key={i}>{r}</li>)}</ul></div>))}
              {!plan.some(h=>h.restr) && <p style={{margin:0,fontSize:14,color:k.tx}}>None of the products in this plan has a modelled label restriction in this tool. The label and BLT bulletin may still impose restrictions — check them before application.</p>}
            </div>}
            <p style={{margin:"0 0 10px",fontSize:13,color:k.txM}}>Where EPA marks a Mitigation Menu row "Select one option", only one option in that row may be claimed — selecting one deselects the others, and the reason is shown above.</p>
            {Object.entries(CATL).map(([ck,cl])=>(
              <div key={ck} style={{marginBottom:14}}>
                <h3 style={{margin:"0 0 6px",fontSize:14,fontWeight:700,color:k.txM,textTransform:"uppercase",letterSpacing:"0.8px",borderBottom:`1px solid ${k.bdrL}`,paddingBottom:4}}>{cl}</h3>
                {PRACT.filter(p=>p.cat===ck).map(p=>{
                  const a = prac.includes(p.id);
                  // Disabled with an on-screen reason: EQIP already meets the
                  // 9-pt maximum (EPA §3.2), or the HSG lookup rules the sandy
                  // tier out (EPA §3.1 E5). Disabled rows cannot be toggled.
                  const dis = prac.includes("eqip") && p.id !== "eqip"
                    ? "Not needed — EQIP already meets the 9-point maximum (EPA Mitigation Menu Table 1)."
                    : (sandBlockedInPlan && (p.id === "sandy" || p.id === "sandyB"))
                    ? sandBlockReason
                    : sandyReason(p.id);
                  return <div key={p.id} onClick={()=>{ if (!dis) togP(p.id); }} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 10px",minHeight:"44px",borderRadius:6,cursor:dis?"not-allowed":"pointer",opacity:dis?0.55:1,background:a?k.grnBg:"transparent",border:`1px solid ${a?k.grnL:"transparent"}`,marginBottom:3}}>
                    <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${a?k.grn:k.bdr}`,background:a?k.grn:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff",fontWeight:800,flexShrink:0,marginTop:1}}>{a&&"✓"}</div>
                    <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:a?k.tx:k.txM}}>{p.nm}</div><div style={{fontSize:14,color:k.txM,marginTop:1}}>{p.d}</div>{dis && <div style={{fontSize:13,color:k.amb,marginTop:3,fontWeight:600}}>{dis}</div>}</div>
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
            <h2 style={{margin:"0 0 4px",fontSize:16,fontWeight:800}}>Field Location</h2>
            <p style={{margin:"0 0 14px",fontSize:14,color:k.txM,lineHeight:1.6}}>
              Your field coordinates are needed to look up soil type (for Enlist product requirements) and check for Pesticide Use Limitation Areas. You can share your location automatically or type coordinates manually.
            </p>

            {/* USE MY LOCATION BUTTON */}
            <div style={{padding:"16px 18px",background:"linear-gradient(135deg, #edf3f9 0%, #f3edfc 100%)",borderRadius:8,border:`1px solid ${k.blu}33`,marginBottom:14}}>
              <button onClick={useMyLocation} disabled={geoLoading} style={{...s.btn(k.blu,"#fff"),fontSize:14,padding:"10px 24px",opacity:geoLoading?0.6:1,width:"100%"}}>
                {geoLoading ? "Requesting location..." : geoUsed ? `✓ Location set (${lat}, ${lon}) — Click to refresh` : "📍 Use My Location"}
              </button>
              {geoError && <div style={{marginTop:8,padding:"8px 12px",background:k.ambBg,borderRadius:6,fontSize:14,color:k.amb}}>{geoError}</div>}
              {geoUsed && !geoError && <p style={{margin:"8px 0 0",fontSize:14,color:k.grn,fontWeight:600}}>✓ Coordinates set: {lat}°N, {lon}°W</p>}
            </div>

            {/* SECURITY & PRIVACY NOTICE */}
            <div style={{padding:"12px 16px",background:"#faf8f5",borderRadius:8,border:`1px solid ${k.bdr}`,marginBottom:14}}>
              <h3 style={{margin:"0 0 6px",fontSize:14,fontWeight:700,color:k.txM,textTransform:"uppercase",letterSpacing:"0.8px"}}>🔒 Privacy & Security — How Your Location Is Handled</h3>
              <div style={{fontSize:14,color:k.tx,lineHeight:1.7}}>
                <p style={{margin:"0 0 6px"}}><strong>Your coordinates never leave your device</strong> except for two specific, user-initiated API calls:</p>
                <p style={{margin:"0 0 4px",paddingLeft:12}}>1. <strong>USDA Soil Data Access</strong> (sdmdataaccess.nrcs.usda.gov) — a U.S. government server that returns soil type data. No personal information is sent, only the point coordinate.</p>
                <p style={{margin:"0 0 4px",paddingLeft:12}}>2. <strong>EPA BLT Pesticide Use Limitation Areas MapServer</strong> (blt.epa.gov) — a U.S. government server that returns PULA boundaries. Same: only the point coordinate is sent.</p>
                <p style={{margin:"0 0 4px"}}><strong>What this tool does NOT do:</strong></p>
                <p style={{margin:"0 0 4px",paddingLeft:12}}>• Does not store your location on any server, database, or analytics platform</p>
                <p style={{margin:"0 0 4px",paddingLeft:12}}>• Does not send your location to Auburn University, ACES, or any third party</p>
                <p style={{margin:"0 0 4px",paddingLeft:12}}>• Does not track, log, or retain coordinates after you close the browser tab</p>
                <p style={{margin:"0 0 4px",paddingLeft:12}}>• Does not run in the background — location is captured only when you click the button</p>
                <p style={{margin:"0 0 0"}}><strong>Technical requirement:</strong> This feature requires HTTPS (secure connection). Your browser will ask permission before sharing location. You can deny it and enter coordinates manually instead.</p>
              </div>
            </div>

            {/* MANUAL COORDINATE ENTRY */}
            <p style={{margin:"0 0 8px",fontSize:14,fontWeight:600,color:k.txM}}>Or enter coordinates manually:</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div><label htmlFor="lat-input" style={s.lb}>Latitude (°N)</label><input id="lat-input" placeholder="e.g. 32.5901" value={lat} onChange={e=>{setLat(e.target.value);setGeoUsed(false);}} style={s.inp}/></div>
              <div><label htmlFor="lon-input" style={s.lb}>Longitude (°W, use negative)</label><input id="lon-input" placeholder="e.g. -85.4944" value={lon} onChange={e=>{setLon(e.target.value);setGeoUsed(false);}} style={s.inp}/></div>
            </div>
          </div>

          {/* HSG LOOKUP */}
          <div style={s.cd}>
            <h2 style={{margin:"0 0 4px",fontSize:16,fontWeight:800}}>Hydrologic Soil Group Lookup</h2>
            <p style={{margin:"0 0 10px",fontSize:14,color:k.txM,lineHeight:1.6}}>
              <strong>Why this matters:</strong> Enlist One and Enlist Duo require <strong>4 runoff mitigation points on HSG A/B soils</strong> but <strong>6 points on HSG C/D soils</strong>. This queries the USDA Soil Data Access API in real time.
            </p>
            <p style={{margin:"0 0 12px",fontSize:14,color:k.txM}}>
              <strong>API:</strong> USDA NRCS Soil Data Access — sdmdataaccess.nrcs.usda.gov/tabular/post.rest &nbsp;|&nbsp; <strong>Query:</strong> SDA_Get_Mukey_from_intersection_with_WktWgs84() → hydgrp from dominant component
            </p>
            <button onClick={lookupHSG} disabled={hsgLoading||!lat||!lon} style={{...s.btn(k.blu,"#fff"),opacity:(hsgLoading||!lat||!lon)?0.5:1}}>{hsgLoading?"Querying USDA...":"Look Up Soil Group (HSG)"}</button>
            {!lat&&<span style={{marginLeft:10,fontSize:14,color:k.txM}}>Set your location above first.</span>}
            {hsgError && <div style={{marginTop:10,padding:"8px 12px",background:k.redBg,borderRadius:6,fontSize:14,color:k.red}}>{hsgError}</div>}
            {hsgResult && <div style={{marginTop:10,padding:"12px 16px",background:k.grnBg,borderRadius:6,border:`1px solid ${k.grnL}`}}>
              <p style={{margin:0,fontSize:15,fontWeight:700,color:k.grn}}>HSG: {hsgResult}</p>
              <p style={{margin:"4px 0 0",fontSize:14,color:k.tx}}>
                {["A","B","A/D","B/D"].includes(hsgResult.toUpperCase())
                  ? "→ Enlist products require 4 runoff mitigation points at this location."
                  : "→ Enlist products require 6 runoff mitigation points at this location (HSG C/D tier)."}
              </p>
              <p style={{margin:"4px 0 0",fontSize:14,color:k.txM}}>Auto-applied to Calculator tab for Enlist products.</p>
            </div>}
          </div>

          {/* PULA CHECK */}
          <div style={s.cd}>
            <h2 style={{margin:"0 0 4px",fontSize:16,fontWeight:800}}>PULA Check (Bulletins Live! Two)</h2>
            <p style={{margin:"0 0 10px",fontSize:14,color:k.txM,lineHeight:1.6}}>
              <strong>Why this matters:</strong> If your field is within a Pesticide Use Limitation Area (PULA), additional mitigation measures beyond the standard label may be required.
            </p>
            <p style={{margin:"0 0 12px",fontSize:14,color:k.txM}}>
              <strong>API:</strong> EPA ArcGIS Map Service (Item ID: 83c55a9cfea24f18a816b7a5933a7eb5) &nbsp;|&nbsp; Spatial intersection query &nbsp;|&nbsp; <strong>For informational use only — generate official bulletins from EPA BLT for compliance.</strong>
            </p>
            <button onClick={checkPULA} disabled={pulaLoading||!lat||!lon} style={{...s.btn(k.pur,"#fff"),opacity:(pulaLoading||!lat||!lon)?0.5:1}}>{pulaLoading?"Querying EPA...":"Check PULAs at This Location"}</button>
            {pulaError && <div style={{marginTop:10,padding:"8px 12px",background:k.redBg,borderRadius:6,fontSize:14,color:k.red}}>{pulaError}</div>}
            {pulaResults && <div style={{marginTop:10,padding:"12px 16px",borderRadius:6,background:pulaResults.found?k.ambBg:k.grnBg,border:`1px solid ${pulaResults.found?k.amb:k.grn}33`}}>
              {pulaResults.found ? <>
                <p style={{margin:0,fontSize:14,fontWeight:700,color:k.amb}}>⚠ {pulaResults.count} PULA{pulaResults.count>1?"s":""} detected at this location</p>
                <p style={{margin:"6px 0 0",fontSize:14,color:k.tx}}>You <strong>must</strong> generate and follow the official bulletin from EPA's Bulletins Live! Two website before application.</p>
                <p style={{margin:"6px 0 0",fontSize:14,color:k.txM}}>What this check knows: PULAs exist at this point. What it does not know: your product or month, or what the bulletin itself requires. This check does not produce a bulletin. The binding determination is the bulletin from EPA's Bulletins Live! Two website for your product and month.</p>
                <a href="https://www.epa.gov/endangered-species/bulletins-live-two-view-bulletins" target="_blank" rel="noopener noreferrer" style={{marginTop:8,...s.btn(k.amb,"#fff"),textDecoration:"none",fontSize:14,display:"inline-flex",alignItems:"center",justifyContent:"center",minHeight:"44px"}}>Open Bulletins Live! Two →</a>
              </> : <>
                <p style={{margin:0,fontSize:14,fontWeight:700,color:k.grn}}>✓ No PULAs detected at this location</p>
                <p style={{margin:"4px 0 0",fontSize:14,color:k.txM}}>Informational only. Always verify with EPA's official BLT system — PULA boundaries are updated dynamically. This is a point-in-time screening result at this location only; it does not prove the field is outside every PULA for every product and month.</p>
              </>}
            </div>}
          </div>
        </>)}

        {/* ═══ REPORT TAB ═══ */}
        {tab === "report" && (<div style={s.cd}>
          <h2 style={{margin:"0 0 4px",fontSize:16,fontWeight:800}}>Printable Compliance Report</h2>
          <p style={{margin:"0 0 6px",fontSize:14,color:k.txM,lineHeight:1.6}}>Generate a printable compliance record documenting your field's ESA mitigation status. <strong>Keeping this report on file with your spray records, as your paper or electronic record of the mitigation measures employed, earns +1 mitigation tracking point</strong> under EPA Mitigation Menu Table 1, provided the listed measures are actually in place.</p>
          {(!county||!crop||plan.length===0)?<p style={{fontSize:14,color:k.amb}}>Complete the Calculator tab first (county, crop, spray plan, and practices).</p>:
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
            <p><strong>Maximum required:</strong> {maxReq} points &nbsp;|&nbsp; <strong>Earned:</strong> {earned} points &nbsp;|&nbsp; <strong>Status:</strong> <span className={ok?"pass":"fail"}>{ok?"Points requirement met — label restrictions not checked":"Points shortfall: "+deficit+" pts"}</span></p>
            <p>This verdict covers runoff/erosion points only. It does not check the label restrictions listed below.</p>
            <table><thead><tr><th>Practice</th><th>Points</th><th>Applied</th></tr></thead>
            <tbody>
              <tr><td>County vulnerability relief ({county})</td><td>{ctyRel}</td><td>Auto</td></tr>
              {PRACT.filter(p=>prac.includes(p.id)).map(p=><tr key={p.id}><td>{p.nm}</td><td>{p.pts}</td><td>Yes</td></tr>)}
              {multiBonus===1&&<tr><td>Multi-category bonus (practices from 2+ categories, EPA Mitigation Menu Table 2)</td><td>1</td><td>Yes</td></tr>}
            </tbody></table>
            <h2>Application Restrictions</h2>
            <p>Max drift buffer: {maxBuf} ft &nbsp;|&nbsp; {sWind ? `Wind: ${windText}${windMinAdv?" (lower bound advisory for Enlist)":""}` : "Wind: Not modelled — check label"} &nbsp;|&nbsp; {sSpd?`Max speed: ${sSpd} mph`:"Max speed: Not modelled — check label"}</p>
            <h2>Label Restrictions This Tool Does NOT Check</h2>
            {plan.filter(h=>h.restr).map(h=>(<div key={h.id}><p><strong>{h.nm} (EPA Reg. {h.reg}):</strong></p><ul>{h.restr.map((r,i)=><li key={i}>{r}</li>)}</ul></div>))}
            {!plan.some(h=>h.restr) && <p>None of the products in this plan has a modelled label restriction in this tool. The label and BLT bulletin may still impose restrictions — check them before application.</p>}
            <p>These restrictions decide whether an application is legal, not just how many points it needs. This tool does not check them — read the label and the BLT bulletin before every application.</p>
          </div>
        </div>)}

        {/* ═══ METHODOLOGY TAB ═══ */}
        {tab === "methods" && (<div style={s.cd}>
          <h2 style={{margin:"0 0 14px",fontSize:18,fontWeight:800}}>Methodology Documentation</h2>
          {[
            {t:"1. Regulatory Framework",b:"EPA's Final Herbicide Strategy (Aug 20, 2024) established a mitigation-points system for runoff/erosion and buffer-based system for spray drift. Implementation is product-by-product during registration/review. As of November 2026, nine products carry points labels: Liberty ULTRA (7969-500), Enlist One (62719-695), Enlist Duo (62719-649), Engenia (7969-507), Stryax (264-1241), Tavium Plus VaporGrip Technology (100-1753), Voraxor (7969-495), Convintro (264-1213), and Empera (59639-262 — 0 points generally, 3 points inside its 6 PULAs, per EPA decision memo EPA-HQ-OPP-2022-0354, not on the label itself). Remaining herbicides receive ESA labels as EPA completes their registration reviews; EPA publishes no fixed timeline for completing all herbicides."},
            {t:"2. County Vulnerability (Limitation 3 addressed)",b:"EPA assigns runoff vulnerability per county using Pesticide Water Calculator (PWC) scenarios (Ecological Mitigation Support Document, Appendix G in v1.0, July 2024). Alabama: 30 High (0 pts), 37 Medium (2 pts), 0 Low/Very Low. Source updated Oct 2024. This calculator's county table will be updated when EPA revises classifications; EPA publishes no revision schedule for the county list. Current data version indicator shown in Data Versions tab."},
            {t:"3. HSG Integration (Limitation 1 RESOLVED)",b:"Enlist products use a tiered point system: 4 points for Hydrologic Soil Group A or B; 6 points for HSG C or D. This version queries USDA's Soil Data Access REST API (sdmdataaccess.nrcs.usda.gov/tabular/post.rest) using SDA_Get_Mukey_from_intersection_with_WktWgs84() to retrieve the dominant component's hydgrp at user-supplied coordinates. The result auto-adjusts Enlist product requirements in the Calculator tab. Dual/undrained groups (e.g., A/D, B/D) are resolved to the drained classification; this assumes the soil can be adequately drained — where drainage is uncertain, use the more limiting (higher-letter) group."},
            {t:"4. PULA Integration (Limitation 2 RESOLVED)",b:"EPA publishes PULA polygons as an ArcGIS Map Service (Item ID: 83c55a9cfea24f18a816b7a5933a7eb5). This version queries layer 0 (\"Effective Pulas\") of the BLT Pesticide Use Limitation Areas MapServer at blt.epa.gov/arcgis/rest/services/BLT/PesticideUsageLimitationAreas/MapServer, with an esriGeometryPoint spatial intersection to detect PULAs at user coordinates. A PULA hit raises the requirement to 6 points for dicamba products and 3 points for Empera; with no PULA result the tool says so plainly instead of assuming the field is outside a PULA. Results are informational — official compliance requires generating bulletins from EPA's Bulletins Live! Two system. The BLT REST API (epa.gov/endangered-species/public-rest-api-bulletins) provides product-specific bulletin data in JSON format."},
            {t:"5. Runoff Points Algorithm",b:"The calculator implements EPA's 7-step workflow: (1) identify products, (2) check for ESA label language, (3) evaluate field exemptions, (4) find product with highest point requirement, (5) sum relief + practice points, (6) compare earned vs required, (7) verify label/bulletin adherence. Points are additive and field-specific, except where EPA marks a Mitigation Menu row 'Select one option' — only one option in such a row may be claimed (conservation tillage, cover crop, VFS/field border, riparian area, sandy soils, rate reduction, proportion treated, irrigation, mulching, terrestrial habitat, filtering devices, technical specialist / non-qualified program), and the earned total is capped at 9 points, the maximum any label can require. The maximum-requirement product sets the target; individual product requirements are not summed. Multi-category bonus: +1 point when selected practices come from at least two of in-field, field-adjacent, or systems that capture runoff and discharge (EPA Mitigation Menu Table 2). All Table 1 relief rows and all Table 2 rows are now selectable, including application parameters (rate reduction, PAM, proportion treated, soil incorporation), short-term cover crop, in-field vegetative strips, irrigation management, mulching, erosion barriers, riparian and terrestrial habitat tiers, filtering devices, and subsurface drainage without a controlled drainage structure. The verdict covers runoff/erosion points only: label restrictions (qualified VRA, temperature and growth-stage cutoffs, aerial bans, annual dicamba training) are listed separately in the Calculator tab and the print report and are not checked by the tool."},
            {t:"6. Compliance Report (Limitation 4 addressed)",b:"The printable report generator creates a formatted HTML document containing field location, spray plan with EPA Registration Numbers, mitigation points assessment, and application restrictions. Under EPA Mitigation Menu Table 1 (Mitigation tracking), a grower/applicator who tracks the mitigations employed on paper or in electronic format, documented at the field or farm level, earns +1 point. Filing this report with spray records can serve as that tracking record, provided the listed measures are actually in place; printing alone, without maintaining the record, does not earn the point."},
            {t:"7. Data Currency (Limitation 3 addressed)",b:"All data sources carry version timestamps in the Data Versions tab. The EPA Mitigation Menu is updated annually in fall. ACES IPM Guides are revised annually (December). County vulnerability classifications are static until EPA revises them. The USDA SDA and EPA BLT APIs return real-time data. Users should verify the Data Versions tab before the start of each spray season."},
          ].map(({t,b})=><div key={t} style={{marginBottom:16}}><h3 style={{margin:"0 0 6px",fontSize:14,fontWeight:700,borderBottom:`1px solid ${k.bdrL}`,paddingBottom:4}}>{t}</h3><p style={{margin:0,fontSize:14,color:k.tx,lineHeight:1.7}}>{b}</p></div>)}
        </div>)}

        {/* ═══ DATA VERSIONS TAB ═══ */}
        {tab === "data" && (<div style={s.cd}>
          <h2 style={{margin:"0 0 4px",fontSize:16,fontWeight:800}}>Data Source Versions</h2>
          <p style={{margin:"0 0 14px",fontSize:14,color:k.txM}}>All data in this calculator is traceable to the sources below. Check before each spray season for updates.</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
            <thead><tr style={{borderBottom:`2px solid ${k.bdr}`}}>{["Source","Version","Last Updated","Next Update Expected","Link"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontWeight:700,color:k.txM,fontSize:14,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
            <tbody>{DATA_VERSIONS.map((d,i)=><tr key={i} style={{borderBottom:`1px solid ${k.bdrL}`}}>
              <td style={{padding:"8px 10px",fontWeight:600}}>{d.src}</td>
              <td style={{padding:"8px 10px"}}>{d.ver}</td>
              <td style={{padding:"8px 10px"}}>{d.date}</td>
              <td style={{padding:"8px 10px",color:k.txM}}>{d.next}</td>
              <td style={{padding:"8px 10px"}}><a href={d.url} target="_blank" rel="noopener noreferrer" style={{color:k.blu,fontSize:14,display:"inline-block",padding:"10px",minHeight:"44px",boxSizing:"border-box"}}>Source →</a></td>
            </tr>)}</tbody>
          </table>
        </div>)}

        {/* ═══ REFERENCES TAB ═══ */}
        {tab === "refs" && (<div style={s.cd}>
          <h2 style={{margin:"0 0 14px",fontSize:18,fontWeight:800}}>References</h2>
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
              "Chism, B. et al. (2026). The Endangered Species Act: 2026 Training. WSSA.",
              "CropLife America. (2026). Adapting to ESA Video Series.",
            ]},
          ].map(({c:cat,r})=><div key={cat} style={{marginBottom:16}}>
            <h3 style={{margin:"0 0 6px",fontSize:14,fontWeight:700,color:k.acc,textTransform:"uppercase",letterSpacing:"0.5px"}}>{cat}</h3>
            {r.map((ref,i)=><p key={i} style={{margin:"0 0 4px",fontSize:14,paddingLeft:14,textIndent:-14,lineHeight:1.6}}>{ref}</p>)}
          </div>)}
        </div>)}

        <footer style={{textAlign:"center",padding:"20px 0 32px",fontSize:14,color:k.txL,lineHeight:1.8}}>
          <p style={{margin:"0 0 6px",fontWeight:600,color:k.tx}}>Managed and developed by Gourav Chahal, PhD student, working under Dr. David Russell and Dr. Andrew Price</p>
          <p style={{margin:0}}>Alabama ESA Mitigation Points Calculator v2.1 · Data verified: {LAST_DATA_UPDATE}</p>
          <p style={{margin:0}}>For planning purposes only — the product label is the law · Contact: gzc0063@auburn.edu</p>
        </footer>
      </div>
    </div>
  );
}

function MC({l,v,su,co}){
  return <div style={{background:"#f7f5f2",borderRadius:7,padding:"10px 12px",borderLeft:`3px solid ${co}`}}>
    <div style={{fontSize:14,color:"#847660",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>{l}</div>
    <div style={{fontSize:20,fontWeight:800,color:co,margin:"3px 0 1px"}}>{v}</div>
    <div style={{fontSize:14,color:"#b0a48e"}}>{su}</div>
  </div>;
}
