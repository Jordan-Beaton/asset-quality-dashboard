"use client";

import type { ChangeEvent, CSSProperties, ReactNode, RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { ImsPermissionNotice, useImsPermissions } from "../../../src/components/ImsPermissions";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import { supabase } from "../../../src/lib/supabase";

export const dynamic = "force-dynamic";

type InspectionView = "dashboard" | "register" | "create";
type InspectionStatus = "Draft" | "Open" | "Complete" | "Closed";
type ChecklistAnswer = "N/A" | "Yes" | "No" | "";

type InspectionTemplate = {
  id: string;
  documentNumber: string;
  revision: string;
  revisionDate: string;
  title: string;
  description: string;
  focus: string[];
  sections: string[];
  enabled: boolean;
};

type ChecklistItem = {
  id: string;
  number: string;
  text: string;
};

type ChecklistSection = {
  id: string;
  title: string;
  items: ChecklistItem[];
};

type ChecklistResponse = {
  answer: ChecklistAnswer;
  comments: string;
};

type InspectionAction = {
  action: string;
  action_by: string;
  target_date: string;
};

type HseInspectionRecord = {
  id: string;
  inspection_number: string;
  form_id: string;
  form_number: string;
  form_revision: string | null;
  form_revision_date: string | null;
  form_title: string;
  title: string;
  department: string | null;
  project_work_scope: string | null;
  vessel_spread: string | null;
  area_zone: string | null;
  inspection_date: string | null;
  inspector_name: string | null;
  inspector_position: string | null;
  status: InspectionStatus;
  checklist_responses: Record<string, ChecklistResponse>;
  additional_comments: string | null;
  actions: InspectionAction[];
  signoff_name: string | null;
  signoff_position: string | null;
  signoff_company: string | null;
  signoff_date: string | null;
  created_at: string;
  updated_at: string;
};

type InspectionEvidence = {
  id: string;
  inspection_id: string;
  item_number: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  notes: string | null;
  uploaded_at: string;
};

type CentralAction = {
  id: string;
  action_number: string | null;
  title: string | null;
  owner: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  source: string | null;
  linked_hse_inspection_id?: string | null;
  linked_hse_inspection_number?: string | null;
};

type PeopleOption = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  department: string | null;
  active: boolean | null;
};

type PendingEvidence = {
  id: string;
  file: File;
  item_number: string;
};

const evidenceBucket = "quality-evidence";
const defaultTemplateId = "workplace-base-site";

const inspectionTemplates: InspectionTemplate[] = [
  {
    id: "vessel-pre-sail",
    documentNumber: "ENS-HSEQ-FRM-046",
    revision: "B",
    revisionDate: "2024-02-08",
    title: "Vessel Pre-Sail Inspection",
    description: "Pre-sail readiness check for vessel condition, operational controls, permits, emergency preparedness, and close-out actions.",
    focus: ["Vessel readiness", "Operational controls", "Emergency preparedness", "Evidence photos"],
    sections: ["Vessel details", "Crew and readiness", "Safety equipment", "Deck and lifting controls", "Emergency response", "Actions and evidence"],
    enabled: true,
  },
  {
    id: "workplace-office",
    documentNumber: "ENS-HSEQ-FRM-041",
    revision: "B",
    revisionDate: "2024-02-23",
    title: "Workplace Inspection - Office",
    description: "Office workplace inspection covering welfare, housekeeping, fire safety, access, electrical safety, and local actions.",
    focus: ["Office safety", "Housekeeping", "Fire/access controls", "Corrective actions"],
    sections: ["Inspection details", "Office environment", "Fire and emergency controls", "Electrical and workstation checks", "Findings", "Actions and evidence"],
    enabled: true,
  },
  {
    id: "workplace-offshore",
    documentNumber: "ENS-HSEQ-FRM-042",
    revision: "B",
    revisionDate: "2023-08-10",
    title: "Workplace Inspection - Offshore",
    description: "Offshore workplace inspection for live worksite conditions, equipment, emergency arrangements, and operational controls.",
    focus: ["Offshore worksite", "Equipment condition", "Permit controls", "Evidence photos"],
    sections: ["Inspection details", "Worksite controls", "Equipment and tools", "Permit and procedural controls", "Emergency arrangements", "Actions and evidence"],
    enabled: true,
  },
  {
    id: "workplace-mobilisation",
    documentNumber: "ENS-HSEQ-FRM-043",
    revision: "B",
    revisionDate: "2024-02-23",
    title: "Workplace Inspection - Mobilisation",
    description: "Mobilisation inspection for project readiness, packing, lifting, documents, equipment, and handover controls.",
    focus: ["Mobilisation readiness", "Packing/lifting", "Documentation", "Close-out actions"],
    sections: ["Mobilisation details", "Equipment readiness", "Packing and lifting", "Documentation and certification", "Findings", "Actions and evidence"],
    enabled: true,
  },
  {
    id: defaultTemplateId,
    documentNumber: "ENS-HSEQ-FRM-044",
    revision: "E",
    revisionDate: "2026-05-19",
    title: "Workplace Inspection - Base and Site",
    description: "Base and site workplace inspection for yard, workshop, stores, access, welfare, emergency controls, and local observations.",
    focus: ["Base/site condition", "Workshop and stores", "Access/welfare", "Inspection evidence"],
    sections: ["Inspection details", "Administration and documentation", "Working area", "Machinery, equipment and tools", "Storage area", "Actions and sign-off"],
    enabled: true,
  },
  {
    id: "dropped-objects",
    documentNumber: "ENS-HSEQ-FRM-045",
    revision: "B",
    revisionDate: "2024-02-23",
    title: "Workplace Inspection - Dropped Objects",
    description: "Dropped object focused inspection covering work at height, securing arrangements, tool control, exclusion zones, and corrective actions.",
    focus: ["Dropped object prevention", "Securing arrangements", "Tool control", "Action close-out"],
    sections: ["Inspection details", "Dropped object controls", "Work at height", "Tools and equipment", "Exclusion zones", "Actions and evidence"],
    enabled: true,
  },
];

const baseSiteChecklist: ChecklistSection[] = [
  {
    id: "admin",
    title: "1.0 Administration and Documentation",
    items: [
      { id: "1.1", number: "1.1", text: "Risk Assessment and Task Plan (as applicable) available for work performed?" },
      { id: "1.2", number: "1.2", text: "Permit to Work (as applicable) available for work performed?" },
      { id: "1.3", number: "1.3", text: "Toolbox Talk delivered and documented for work / attendance?" },
      { id: "1.4", number: "1.4", text: "Lift Plan (as applicable) available for work performed?" },
      { id: "1.5", number: "1.5", text: "HSE Notice Board is up to date?" },
      { id: "1.6", number: "1.6", text: "Other administration/documentation observations." },
    ],
  },
  {
    id: "working_area",
    title: "2.0 Working Area",
    items: [
      { id: "2.1", number: "2.1", text: "Housekeeping is satisfactory?" },
      { id: "2.2", number: "2.2", text: "Ventilation is satisfactory?" },
      { id: "2.3", number: "2.3", text: "Lighting is satisfactory?" },
      { id: "2.4", number: "2.4", text: "Noise levels satisfactory or managed where applicable?" },
      { id: "2.5", number: "2.5", text: "Waste segregation in place and implemented?" },
      { id: "2.6", number: "2.6", text: "Visible obstructions are highlighted?" },
      { id: "2.7", number: "2.7", text: "Cabling condition is satisfactory?" },
      { id: "2.8", number: "2.8", text: "Ladders identification, condition, use and storage is satisfactory?" },
      { id: "2.9", number: "2.9", text: "Barriers / railings are satisfactory?" },
      { id: "2.10", number: "2.10", text: "Escape exits are satisfactory?" },
      { id: "2.11", number: "2.11", text: "Evacuation routes are satisfactory?" },
      { id: "2.12", number: "2.12", text: "Safety signs are available and satisfactory?" },
      { id: "2.13", number: "2.13", text: "PPE arrangements are complied with?" },
      { id: "2.14", number: "2.14", text: "Chemical control is satisfactory?" },
      { id: "2.15", number: "2.15", text: "Spill kits are available where required and stocked?" },
      { id: "2.16", number: "2.16", text: "Bunded storage areas are satisfactory?" },
      { id: "2.17", number: "2.17", text: "Container storage areas are satisfactory?" },
      { id: "2.18", number: "2.18", text: "Fire extinguishers available and inspection date current?" },
      { id: "2.19", number: "2.19", text: "Eye wash station available and satisfactory?" },
      { id: "2.20", number: "2.20", text: "Fire alarm tested and logbook up to date?" },
      { id: "2.21", number: "2.21", text: "Walkways are satisfactory?" },
      { id: "2.22", number: "2.22", text: "Roller shutter doors are secure and control access appropriately?" },
      { id: "2.23", number: "2.23", text: "Door integrity satisfactory with no obvious damage, warping, or misalignment?" },
      { id: "2.24", number: "2.24", text: "Guide tracks and supports visually/physically checked for obstructions or damage?" },
      { id: "2.25", number: "2.25", text: "Fire/egress clearance around doors maintained?" },
      { id: "2.26", number: "2.26", text: "Safety devices functional, including automatic closing, safety edges, manual chains?" },
      { id: "2.27", number: "2.27", text: "Remote controls or wall switches functioning and labelled?" },
      { id: "2.28", number: "2.28", text: "Emergency stop accessible and tested?" },
      { id: "2.29", number: "2.29", text: "Door opens/closes smoothly without unusual noises or resistance?" },
      { id: "2.30", number: "2.30", text: "Pinch points and gaps guarded to prevent injury?" },
      { id: "2.31", number: "2.31", text: "Maintenance and service records up to date?" },
      { id: "2.32", number: "2.32", text: "No signs of leaks, weather seal damage, or water ingress around the area?" },
      { id: "2.33", number: "2.33", text: "People trained in safe operation and use of roller shutter doors?" },
      { id: "2.34", number: "2.34", text: "Shutdown/lockout procedures in place for maintenance?" },
      { id: "2.35", number: "2.35", text: "Welfare changing rooms are satisfactory?" },
      { id: "2.36", number: "2.36", text: "Welfare toilets are satisfactory?" },
      { id: "2.37", number: "2.37", text: "Welfare eating room is satisfactory?" },
      { id: "2.38", number: "2.38", text: "General PC and office equipment setup is satisfactory?" },
      { id: "2.39", number: "2.39", text: "First Aid provision is satisfactory?" },
      { id: "2.40", number: "2.40", text: "Other working area observations." },
    ],
  },
  {
    id: "machinery",
    title: "3.0 Machinery, Equipment and Tools",
    items: [
      { id: "3.1", number: "3.1", text: "Forklift truck inspection form completed and safety systems satisfactory?" },
      { id: "3.2", number: "3.2", text: "Forklift operator named and trained for use?" },
      { id: "3.3", number: "3.3", text: "Cherry picker inspection form completed and safety systems satisfactory?" },
      { id: "3.4", number: "3.4", text: "Cherry picker operator named and trained for use?" },
      { id: "3.5", number: "3.5", text: "Overhead crane inspection form completed?" },
      { id: "3.6", number: "3.6", text: "Crane thorough examination certification available?" },
      { id: "3.7", number: "3.7", text: "Emergency stop button tested and satisfactory?" },
      { id: "3.8", number: "3.8", text: "Machinery free from signs of leaks or spillages?" },
      { id: "3.9", number: "3.9", text: "Crane operator named and trained for use?" },
      { id: "3.10", number: "3.10", text: "Lifting equipment colour coding implemented?" },
      { id: "3.11", number: "3.11", text: "Lifting equipment certification available?" },
      { id: "3.12", number: "3.12", text: "Portable appliance testing is completed?" },
      { id: "3.13", number: "3.13", text: "Other machinery, equipment, or tools observations." },
    ],
  },
  {
    id: "storage",
    title: "4.0 Storage Area",
    items: [
      { id: "4.1", number: "4.1", text: "Housekeeping is satisfactory?" },
      { id: "4.2", number: "4.2", text: "Access and egress are satisfactory?" },
      { id: "4.3", number: "4.3", text: "Waste segregation is implemented?" },
      { id: "4.4", number: "4.4", text: "Bunded storage areas are satisfactory?" },
      { id: "4.5", number: "4.5", text: "Chemical spill kits are available for use?" },
      { id: "4.6", number: "4.6", text: "Container storage area is satisfactory?" },
      { id: "4.7", number: "4.7", text: "General security is satisfactory?" },
      { id: "4.8", number: "4.8", text: "Chemical storage is satisfactory?" },
      { id: "4.9", number: "4.9", text: "Chemical data sheets / assessments are available?" },
      { id: "4.10", number: "4.10", text: "Document archive area secure and dry with shelving/boxes intact?" },
      { id: "4.11", number: "4.11", text: "Other storage area observations." },
    ],
  },
];

const officeChecklist: ChecklistSection[] = [
  {
    id: "office_access",
    title: "1.0 Access and Egress",
    items: [
      { id: "1.1", number: "1.1", text: "Ramps / steps around building satisfactory?" },
      { id: "1.2", number: "1.2", text: "Stairways in building satisfactory?" },
      { id: "1.3", number: "1.3", text: "Elevator satisfactory and examination in date?" },
      { id: "1.4", number: "1.4", text: "Other access and egress observations." },
    ],
  },
  {
    id: "office",
    title: "2.0 Office",
    items: [
      { id: "2.1", number: "2.1", text: "Housekeeping / cleanliness satisfactory?" },
      { id: "2.2", number: "2.2", text: "Eating and drinking facilities satisfactory?" },
      { id: "2.3", number: "2.3", text: "Toilets and washing facilities satisfactory?" },
      { id: "2.4", number: "2.4", text: "Ventilation satisfactory?" },
      { id: "2.5", number: "2.5", text: "Lighting satisfactory?" },
      { id: "2.6", number: "2.6", text: "Noise levels satisfactory?" },
      { id: "2.7", number: "2.7", text: "Waste segregation satisfactory?" },
      { id: "2.8", number: "2.8", text: "Cabling condition satisfactory?" },
      { id: "2.9", number: "2.9", text: "Handrails satisfactory?" },
      { id: "2.10", number: "2.10", text: "Computer set-up satisfactory?" },
      { id: "2.11", number: "2.11", text: "Workstation ergonomics satisfactory?" },
      { id: "2.12", number: "2.12", text: "Portable Appliance Testing completed?" },
      { id: "2.13", number: "2.13", text: "Hazard signage satisfactory?" },
      { id: "2.14", number: "2.14", text: "HSE Notice Board up to date?" },
      { id: "2.15", number: "2.15", text: "Other office observations." },
    ],
  },
  {
    id: "floor_surface",
    title: "3.0 Floor Surface",
    items: [
      { id: "3.1", number: "3.1", text: "Wet / slippery floor surfaces?" },
      { id: "3.2", number: "3.2", text: "Uneven / worn floor surfaces?" },
      { id: "3.3", number: "3.3", text: "Trip hazards present?" },
      { id: "3.4", number: "3.4", text: "Loose surface / loose items present?" },
      { id: "3.5", number: "3.5", text: "Obstructions present?" },
      { id: "3.6", number: "3.6", text: "Other floor surface observations." },
    ],
  },
  {
    id: "fire_emergency",
    title: "4.0 Fire and Emergency Safety",
    items: [
      { id: "4.1", number: "4.1", text: "Escape exits clear?" },
      { id: "4.2", number: "4.2", text: "Evacuation routes clear?" },
      { id: "4.3", number: "4.3", text: "Safety signs, fire, first aid in place?" },
      { id: "4.4", number: "4.4", text: "Fire alarm logbook up to date?" },
      { id: "4.5", number: "4.5", text: "First aid equipment available and up to date?" },
      { id: "4.6", number: "4.6", text: "Defibrillator available and checked?" },
      { id: "4.7", number: "4.7", text: "First Aider on-site recorded?" },
      { id: "4.8", number: "4.8", text: "Other fire and emergency safety observations." },
    ],
  },
  {
    id: "cleaners_cupboard",
    title: "5.0 Cleaners Cupboard",
    items: [
      { id: "5.1", number: "5.1", text: "PPE signage in place?" },
      { id: "5.2", number: "5.2", text: "COSHH assessments available and in place?" },
      { id: "5.3", number: "5.3", text: "PPE available for use?" },
      { id: "5.4", number: "5.4", text: "Storage adequate for supplies?" },
      { id: "5.5", number: "5.5", text: "Step ladders condition satisfactory?" },
      { id: "5.6", number: "5.6", text: "Other cleaners cupboard observations." },
    ],
  },
];

const vesselPreSailChecklist: ChecklistSection[] = [
  {
    id: "vessel_access",
    title: "3.0 Vessel Access",
    items: [
      { id: "3.1", number: "3.1", text: "Are walkways satisfactory? Clearly identified, clear of obstructions, and free from hazards?" },
      { id: "3.2", number: "3.2", text: "Have deck fastenings which pose a tripping hazard been highlighted?" },
      { id: "3.3", number: "3.3", text: "Has an evaluation been made of the adequacy of the lighting on the back deck?" },
      { id: "3.4", number: "3.4", text: "Are emergency walkways / exits clearly identified and free from obstructions?" },
      { id: "3.5", number: "3.5", text: "Has placement of mobilized equipment been assessed in relation to emergency walkways / exits?" },
    ],
  },
  {
    id: "inductions_project_docs",
    title: "4.0 Inductions and Project Documentation",
    items: [
      { id: "4.1", number: "4.1", text: "Does the vessel have an induction for on-signers, visitors, and sub-contractors?" },
      { id: "4.2", number: "4.2", text: "Is there evidence that vessel inductions have been carried out?" },
      { id: "4.3", number: "4.3", text: "Is the Enshore Senior Person on board in possession of client approved project HSE documents?" },
      { id: "4.4", number: "4.4", text: "Can the Enshore Senior Person on board access the Enshore Management System?" },
    ],
  },
  {
    id: "hse_information",
    title: "5.0 HSE Information",
    items: [
      { id: "5.1", number: "5.1", text: "Are current versions of the Enshore Policies posted on the notice boards?" },
      { id: "5.2", number: "5.2", text: "Are safety bulletins and communications displayed on the notice boards?" },
      { id: "5.3", number: "5.3", text: "Are signs displayed detailing PPE requirements?" },
      { id: "5.4", number: "5.4", text: "Are warning signs posted for specific hazards such as noise, rotating equipment, and hazardous substances?" },
    ],
  },
  {
    id: "ppe",
    title: "6.0 Personal Protective Equipment",
    items: [
      { id: "6.1", number: "6.1", text: "Is there evidence of personnel not complying with minimum PPE requirements?" },
      { id: "6.2", number: "6.2", text: "Is there evidence of poor standard PPE such as contaminated coveralls or exposed steel toe caps?" },
      { id: "6.3", number: "6.3", text: "Are there adequate stock levels and suitable storage facilities for PPE?" },
    ],
  },
  {
    id: "proactive_safety",
    title: "7.0 Proactive Safety Management",
    items: [
      { id: "7.1", number: "7.1", text: "Are proactive safety management tools being undertaken as per project KPIs and available?" },
      { id: "7.2", number: "7.2", text: "Does the toolbox talk accurately reflect the work being carried out during the inspection?" },
      { id: "7.3", number: "7.3", text: "Are actions identified in workplace inspections being managed and closed out?" },
      { id: "7.4", number: "7.4", text: "Are daily progress meetings planned / held with HSE topics suitably covered?" },
      { id: "7.5", number: "7.5", text: "Has a dropped objects inspection been carried out and actions completed?" },
      { id: "7.6", number: "7.6", text: "Are observation cards available and are actions being managed and closed out?" },
    ],
  },
  {
    id: "risk_management",
    title: "8.0 Risk Management",
    items: [
      { id: "8.1", number: "8.1", text: "Are operational risk assessments developed and approved for use?" },
      { id: "8.2", number: "8.2", text: "Have the risk assessments been communicated to Enshore and applicable parties?" },
    ],
  },
  {
    id: "lifting",
    title: "9.0 Lifting Operations",
    items: [
      { id: "9.1", number: "9.1", text: "Sample a lifting accessory. Is there means to identify that a thorough examination has been performed?" },
      { id: "9.2", number: "9.2", text: "Can the sampled lifting accessory be traced back to the Lifting Equipment Register?" },
      { id: "9.3", number: "9.3", text: "Insert description of the sampled lifting accessory." },
      { id: "9.4", number: "9.4", text: "Are there satisfactory means of locking the rigging store(s)?" },
      { id: "9.5", number: "9.5", text: "Is there suitable lighting in the rigging store?" },
      { id: "9.6", number: "9.6", text: "Is there a maintained Rigger Register?" },
      { id: "9.7", number: "9.7", text: "Is there a defined quarantine area?" },
      { id: "9.8", number: "9.8", text: "Are Enshore personnel on board competent to develop / review lift plans?" },
      { id: "9.9", number: "9.9", text: "Are lifting plans available and approved for use?" },
    ],
  },
  {
    id: "working_height",
    title: "10.0 Working at Height",
    items: [
      { id: "10.1", number: "10.1", text: "Sample WAH equipment. Is there means to identify that an inspection has been performed?" },
      { id: "10.2", number: "10.2", text: "Is there suitable storage for WAH equipment to prevent damage and degradation?" },
      { id: "10.3", number: "10.3", text: "Insert description of the sampled WAH equipment." },
      { id: "10.4", number: "10.4", text: "Are ladders, step ladders or scaffold towers stored safely to prevent accidental movement?" },
      { id: "10.5", number: "10.5", text: "Sample access equipment. Is there evidence of an inspection record?" },
      { id: "10.6", number: "10.6", text: "Insert description of the sampled access equipment." },
      { id: "10.7", number: "10.7", text: "Are rescue plans in place for working at height activities?" },
      { id: "10.8", number: "10.8", text: "Have rescue plans been communicated to personnel involved in the activity?" },
      { id: "10.9", number: "10.9", text: "Are contingency provisions in place to execute the rescue plans?" },
    ],
  },
  {
    id: "hazardous_substances",
    title: "11.0 Hazardous Substances",
    items: [
      { id: "11.1", number: "11.1", text: "Is there a Hazardous Substances Register on board the vessel?" },
      { id: "11.2", number: "11.2", text: "Do personnel on board have access to the Enshore COSHH Inventory?" },
      { id: "11.3", number: "11.3", text: "Sample a hazardous substance. Is it included in the Hazardous Substances Register?" },
      { id: "11.4", number: "11.4", text: "Does the sampled hazardous substance have an associated chemical assessment?" },
      { id: "11.5", number: "11.5", text: "Insert description of the sampled hazardous substance." },
      { id: "11.6", number: "11.6", text: "Are spill kits strategically located around operational areas?" },
      { id: "11.7", number: "11.7", text: "Is there sufficient surplus stock of spill kits on board?" },
    ],
  },
  {
    id: "electrical",
    title: "12.0 Electrical Equipment",
    items: [
      { id: "12.1", number: "12.1", text: "Sample an electrical power tool. Is the tool tagged to identify it has been inspected?" },
      { id: "12.2", number: "12.2", text: "Is a register in place detailing electrical equipment and last inspection date?" },
      { id: "12.3", number: "12.3", text: "Insert description of the sampled power tool." },
    ],
  },
  {
    id: "occupational_health",
    title: "13.0 Protection Against Occupational Illness / Injuries",
    items: [
      { id: "13.1", number: "13.1", text: "Is sufficient hearing protection available on board the vessel?" },
      { id: "13.2", number: "13.2", text: "Does RPE provide sufficient protection against expected airborne hazards?" },
      { id: "13.3", number: "13.3", text: "Is there sufficient stock of Respiratory Protective Equipment on board?" },
      { id: "13.4", number: "13.4", text: "Are provisions in place to protect personnel from UV damage?" },
      { id: "13.5", number: "13.5", text: "Are provisions in place to ensure personnel can remain hydrated whilst working?" },
    ],
  },
  {
    id: "waste_housekeeping",
    title: "14.0 Waste Management / Housekeeping",
    items: [
      { id: "14.1", number: "14.1", text: "Is there provision for waste segregation on board the vessel?" },
      { id: "14.2", number: "14.2", text: "Are waste receptacles clearly marked?" },
      { id: "14.3", number: "14.3", text: "Is there evidence of cross-contamination of waste?" },
    ],
  },
  {
    id: "emergency_response",
    title: "15.0 Emergency Response",
    items: [
      { id: "15.1", number: "15.1", text: "Are Emergency Notification Charts posted in key vessel locations?" },
      { id: "15.2", number: "15.2", text: "Does the chart detail local emergency services and nearest hospital contact information?" },
      { id: "15.3", number: "15.3", text: "Has a verification check been carried out on one or more emergency contacts?" },
      { id: "15.4", number: "15.4", text: "Is there a muster drill planned within 24 hours after leaving port?" },
      { id: "15.5", number: "15.5", text: "Are there sufficient survival suits on board the vessel?" },
      { id: "15.6", number: "15.6", text: "Are there sufficient life jackets on board the vessel?" },
      { id: "15.7", number: "15.7", text: "Sample a life jacket. Has service been carried out in the last 12 months?" },
      { id: "15.8", number: "15.8", text: "Is there sufficient first aid / medical response and provision on board?" },
    ],
  },
];

const offshoreChecklist: ChecklistSection[] = [
  {
    id: "offshore_emergency",
    title: "1.0 Emergency Response and Safety",
    items: [
      { id: "1.1", number: "1.1", text: "Are emergency exits / routes clearly signed?" },
      { id: "1.2", number: "1.2", text: "Are emergency exits / routes free of obstructions / hazards?" },
      { id: "1.3", number: "1.3", text: "Are muster stations clearly identified?" },
      { id: "1.4", number: "1.4", text: "Are muster stations and emergency routes clearly illuminated?" },
      { id: "1.5", number: "1.5", text: "Date of last emergency muster / drill recorded?" },
      { id: "1.6", number: "1.6", text: "Is lifesaving equipment available, in good condition, and easy to access?" },
      { id: "1.7", number: "1.7", text: "Fire extinguishers in correct positions?" },
      { id: "1.8", number: "1.8", text: "Fire / emergency alarm in place and tested?" },
      { id: "1.9", number: "1.9", text: "Are emergency contact numbers available?" },
      { id: "1.10", number: "1.10", text: "AED, stretchers, first aid arrangements and eyewash stations in place and satisfactory?" },
      { id: "1.11", number: "1.11", text: "Safety / danger / warning / PPE signs satisfactory?" },
      { id: "1.12", number: "1.12", text: "Other emergency response and safety observations." },
    ],
  },
  {
    id: "offshore_environment",
    title: "2.0 Environmental Control and Waste Management",
    items: [
      { id: "2.1", number: "2.1", text: "Is waste segregated while offshore?" },
      { id: "2.2", number: "2.2", text: "Is there any evidence of waste cross contamination?" },
      { id: "2.3", number: "2.3", text: "Is waste segregated for onshore collection during port calls?" },
      { id: "2.4", number: "2.4", text: "Are chemicals stored in a safe manner?" },
      { id: "2.5", number: "2.5", text: "Are fumes generated by plant/generators acceptable?" },
      { id: "2.6", number: "2.6", text: "Are bunded storage areas free of oil / acceptable?" },
      { id: "2.7", number: "2.7", text: "Are spill kits available and fully stocked where required?" },
      { id: "2.8", number: "2.8", text: "Are drip trays available at required locations?" },
      { id: "2.9", number: "2.9", text: "Other environmental control observations." },
    ],
  },
  {
    id: "offshore_worksite",
    title: "3.0 General Worksite and Deck Working Area",
    items: [
      { id: "3.1", number: "3.1", text: "Housekeeping / cleanliness internal and external areas satisfactory?" },
      { id: "3.2", number: "3.2", text: "Permit to Work and isolation in place?" },
      { id: "3.3", number: "3.3", text: "Sea fastenings satisfactory?" },
      { id: "3.4", number: "3.4", text: "Ventilation satisfactory?" },
      { id: "3.5", number: "3.5", text: "Lighting satisfactory?" },
      { id: "3.6", number: "3.6", text: "Noise levels satisfactory?" },
      { id: "3.7", number: "3.7", text: "Obstructions highlighted / removed?" },
      { id: "3.8", number: "3.8", text: "Slip / trip / fall hazards highlighted / removed?" },
      { id: "3.9", number: "3.9", text: "Wet / slippery surfaces identified?" },
      { id: "3.10", number: "3.10", text: "Uneven / worn surfaces identified?" },
      { id: "3.11", number: "3.11", text: "Areas free from potential falling objects?" },
      { id: "3.12", number: "3.12", text: "Contaminated materials identified?" },
      { id: "3.13", number: "3.13", text: "Loose surfaces / loose items identified?" },
      { id: "3.14", number: "3.14", text: "Cabling condition satisfactory?" },
      { id: "3.15", number: "3.15", text: "Cabling securing arrangement satisfactory?" },
      { id: "3.16", number: "3.16", text: "Lifting wire and attachments visually satisfactory?" },
      { id: "3.17", number: "3.17", text: "Edge protection, guardrails, handrails, fences and accessories satisfactory?" },
      { id: "3.18", number: "3.18", text: "Gas cylinder storage satisfactory?" },
      { id: "3.19", number: "3.19", text: "Ladders condition satisfactory?" },
      { id: "3.20", number: "3.20", text: "Ladders securing arrangements satisfactory?" },
      { id: "3.21", number: "3.21", text: "Ladders identification in place?" },
      { id: "3.22", number: "3.22", text: "Stairways condition satisfactory?" },
      { id: "3.23", number: "3.23", text: "First aid and eyewash stations satisfactory?" },
      { id: "3.24", number: "3.24", text: "Other worksite and deck observations." },
    ],
  },
  {
    id: "offshore_storage",
    title: "4.0 Storage and Workshop Areas",
    items: [
      { id: "4.1", number: "4.1", text: "General housekeeping satisfactory?" },
      { id: "4.2", number: "4.2", text: "Chemicals stored correctly?" },
      { id: "4.3", number: "4.3", text: "COSHH records available?" },
      { id: "4.4", number: "4.4", text: "Safety information signage satisfactory?" },
      { id: "4.5", number: "4.5", text: "Areas free from potential falling objects?" },
      { id: "4.6", number: "4.6", text: "Machinery condition satisfactory?" },
      { id: "4.7", number: "4.7", text: "Adequate isolations in place?" },
      { id: "4.8", number: "4.8", text: "Noise levels satisfactory?" },
      { id: "4.9", number: "4.9", text: "Emergency exits highlighted?" },
      { id: "4.10", number: "4.10", text: "First aid and eyewash stations satisfactory?" },
      { id: "4.11", number: "4.11", text: "Other storage/workshop observations." },
    ],
  },
  {
    id: "offshore_equipment",
    title: "5.0 Machinery / Equipment / Tool / Control Cabin",
    items: [
      { id: "5.1", number: "5.1", text: "General housekeeping satisfactory?" },
      { id: "5.2", number: "5.2", text: "Machinery guards in place?" },
      { id: "5.3", number: "5.3", text: "Emergency stops identified and tested?" },
      { id: "5.4", number: "5.4", text: "Connection points and structure satisfactory?" },
      { id: "5.5", number: "5.5", text: "Equipment securely fastened?" },
      { id: "5.6", number: "5.6", text: "Machinery free from leaks or spillages?" },
      { id: "5.7", number: "5.7", text: "Operating instructions available?" },
      { id: "5.8", number: "5.8", text: "Portable Appliance Testing completed?" },
      { id: "5.9", number: "5.9", text: "Cabling condition / management satisfactory?" },
      { id: "5.10", number: "5.10", text: "PPE requirements identified and complied with?" },
      { id: "5.11", number: "5.11", text: "Safety signs satisfactory?" },
      { id: "5.12", number: "5.12", text: "Cleanliness satisfactory?" },
      { id: "5.13", number: "5.13", text: "Storage facilities satisfactory?" },
      { id: "5.14", number: "5.14", text: "Lifting gear colour coding in place?" },
      { id: "5.15", number: "5.15", text: "Lifting gear certification available?" },
      { id: "5.16", number: "5.16", text: "Computer general setup satisfactory?" },
      { id: "5.17", number: "5.17", text: "Noise levels satisfactory?" },
      { id: "5.18", number: "5.18", text: "Communication with bridge in place?" },
      { id: "5.19", number: "5.19", text: "First aid and eyewash stations satisfactory?" },
      { id: "5.20", number: "5.20", text: "Other machinery/equipment observations." },
    ],
  },
  {
    id: "offshore_personnel",
    title: "6.0 Personnel",
    items: [
      { id: "6.1", number: "6.1", text: "Procedures and task plans available and in place?" },
      { id: "6.2", number: "6.2", text: "Work equipment assessments completed?" },
      { id: "6.3", number: "6.3", text: "Permit to Work available and in place?" },
      { id: "6.4", number: "6.4", text: "Toolbox talks available and in place?" },
      { id: "6.5", number: "6.5", text: "Risk assessments available and in place?" },
      { id: "6.6", number: "6.6", text: "Lift plans available and in place?" },
      { id: "6.7", number: "6.7", text: "Other personnel observations." },
    ],
  },
  {
    id: "offshore_procedures",
    title: "7.0 Procedures",
    items: [
      { id: "7.1", number: "7.1", text: "Procedures and task plans available and in place?" },
      { id: "7.2", number: "7.2", text: "Work equipment assessments completed?" },
      { id: "7.3", number: "7.3", text: "Permit to Work available and in place?" },
      { id: "7.4", number: "7.4", text: "Toolbox talks available and in place?" },
      { id: "7.5", number: "7.5", text: "Risk assessments available and in place?" },
      { id: "7.6", number: "7.6", text: "Lift plans available and in place?" },
      { id: "7.7", number: "7.7", text: "COSHH controls in place and records available?" },
      { id: "7.8", number: "7.8", text: "Other procedure observations." },
    ],
  },
];

const mobilisationChecklist: ChecklistSection[] = [
  {
    id: "mobilisation_worksite",
    title: "1.0 General Worksite",
    items: [
      { id: "1.1", number: "1.1", text: "Parking sufficient and away from worksite?" },
      { id: "1.2", number: "1.2", text: "Security in place and emergency contact list available?" },
      { id: "1.3", number: "1.3", text: "Area free from potential falling objects?" },
      { id: "1.4", number: "1.4", text: "Sufficient warning and information signage in place?" },
      { id: "1.5", number: "1.5", text: "Permit to Work process available and in place?" },
      { id: "1.6", number: "1.6", text: "Receipt of materials satisfactorily controlled, including vessel fuel receipt and intake?" },
      { id: "1.7", number: "1.7", text: "Access / egress to and from vessel satisfactory?" },
      { id: "1.8", number: "1.8", text: "Lifting plan available and in place?" },
      { id: "1.9", number: "1.9", text: "Crane certification of thorough examination available and in date?" },
      { id: "1.10", number: "1.10", text: "Lifting accessories are the correct colour code?" },
      { id: "1.11", number: "1.11", text: "Crane operators, banksman and riggers identified?" },
      { id: "1.12", number: "1.12", text: "Ladders inspected and acceptable for use?" },
      { id: "1.13", number: "1.13", text: "MEWP operators competent / certified?" },
      { id: "1.14", number: "1.14", text: "Safety barriers / controls in place during lifting operations?" },
      { id: "1.15", number: "1.15", text: "Sufficient lighting available?" },
      { id: "1.16", number: "1.16", text: "Noise levels satisfactory?" },
      { id: "1.17", number: "1.17", text: "Screens available and in use during welding and grinding operations?" },
      { id: "1.18", number: "1.18", text: "Sufficient firefighting equipment available?" },
      { id: "1.19", number: "1.19", text: "Fumes generated by plant / generators controlled?" },
      { id: "1.20", number: "1.20", text: "Chemical / fuel and hydraulic transfer satisfactory?" },
      { id: "1.21", number: "1.21", text: "Chemical spill kit / drip trays available in use?" },
      { id: "1.22", number: "1.22", text: "Spill kits available and fully stocked where required?" },
      { id: "1.23", number: "1.23", text: "Bunded storage areas free of oil and satisfactory?" },
      { id: "1.24", number: "1.24", text: "Personnel compliant with general and specialist PPE requirements?" },
      { id: "1.25", number: "1.25", text: "Personnel working at height wearing fall prevention equipment?" },
      { id: "1.26", number: "1.26", text: "Emergency Response Plan and equipment available for rescue of personnel working at height?" },
      { id: "1.27", number: "1.27", text: "Emergency contact numbers available, including subcontractors?" },
      { id: "1.28", number: "1.28", text: "First aid precautions available, including eyewash?" },
      { id: "1.29", number: "1.29", text: "Waste being segregated?" },
      { id: "1.30", number: "1.30", text: "Any evidence of waste cross-contamination?" },
      { id: "1.31", number: "1.31", text: "Portable electrical devices PAT tested?" },
      { id: "1.32", number: "1.32", text: "Machinery free from signs of leaks or spillages?" },
      { id: "1.33", number: "1.33", text: "Obvious trip hazards identified?" },
      { id: "1.34", number: "1.34", text: "Other general worksite observations." },
    ],
  },
  {
    id: "mobilisation_personnel",
    title: "2.0 Personnel (General)",
    items: [
      { id: "2.1", number: "2.1", text: "Knowledge of responsibilities satisfactory?" },
      { id: "2.2", number: "2.2", text: "Knowledge of risk assessment satisfactory?" },
      { id: "2.3", number: "2.3", text: "Toolbox talks available and implemented?" },
      { id: "2.4", number: "2.4", text: "Knowledge of firefighting equipment satisfactory?" },
      { id: "2.5", number: "2.5", text: "Knowledge of vessel and shore-based muster points satisfactory?" },
      { id: "2.6", number: "2.6", text: "Knowledge of emergency response satisfactory?" },
      { id: "2.7", number: "2.7", text: "Have any personnel been on shift longer than 12 hours?" },
      { id: "2.8", number: "2.8", text: "Other personnel observations." },
    ],
  },
];

const droppedObjectsChecklist: ChecklistSection[] = [
  {
    id: "dropped_housekeeping",
    title: "1.0 General Housekeeping",
    items: [
      { id: "1.1", number: "1.1", text: "Platforms, open edges, beams and surfaces free from loose or unnecessary items?" },
      { id: "1.2", number: "1.2", text: "Bolts tight and secured with lock nut or other approved secondary retention?" },
      { id: "1.3", number: "1.3", text: "Redundant or unused equipment checked?" },
      { id: "1.4", number: "1.4", text: "Equipment certified and in good order?" },
    ],
  },
  {
    id: "dropped_tool_storage",
    title: "2.0 Tool and Equipment Storage",
    items: [
      { id: "2.1", number: "2.1", text: "Stored items secured correctly with safety securing in place?" },
      { id: "2.2", number: "2.2", text: "Damage and deformities checked?" },
      { id: "2.3", number: "2.3", text: "Improvised or modified lifting equipment and tools checked?" },
      { id: "2.4", number: "2.4", text: "Tool tethering systems available, in use and controlled?" },
    ],
  },
  {
    id: "dropped_lights_comms",
    title: "3.0 Lights and Communications System",
    items: [
      { id: "3.1", number: "3.1", text: "Light fixings checked and securing screws, clips, brackets and bolts in place and secure?" },
      { id: "3.2", number: "3.2", text: "Secondary retention condition checked?" },
      { id: "3.3", number: "3.3", text: "Stanchion posts secure and checked for wear, movement, fatigue or corrosion?" },
    ],
  },
  {
    id: "dropped_ladders_access",
    title: "4.0 Ladders and Access Platforms",
    items: [
      { id: "4.1", number: "4.1", text: "Structures checked for damage or corrosion?" },
      { id: "4.2", number: "4.2", text: "Gratings, covers, panels and clips secure?" },
      { id: "4.3", number: "4.3", text: "Gate hinges and pins intact and operating correctly?" },
      { id: "4.4", number: "4.4", text: "Guardrails properly secured?" },
      { id: "4.5", number: "4.5", text: "Platform components including boards, gratings, bracings, guardrails and toe-boards checked?" },
      { id: "4.6", number: "4.6", text: "Loose items removed?" },
    ],
  },
  {
    id: "dropped_emergency",
    title: "5.0 Emergency Equipment and Signage",
    items: [
      { id: "5.1", number: "5.1", text: "Firefighting equipment and equipment boxes secure?" },
      { id: "5.2", number: "5.2", text: "Alarm call points, signs and fixings secure?" },
      { id: "5.3", number: "5.3", text: "Damage or corrosion checked?" },
    ],
  },
  {
    id: "dropped_junction",
    title: "6.0 Junction Boxes",
    items: [
      { id: "6.1", number: "6.1", text: "Mounting, box and covers secure with fixings in place?" },
      { id: "6.2", number: "6.2", text: "Excessive wear, fatigue or damage checked?" },
    ],
  },
  {
    id: "dropped_structure",
    title: "7.0 General Structure and Major Equipment",
    items: [
      { id: "7.1", number: "7.1", text: "Equipment fixtures such as clamps, grilles and guards secure?" },
      { id: "7.2", number: "7.2", text: "Bolts tight and secured with lock nuts or other approved secondary retention?" },
      { id: "7.3", number: "7.3", text: "Safety lines and whip checks in place and secure?" },
      { id: "7.4", number: "7.4", text: "Signs of corrosion, damage or fatigue checked?" },
    ],
  },
];

function getChecklistForTemplateId(templateId: string | null | undefined) {
  if (templateId === "vessel-pre-sail") return vesselPreSailChecklist;
  if (templateId === "workplace-office") return officeChecklist;
  if (templateId === "workplace-offshore") return offshoreChecklist;
  if (templateId === "workplace-mobilisation") return mobilisationChecklist;
  if (templateId === "dropped-objects") return droppedObjectsChecklist;
  return baseSiteChecklist;
}

function checklistOptionsForTemplate(templateId: string | null | undefined) {
  return getChecklistForTemplateId(templateId).flatMap((section) => section.items.map((item) => ({
    id: item.id,
    label: `${item.number} - ${item.text}`,
  })));
}

function additionalCommentsTitle(templateId: string | null | undefined) {
  const nextSectionNumber = getChecklistForTemplateId(templateId).length + 1;
  return `${nextSectionNumber}.0 Additional Comments`;
}

function templateRevisionLabel(template: Pick<InspectionTemplate, "revision" | "revisionDate">) {
  const revision = template.revision ? `Rev ${template.revision}` : "Rev not stated";
  const date = displayDate(template.revisionDate);
  return date ? `${revision} - ${date}` : revision;
}

function recordRevisionLabel(record: Pick<HseInspectionRecord, "form_revision" | "form_revision_date">) {
  const revision = record.form_revision ? `Rev ${record.form_revision}` : "Rev not stated";
  const date = displayDate(record.form_revision_date);
  return date ? `${revision} - ${date}` : revision;
}

const emptyRecord: HseInspectionRecord = {
  id: "",
  inspection_number: "",
  form_id: defaultTemplateId,
  form_number: "ENS-HSEQ-FRM-044",
  form_revision: "E",
  form_revision_date: "2026-05-19",
  form_title: "Workplace Inspection - Base and Site",
  title: "",
  department: "HSEQ",
  project_work_scope: "",
  vessel_spread: "",
  area_zone: "",
  inspection_date: new Date().toISOString().slice(0, 10),
  inspector_name: "",
  inspector_position: "",
  status: "Draft",
  checklist_responses: {},
  additional_comments: "",
  actions: [],
  signoff_name: "",
  signoff_position: "",
  signoff_company: "Enshore Subsea",
  signoff_date: "",
  created_at: "",
  updated_at: "",
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function displayDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function displayDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatFileSize(value: number | null) {
  if (!value || value <= 0) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function evidenceSortValue(value: string | null | undefined) {
  if (!value) return 9999;
  const [major, minor] = value.split(".").map((part) => Number.parseInt(part, 10));
  return (Number.isFinite(major) ? major : 999) * 100 + (Number.isFinite(minor) ? minor : 99);
}

function sortEvidenceByItem(files: InspectionEvidence[]) {
  return [...files].sort((a, b) =>
    evidenceSortValue(a.item_number) - evidenceSortValue(b.item_number) ||
    a.file_name.localeCompare(b.file_name)
  );
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function normalizeActions(value: unknown): InspectionAction[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item as Partial<InspectionAction>;
    return {
      action: clean(row.action),
      action_by: clean(row.action_by),
      target_date: clean(row.target_date),
    };
  });
}

function normalizeChecklist(value: unknown): Record<string, ChecklistResponse> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const next: Record<string, ChecklistResponse> = {};
  Object.entries(value as Record<string, Partial<ChecklistResponse>>).forEach(([key, row]) => {
    const answer = row.answer === "N/A" || row.answer === "Yes" || row.answer === "No" ? row.answer : "";
    next[key] = { answer, comments: clean(row.comments) };
  });
  return next;
}

function makeDraft(template = inspectionTemplates.find((item) => item.id === defaultTemplateId)!) {
  return {
    ...emptyRecord,
    form_id: template.id,
    form_number: template.documentNumber,
    form_revision: template.revision,
    form_revision_date: template.revisionDate,
    form_title: template.title,
    title: template.enabled ? template.title : "",
  };
}

function nextInspectionNumber(records: HseInspectionRecord[]) {
  const max = records.reduce((highest, record) => {
    const match = clean(record.inspection_number).match(/HSE-INS-(\d+)/i);
    return match ? Math.max(highest, Number.parseInt(match[1], 10)) : highest;
  }, 0);
  return `HSE-INS-${String(max + 1).padStart(3, "0")}`;
}

async function getLogoDataUrl() {
  try {
    const response = await fetch("/enshore-primary-logo-colour.png");
    const blob = await response.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

async function createSignedEvidenceUrl(path: string) {
  const { data } = await supabase.storage.from(evidenceBucket).createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl || "";
}

async function imageUrlToDataUrl(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  return await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}

export default function HseInspectionsPage() {
  const imsPermissions = useImsPermissions();
  const [records, setRecords] = useState<HseInspectionRecord[]>([]);
  const [evidence, setEvidence] = useState<InspectionEvidence[]>([]);
  const [centralActions, setCentralActions] = useState<CentralAction[]>([]);
  const [people, setPeople] = useState<PeopleOption[]>([]);
  const [activeView, setActiveView] = useState<InspectionView>("dashboard");
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplateId);
  const [draft, setDraft] = useState<HseInspectionRecord>(() => makeDraft());
  const [selectedId, setSelectedId] = useState("");
  const selectedDetailRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState("Loading HSE inspections...");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fieldQrDataUrl, setFieldQrDataUrl] = useState("");
  const [pendingEvidence, setPendingEvidence] = useState<PendingEvidence[]>([]);
  const [uploadItemNumber, setUploadItemNumber] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isFieldCreateMode, setIsFieldCreateMode] = useState(false);

  const selectedTemplate = useMemo(
    () => inspectionTemplates.find((template) => template.id === selectedTemplateId) ?? inspectionTemplates.find((template) => template.id === defaultTemplateId)!,
    [selectedTemplateId],
  );

  const selected = useMemo(() => records.find((record) => record.id === selectedId) || null, [records, selectedId]);
  const selectedEvidence = useMemo(() => evidence.filter((file) => file.inspection_id === selectedId), [evidence, selectedId]);
  const selectedLinkedActions = useMemo(() => {
    const selectedNumber = selected?.inspection_number || draft.inspection_number || "";
    return centralActions.filter((action) =>
      (selectedId && action.linked_hse_inspection_id === selectedId) ||
      (selectedNumber && action.linked_hse_inspection_number === selectedNumber)
    );
  }, [centralActions, draft.inspection_number, selected?.inspection_number, selectedId]);

  const filteredRecords = useMemo(() => {
    const query = search.toLowerCase().trim();
    return records.filter((record) => {
      const haystack = [
        record.inspection_number,
        record.title,
        record.form_title,
        record.project_work_scope,
        record.vessel_spread,
        record.area_zone,
        record.inspector_name,
      ].join(" ").toLowerCase();
      return (!query || haystack.includes(query)) && (!statusFilter || record.status === statusFilter);
    });
  }, [records, search, statusFilter]);

  const kpis = useMemo(() => {
    const open = records.filter((record) => record.status !== "Closed" && record.status !== "Complete").length;
    const complete = records.filter((record) => record.status === "Complete" || record.status === "Closed").length;
    const findings = records.reduce((count, record) => {
      return count + Object.values(record.checklist_responses || {}).filter((response) => response.answer === "No").length;
    }, 0);
    const evidenceCount = evidence.length;
    return { open, complete, findings, evidenceCount };
  }, [evidence.length, records]);

  const latestSummary = records[0] ? `${records[0].inspection_number} - ${records[0].title}` : "No records yet";
  const canCreateInspection = imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canCreate);
  const canEditInspection = imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canEdit);

  function requireCreatePermission(action: string) {
    if (canCreateInspection) return true;
    setMessage(`Read-only access: you do not have permission to ${action}.`);
    return false;
  }

  function requireEditPermission(action: string) {
    if (canEditInspection) return true;
    setMessage(`Read-only access: you do not have permission to ${action}.`);
    return false;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateMobileState = () => setIsMobile(window.innerWidth <= 720);
    updateMobileState();
    window.addEventListener("resize", updateMobileState);
    return () => window.removeEventListener("resize", updateMobileState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateFieldCreateMode = () => {
      const params = new URLSearchParams(window.location.search);
      setIsFieldCreateMode(window.innerWidth <= 720 && params.get("view") === "create");
    };
    updateFieldCreateMode();
    window.addEventListener("resize", updateFieldCreateMode);
    window.addEventListener("popstate", updateFieldCreateMode);
    return () => {
      window.removeEventListener("resize", updateFieldCreateMode);
      window.removeEventListener("popstate", updateFieldCreateMode);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    const type = params.get("type");
    if (type && inspectionTemplates.some((template) => template.id === type)) {
      setSelectedTemplateId(type);
      const template = inspectionTemplates.find((item) => item.id === type) || inspectionTemplates.find((item) => item.id === defaultTemplateId)!;
      setDraft((current) => ({ ...makeDraft(template), inspection_number: current.inspection_number || "" }));
    }
    if (view === "create") setActiveView("create");
    if (view === "register") setActiveView("register");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/hse/inspections/field`;
    QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: "#005670", light: "#ffffff" } })
      .then(setFieldQrDataUrl)
      .catch(() => setFieldQrDataUrl(""));
  }, []);

  useEffect(() => {
    const template = inspectionTemplates.find((item) => item.id === selectedTemplateId);
    if (!template) return;
    setDraft((current) => ({
      ...current,
      form_id: template.id,
      form_number: template.documentNumber,
      form_revision: template.revision,
      form_revision_date: template.revisionDate,
      form_title: template.title,
      title: current.form_id === template.id && current.title ? current.title : (template.enabled ? template.title : ""),
    }));
  }, [selectedTemplateId]);

  async function loadData() {
    const [recordRes, evidenceRes, peopleRes, actionRes] = await Promise.all([
      supabase.from("hse_inspection_records").select("*").order("inspection_date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("hse_inspection_evidence").select("*").order("uploaded_at", { ascending: false }),
      supabase.from("people").select("id,name,email,role,department,active").eq("active", true).order("name", { ascending: true }),
      supabase
        .from("actions")
        .select("id,action_number,title,owner,status,priority,due_date,source,linked_hse_inspection_id,linked_hse_inspection_number")
        .or("source.eq.HSE Inspection,linked_hse_inspection_id.not.is.null,linked_hse_inspection_number.not.is.null")
        .order("due_date", { ascending: true }),
    ]);

    if (recordRes.error) {
      setMessage(`HSE inspection tables not ready: ${recordRes.error.message}. Run scripts/sql/hse_inspections.sql in Supabase.`);
      return;
    }

    const nextRecords = ((recordRes.data || []) as HseInspectionRecord[]).map((record) => ({
      ...record,
      status: (record.status || "Draft") as InspectionStatus,
      checklist_responses: normalizeChecklist(record.checklist_responses),
      actions: normalizeActions(record.actions),
    }));
    setRecords(nextRecords);
    setEvidence((evidenceRes.data || []) as InspectionEvidence[]);
    setPeople((peopleRes.data || []) as PeopleOption[]);
    setCentralActions((actionRes.data || []) as CentralAction[]);
    setDraft((current) => ({ ...current, inspection_number: current.inspection_number || nextInspectionNumber(nextRecords) }));
    setMessage("HSE inspections loaded.");
  }

  useEffect(() => {
    void loadData();
  }, []);

  function updateDraft<K extends keyof HseInspectionRecord>(key: K, value: HseInspectionRecord[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function selectPerson(value: string, target: "inspector" | "signoff") {
    const person = people.find((item) => item.id === value || item.name === value);
    if (target === "inspector") {
      updateDraft("inspector_name", person?.name || value);
      updateDraft("inspector_position", person?.role || "");
      return;
    }
    updateDraft("signoff_name", person?.name || value);
    updateDraft("signoff_position", person?.role || "");
  }

  function updateChecklist(itemId: string, field: keyof ChecklistResponse, value: string) {
    setDraft((current) => ({
      ...current,
      checklist_responses: {
        ...current.checklist_responses,
        [itemId]: {
          answer: current.checklist_responses[itemId]?.answer || "",
          comments: current.checklist_responses[itemId]?.comments || "",
          [field]: value,
        },
      },
    }));
  }

  function updateAction(index: number, field: keyof InspectionAction, value: string) {
    setDraft((current) => {
      const rows = current.actions.length ? [...current.actions] : [{ action: "", action_by: "", target_date: "" }];
      rows[index] = { ...rows[index], [field]: value };
      return { ...current, actions: rows };
    });
  }

  function addAction() {
    setDraft((current) => ({ ...current, actions: [...current.actions, { action: "", action_by: "", target_date: "" }] }));
  }

  function removeAction(index: number) {
    setDraft((current) => ({ ...current, actions: current.actions.filter((_, rowIndex) => rowIndex !== index) }));
  }

  function selectRecord(record: HseInspectionRecord) {
    setSelectedId(record.id);
    setDraft({
      ...record,
      checklist_responses: normalizeChecklist(record.checklist_responses),
      actions: normalizeActions(record.actions),
    });
    setSelectedTemplateId(record.form_id || defaultTemplateId);
    setActiveView("register");
  }

  function selectRecordAndScroll(record: HseInspectionRecord) {
    selectRecord(record);
    window.setTimeout(() => {
      selectedDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  useEffect(() => {
    if (typeof window === "undefined" || records.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const inspectionId = (params.get("inspectionId") || "").trim();
    const inspectionNumber = (params.get("inspection") || "").trim().toLowerCase();
    if (!inspectionId && !inspectionNumber) return;

    const matchedRecord = records.find((record) => {
      return (
        (inspectionId && record.id === inspectionId) ||
        (inspectionNumber && clean(record.inspection_number).toLowerCase() === inspectionNumber)
      );
    });

    if (!matchedRecord) return;
    selectRecord(matchedRecord);
    setSearch(matchedRecord.inspection_number || "");
    setStatusFilter("");
  }, [records]);

  function startCreate(templateId = defaultTemplateId) {
    if (!requireCreatePermission("create HSE inspections")) return;
    const template = inspectionTemplates.find((item) => item.id === templateId) || inspectionTemplates.find((item) => item.id === defaultTemplateId)!;
    setSelectedTemplateId(template.id);
    setSelectedId("");
    setPendingEvidence([]);
    setUploadItemNumber("");
    setDraft({ ...makeDraft(template), inspection_number: nextInspectionNumber(records) });
    setActiveView("create");
  }

  function buildPayload(record: HseInspectionRecord) {
    return {
      inspection_number: record.inspection_number,
      form_id: record.form_id,
      form_number: record.form_number,
      form_revision: record.form_revision || null,
      form_revision_date: record.form_revision_date || null,
      form_title: record.form_title,
      title: record.title,
      department: record.department || null,
      project_work_scope: record.project_work_scope || null,
      vessel_spread: record.vessel_spread || null,
      area_zone: record.area_zone || null,
      inspection_date: record.inspection_date || null,
      inspector_name: record.inspector_name || null,
      inspector_position: record.inspector_position || null,
      status: record.status || "Draft",
      checklist_responses: record.checklist_responses || {},
      additional_comments: record.additional_comments || null,
      actions: record.actions.map((row) => ({
        action: clean(row.action),
        action_by: clean(row.action_by),
        target_date: clean(row.target_date),
      })).filter((row) => row.action || row.action_by || row.target_date),
      signoff_name: record.signoff_name || null,
      signoff_position: record.signoff_position || null,
      signoff_company: record.signoff_company || null,
      signoff_date: record.signoff_date || null,
      updated_at: new Date().toISOString(),
    };
  }

  async function saveInspection() {
    if (selectedId) {
      if (!requireEditPermission("edit HSE inspections")) return;
    } else if (!requireCreatePermission("create HSE inspections")) {
      return;
    }
    if (!selectedTemplate.enabled) {
      setMessage(`${selectedTemplate.documentNumber} is visible for planning but is not wired for digital completion yet.`);
      return;
    }
    if (!draft.title.trim()) {
      setMessage("Inspection title is required.");
      return;
    }
    setSaving(true);
    const payload = buildPayload({ ...draft, inspection_number: draft.inspection_number || nextInspectionNumber(records) });
    if (selectedId) {
      const { error } = await supabase.from("hse_inspection_records").update(payload).eq("id", selectedId);
      setSaving(false);
      if (error) {
        setMessage(`Save failed: ${error.message}`);
        return;
      }
      setMessage(`${draft.inspection_number} saved.`);
      await loadData();
      return;
    }

    const { data, error } = await supabase.from("hse_inspection_records").insert([payload]).select("*").single();
    setSaving(false);
    if (error) {
      setMessage(`Create failed: ${error.message}`);
      return;
    }
    const created = data as HseInspectionRecord;
    setSelectedId(created.id);
    setMessage(`${created.inspection_number} created.`);
    if (pendingEvidence.length) {
      await uploadEvidenceFiles(created.id, pendingEvidence.map((item) => ({ file: item.file, itemNumber: item.item_number })));
      setPendingEvidence([]);
    }
    await loadData();
    setActiveView("register");
  }

  async function deleteInspection(record: HseInspectionRecord) {
    if (!requireEditPermission("delete HSE inspections")) return;
    if (!window.confirm(`Delete ${record.inspection_number}? This will also remove linked evidence records.`)) return;
    const { error } = await supabase.from("hse_inspection_records").delete().eq("id", record.id);
    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }
    setSelectedId("");
    setDraft({ ...makeDraft(), inspection_number: nextInspectionNumber(records.filter((item) => item.id !== record.id)) });
    setMessage(`${record.inspection_number} deleted.`);
    await loadData();
  }

  async function uploadEvidenceFiles(inspectionId: string, files: Array<{ file: File; itemNumber: string }>) {
    for (const item of files) {
      const file = item.file;
      const path = `HSE/Inspections/${inspectionId}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const upload = await supabase.storage.from(evidenceBucket).upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upload.error) {
        setMessage(`Evidence upload failed: ${upload.error.message}`);
        continue;
      }
      const { error } = await supabase.from("hse_inspection_evidence").insert([{
        inspection_id: inspectionId,
        item_number: item.itemNumber || null,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        content_type: file.type || null,
      }]);
      if (error) setMessage(`Evidence record failed: ${error.message}`);
    }
  }

  async function uploadEvidence(event: ChangeEvent<HTMLInputElement>, itemNumber: string) {
    if (!requireEditPermission("upload HSE inspection evidence")) {
      event.target.value = "";
      return;
    }
    if (!selectedId) {
      setMessage("Save the inspection before uploading evidence.");
      event.target.value = "";
      return;
    }
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true);
    await uploadEvidenceFiles(selectedId, files.map((file) => ({ file, itemNumber })));
    setUploading(false);
    event.target.value = "";
    await loadData();
    setMessage("Evidence uploaded.");
  }

  function addPendingEvidence(event: ChangeEvent<HTMLInputElement>, itemNumber: string) {
    if (!requireCreatePermission("stage HSE inspection evidence")) {
      event.target.value = "";
      return;
    }
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setPendingEvidence((current) => [
      ...current,
      ...files.map((file) => ({ id: `${Date.now()}-${file.name}-${Math.random()}`, file, item_number: itemNumber })),
    ]);
    event.target.value = "";
  }

  function removePendingEvidence(id: string) {
    if (!requireCreatePermission("remove staged HSE inspection evidence")) return;
    setPendingEvidence((current) => current.filter((file) => file.id !== id));
  }

  async function openEvidenceFile(file: InspectionEvidence) {
    const url = await createSignedEvidenceUrl(file.file_path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function deleteEvidenceFile(file: InspectionEvidence) {
    if (!requireEditPermission("delete HSE inspection evidence")) return;
    if (!window.confirm(`Delete evidence file ${file.file_name}?`)) return;
    await supabase.storage.from(evidenceBucket).remove([file.file_path]);
    const { error } = await supabase.from("hse_inspection_evidence").delete().eq("id", file.id);
    if (error) {
      setMessage(`Evidence delete failed: ${error.message}`);
      return;
    }
    await loadData();
    setMessage("Evidence deleted.");
  }

  const pdfTableMargin = { left: 12, right: 12, top: 38, bottom: 18 };

  function pdfHeader(doc: jsPDF, record: HseInspectionRecord, logoData: string) {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 34, "F");
    if (logoData) {
      try {
        doc.addImage(logoData, "PNG", 12, 10, 38, 19);
      } catch {
        // Keep report generation working if the logo cannot be embedded.
      }
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(record.inspection_number || "", 195, 16, { align: "right" });
    doc.text(displayDate(record.inspection_date), 195, 22, { align: "right" });
    doc.setDrawColor(0, 86, 112);
    doc.setLineWidth(0.4);
    doc.line(12, 30, 198, 30);
  }

  function pdfFooter(doc: jsPDF, label: string, page: number, pageCount: number) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, pageHeight - 14, pageWidth, 14, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(label, 12, pageHeight - 10);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - 12, pageHeight - 10, { align: "right" });
  }

  function applyPdfChrome(doc: jsPDF, record: HseInspectionRecord, logoData: string, footerLabel: string) {
    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      pdfHeader(doc, record, logoData);
      pdfFooter(doc, footerLabel, page, pageCount);
    }
  }

  function pdfSection(doc: jsPDF, title: string, y: number) {
    doc.setFillColor(0, 86, 112);
    doc.roundedRect(12, y, 186, 8, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, 15, y + 5.5);
    return y + 11;
  }

  async function generatePdf(record: HseInspectionRecord, evidenceFiles = selectedEvidence) {
    try {
      setMessage(`Generating PDF for ${record.inspection_number}...`);
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const logoData = await getLogoDataUrl();
      pdfHeader(doc, record, logoData);
      let y = 36;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`${record.inspection_number} - ${record.title}`, 12, y);
    y += 7;

    autoTable(doc, {
      startY: y,
      theme: "grid",
      margin: pdfTableMargin,
      tableWidth: 186,
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.2, textColor: [15, 23, 42] },
      headStyles: { fillColor: [0, 86, 112], textColor: [255, 255, 255], fontStyle: "bold" },
      head: [["Field", "Details", "Field", "Details"]],
      body: [
        ["Form No.", record.form_number, "Revision", record.form_revision || ""],
        ["Revision Date", displayDate(record.form_revision_date), "Status", record.status],
        ["Department", record.department || "", "Inspection Date", displayDate(record.inspection_date)],
        ["Project / Work Scope", record.project_work_scope || "", "Vessel / Spread", record.vessel_spread || ""],
        ["Area / Zone", record.area_zone || "", "Inspector", record.inspector_name || ""],
      ],
      columnStyles: { 0: { cellWidth: 38, fontStyle: "bold" }, 1: { cellWidth: 55 }, 2: { cellWidth: 38, fontStyle: "bold" }, 3: { cellWidth: 55 } },
    });

    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 72;
    y += 8;

    getChecklistForTemplateId(record.form_id).forEach((section) => {
      if (y > 250) {
        doc.addPage();
        pdfHeader(doc, record, logoData);
        y = 36;
      }
      y = pdfSection(doc, section.title, y);
      autoTable(doc, {
        startY: y,
        theme: "grid",
        margin: pdfTableMargin,
        tableWidth: 186,
        styles: { font: "helvetica", fontSize: 7.5, cellPadding: 1.6, lineColor: [203, 213, 225], lineWidth: 0.2, textColor: [15, 23, 42], overflow: "linebreak" },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
        head: [["Item", "Description", "N/A", "Yes", "No", "Comments"]],
        body: section.items.map((item) => {
          const response = record.checklist_responses?.[item.id] || { answer: "", comments: "" };
          return [
            item.number,
            item.text,
            response.answer === "N/A" ? "X" : "",
            response.answer === "Yes" ? "X" : "",
            response.answer === "No" ? "X" : "",
            response.comments || "",
          ];
        }),
        columnStyles: {
          0: { cellWidth: 15, fontStyle: "bold" },
          1: { cellWidth: 77 },
          2: { cellWidth: 12, halign: "center" },
          3: { cellWidth: 12, halign: "center" },
          4: { cellWidth: 12, halign: "center" },
          5: { cellWidth: 58 },
        },
        didParseCell: (data) => {
          if ([2, 3, 4].includes(data.column.index)) data.cell.styles.halign = "center";
        },
      });
      y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 6;
    });

    if (y > 230) {
      doc.addPage();
      pdfHeader(doc, record, logoData);
      y = 36;
    }

    y = pdfSection(doc, additionalCommentsTitle(record.form_id), y);
    autoTable(doc, {
      startY: y,
      theme: "grid",
      margin: pdfTableMargin,
      tableWidth: 186,
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.2 },
      body: [[record.additional_comments || ""]],
      columnStyles: { 0: { cellWidth: 186, minCellHeight: 18 } },
    });
    y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 8;

    y = pdfSection(doc, "Actions", y);
    const linkedActions = centralActions.filter((action) =>
      (record.id && action.linked_hse_inspection_id === record.id) ||
      (record.inspection_number && action.linked_hse_inspection_number === record.inspection_number)
    );
    autoTable(doc, {
      startY: y,
      theme: "grid",
      margin: pdfTableMargin,
      tableWidth: 186,
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.2, overflow: "linebreak" },
      headStyles: { fillColor: [0, 86, 112], textColor: [255, 255, 255], fontStyle: "bold" },
      head: [["Action No.", "Title", "Owner", "Status", "Due Date"]],
      body: linkedActions.length
        ? linkedActions.map((action) => [action.action_number || "", action.title || "", action.owner || "", action.status || "", displayDate(action.due_date)])
        : [["", "No linked central actions recorded.", "", "", ""]],
      columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 76 }, 2: { cellWidth: 34 }, 3: { cellWidth: 24 }, 4: { cellWidth: 28 } },
    });
    y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 8;

    y = pdfSection(doc, "Sign-Off", y);
    autoTable(doc, {
      startY: y,
      theme: "grid",
      margin: pdfTableMargin,
      tableWidth: 186,
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.2 },
      headStyles: { fillColor: [0, 86, 112], textColor: [255, 255, 255], fontStyle: "bold" },
      head: [["Name", "Position", "Company", "Date"]],
      body: [[record.signoff_name || "", record.signoff_position || "", record.signoff_company || "", displayDate(record.signoff_date)]],
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 55 }, 2: { cellWidth: 45 }, 3: { cellWidth: 36 } },
    });
    y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 8;

    const evidenceRows = await Promise.all(
      sortEvidenceByItem(evidenceFiles).map(async (file) => ({
        file,
        url: await createSignedEvidenceUrl(file.file_path),
      })),
    );
    if (evidenceRows.length) {
      if (y > 230) {
        doc.addPage();
        pdfHeader(doc, record, logoData);
        y = 36;
      }
      y = pdfSection(doc, "Evidence Register", y);
      autoTable(doc, {
        startY: y,
        theme: "grid",
        margin: pdfTableMargin,
        tableWidth: 186,
        styles: { font: "helvetica", fontSize: 8, cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.2 },
        headStyles: { fillColor: [0, 86, 112], textColor: [255, 255, 255], fontStyle: "bold" },
        head: [["Item", "File", "Size", "Uploaded", "Link"]],
        body: evidenceRows.map((item) => [
          item.file.item_number || "General",
          item.file.file_name,
          formatFileSize(item.file.file_size),
          displayDateTime(item.file.uploaded_at),
          { content: "", url: item.url },
        ]),
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 72 }, 2: { cellWidth: 22 }, 3: { cellWidth: 40 }, 4: { cellWidth: 32, textColor: [37, 99, 235] } },
        didDrawCell: (data) => {
          if (data.section !== "body" || data.column.index !== 4) return;
          const raw = data.cell.raw as { url?: string } | string;
          const url = typeof raw === "object" ? raw.url : "";
          if (url) {
            doc.setTextColor(37, 99, 235);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.textWithLink("Open Evidence", data.cell.x + 2, data.cell.y + 5, { url });
          }
        },
      });

      y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 8;

      const imageEvidence = evidenceRows.filter((item) =>
        (item.file.content_type || "").startsWith("image/") ||
        /\.(png|jpe?g|webp)$/i.test(item.file.file_name)
      );

      if (imageEvidence.length) {
        if (y > 218) {
          doc.addPage();
          pdfHeader(doc, record, logoData);
          y = 36;
        }
        y = pdfSection(doc, "Evidence Photos", y);
        let column = 0;
        for (const item of imageEvidence) {
          try {
            const dataUrl = await imageUrlToDataUrl(item.url);
            const x = column === 0 ? 12 : 106;
            if (y > 214) {
              doc.addPage();
              pdfHeader(doc, record, logoData);
              y = 36;
              column = 0;
            }
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            doc.text(`${item.file.item_number || "General"} - ${item.file.file_name}`, x, y + 4, { maxWidth: 86 });
            doc.addImage(dataUrl, item.file.content_type?.includes("png") ? "PNG" : "JPEG", x, y + 7, 86, 58);
            if (column === 0) {
              column = 1;
            } else {
              column = 0;
              y += 72;
            }
          } catch {
            // Evidence links still remain in the table if an image preview cannot be embedded.
          }
        }
      }
    }

    applyPdfChrome(doc, record, logoData, `${record.form_number}${record.form_revision ? ` Rev ${record.form_revision}` : ""}`);

      const fileName = `${record.inspection_number}-${sanitizeFileName(record.form_title)}.pdf`;
      const url = doc.output("bloburl");
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) doc.save(fileName);
      setMessage(`Generated PDF for ${record.inspection_number}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown PDF generation error";
      setMessage(`PDF generation failed for ${record.inspection_number}: ${message}`);
    }
  }

  async function generateBlankInspectionPdf(template: InspectionTemplate) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const logoData = await getLogoDataUrl();
    const blankRecord = {
      ...makeDraft(template),
      inspection_number: "Blank form",
      title: template.title,
      status: "Draft" as InspectionStatus,
      inspection_date: "",
    };
    pdfHeader(doc, blankRecord, logoData);
    let y = 36;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`${template.documentNumber} - ${template.title}`, 12, y);
    y += 7;

    autoTable(doc, {
      startY: y,
      theme: "grid",
      margin: pdfTableMargin,
      tableWidth: 186,
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2.2, lineColor: [203, 213, 225], lineWidth: 0.2, textColor: [15, 23, 42] },
      headStyles: { fillColor: [0, 86, 112], textColor: [255, 255, 255], fontStyle: "bold" },
      head: [["Field", "Details", "Field", "Details"]],
      body: [
        ["Form No.", template.documentNumber, "Revision", template.revision || ""],
        ["Revision Date", displayDate(template.revisionDate), "Status", ""],
        ["Department", "HSEQ", "Inspection Date", ""],
        ["Project / Work Scope", "", "Vessel / Spread", ""],
        ["Area / Zone", "", "Inspector", ""],
      ],
      columnStyles: { 0: { cellWidth: 38, fontStyle: "bold" }, 1: { cellWidth: 55 }, 2: { cellWidth: 38, fontStyle: "bold" }, 3: { cellWidth: 55 } },
    });

    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 72;
    y += 8;

    const templateChecklist = template.enabled ? getChecklistForTemplateId(template.id) : [];
    if (templateChecklist.length) {
      templateChecklist.forEach((section) => {
        if (y > 250) {
          doc.addPage();
          pdfHeader(doc, blankRecord, logoData);
          y = 36;
        }
        y = pdfSection(doc, section.title, y);
        autoTable(doc, {
          startY: y,
          theme: "grid",
          margin: pdfTableMargin,
          tableWidth: 186,
          styles: { font: "helvetica", fontSize: 7.5, cellPadding: 1.8, lineColor: [203, 213, 225], lineWidth: 0.2, textColor: [15, 23, 42], overflow: "linebreak" },
          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
          head: [["Item", "Description", "N/A", "Yes", "No", "Comments / Action Notes"]],
          body: section.items.map((item) => [item.number, item.text, "", "", "", ""]),
          columnStyles: {
            0: { cellWidth: 15, fontStyle: "bold" },
            1: { cellWidth: 77 },
            2: { cellWidth: 12, halign: "center" },
            3: { cellWidth: 12, halign: "center" },
            4: { cellWidth: 12, halign: "center" },
            5: { cellWidth: 58, minCellHeight: 10 },
          },
        });
        y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 6;
      });
    } else {
      template.sections.forEach((sectionTitle, index) => {
        if (y > 232) {
          doc.addPage();
          pdfHeader(doc, blankRecord, logoData);
          y = 36;
        }
        y = pdfSection(doc, `${index + 1}. ${sectionTitle}`, y);
        autoTable(doc, {
          startY: y,
          theme: "grid",
          margin: pdfTableMargin,
          tableWidth: 186,
          styles: { font: "helvetica", fontSize: 8, cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.2, textColor: [15, 23, 42] },
          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
          head: [["Item", "Check / Requirement", "N/A", "Yes", "No", "Comments"]],
          body: Array.from({ length: 5 }, (_, rowIndex) => [`${index + 1}.${rowIndex + 1}`, "", "", "", "", ""]),
          columnStyles: {
            0: { cellWidth: 15, fontStyle: "bold" },
            1: { cellWidth: 77 },
            2: { cellWidth: 12, halign: "center" },
            3: { cellWidth: 12, halign: "center" },
            4: { cellWidth: 12, halign: "center" },
            5: { cellWidth: 58, minCellHeight: 11 },
          },
        });
        y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 6;
      });
    }

    if (y > 230) {
      doc.addPage();
      pdfHeader(doc, blankRecord, logoData);
      y = 36;
    }
    y = pdfSection(doc, "Additional Comments", y);
    autoTable(doc, {
      startY: y,
      theme: "grid",
      margin: pdfTableMargin,
      tableWidth: 186,
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.2 },
      body: [[""]],
      columnStyles: { 0: { cellWidth: 186, minCellHeight: 24 } },
    });
    y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 8;

    y = pdfSection(doc, "Evidence Register", y);
    autoTable(doc, {
      startY: y,
      theme: "grid",
      margin: pdfTableMargin,
      tableWidth: 186,
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.2 },
      headStyles: { fillColor: [0, 86, 112], textColor: [255, 255, 255], fontStyle: "bold" },
      head: [["Item", "Evidence / Photo Reference", "Notes"]],
      body: Array.from({ length: 5 }, () => ["", "", ""]),
      columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 76 }, 2: { cellWidth: 86 } },
    });
    y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 8;

    y = pdfSection(doc, "Sign-Off", y);
    autoTable(doc, {
      startY: y,
      theme: "grid",
      margin: pdfTableMargin,
      tableWidth: 186,
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.2 },
      headStyles: { fillColor: [0, 86, 112], textColor: [255, 255, 255], fontStyle: "bold" },
      head: [["Name", "Position", "Company", "Date", "Signature"]],
      body: [["", "", "", "", ""]],
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 42 }, 2: { cellWidth: 36 }, 3: { cellWidth: 28 }, 4: { cellWidth: 40 } },
    });

    applyPdfChrome(doc, blankRecord, logoData, `${template.documentNumber}${template.revision ? ` Rev ${template.revision}` : ""}`);

    const url = doc.output("bloburl");
    window.open(url, "_blank", "noopener,noreferrer");
    setMessage(`Opened blank PDF for ${template.documentNumber}.`);
  }

  return (
    <main style={isMobile ? mobileMainStyle : undefined}>
      {!isFieldCreateMode ? <ImsPermissionNotice /> : null}
      {isMobile && !isFieldCreateMode ? (
        <MobileInspectionHero latestSummary={latestSummary} />
      ) : !isMobile ? (
        <QualityPageHero
          label="HSE MANAGEMENT"
          title="Site Inspections"
          description="Plan, complete, evidence, and report HSE inspections across vessels, offices, offshore worksites, mobilisation, base/site areas, and dropped object controls."
          contextCards={[
            { label: "Last Refreshed", value: new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) },
            { label: "Latest Inspection", value: latestSummary },
          ]}
        />
      ) : null}

      {!isFieldCreateMode ? <TopRow status={message} /> : null}

      {!isFieldCreateMode ? <nav style={tabRowStyle} aria-label="HSE inspection views">
        <TabButton active={activeView === "dashboard"} onClick={() => setActiveView("dashboard")}>Dashboard</TabButton>
        <TabButton active={activeView === "register"} onClick={() => setActiveView("register")}>Inspection Register</TabButton>
        <TabButton active={activeView === "create"} onClick={() => startCreate()}>Create Inspection</TabButton>
      </nav> : null}

      {activeView === "dashboard" ? (
        <DashboardView
          kpis={kpis}
          qrDataUrl={fieldQrDataUrl}
          onCreate={(templateId) => startCreate(templateId)}
          onFilter={(status) => { setStatusFilter(status); setActiveView("register"); }}
          canCreateInspection={canCreateInspection}
          isMobile={isMobile}
          onGenerateBlankPdf={(template) => void generateBlankInspectionPdf(template)}
        />
      ) : null}

      {activeView === "register" ? (
        <RegisterView
          records={filteredRecords}
          totalRecords={records.length}
          search={search}
          statusFilter={statusFilter}
          selected={selected}
          draft={draft}
          people={people}
          evidence={selectedEvidence}
          saving={saving}
          uploading={uploading}
          uploadItemNumber={uploadItemNumber}
          selectedId={selectedId}
          onSearch={setSearch}
          onStatusFilter={setStatusFilter}
          onCreate={() => startCreate()}
          onSelect={selectRecordAndScroll}
          onDraftChange={updateDraft}
          onPersonSelect={selectPerson}
          onChecklistChange={updateChecklist}
          onSave={() => void saveInspection()}
          onDelete={() => selected ? void deleteInspection(selected) : undefined}
          onUpload={(event) => void uploadEvidence(event, uploadItemNumber)}
          onUploadForItem={(itemNumber, event) => void uploadEvidence(event, itemNumber)}
          onUploadItemNumberChange={setUploadItemNumber}
          onOpenEvidence={openEvidenceFile}
          onDeleteEvidence={deleteEvidenceFile}
          onGeneratePdf={() => selected ? void generatePdf(draft) : undefined}
          onGeneratePdfForRecord={(record) => void generatePdf(record, evidence.filter((file) => file.inspection_id === record.id))}
          linkedActions={selectedLinkedActions}
          canCreateInspection={canCreateInspection}
          canEditInspection={canEditInspection}
          isMobile={isMobile}
          detailPanelRef={selectedDetailRef}
        />
      ) : null}

      {activeView === "create" ? (
        <CreateInspectionView
          selectedTemplate={selectedTemplate}
          selectedTemplateId={selectedTemplateId}
          draft={draft}
          people={people}
          saving={saving}
          pendingEvidence={pendingEvidence}
          uploadItemNumber={uploadItemNumber}
          onSelectTemplate={setSelectedTemplateId}
          onDraftChange={updateDraft}
          onPersonSelect={selectPerson}
          onChecklistChange={updateChecklist}
          onPendingUpload={(event) => addPendingEvidence(event, uploadItemNumber)}
          onPendingUploadForItem={(itemNumber, event) => addPendingEvidence(event, itemNumber)}
          onUploadItemNumberChange={setUploadItemNumber}
          onRemovePendingEvidence={removePendingEvidence}
          onSave={() => void saveInspection()}
          canCreateInspection={canCreateInspection}
          isMobile={isMobile}
          isFieldCreateMode={isFieldCreateMode}
        />
      ) : null}
    </main>
  );
}

function MobileInspectionHero({ latestSummary }: { latestSummary: string }) {
  return (
    <section style={mobileHeroStyle}>
      <div style={mobileHeroEyebrowStyle}>HSE Management</div>
      <h1 style={mobileHeroTitleStyle}>Site Inspections</h1>
      <p style={mobileHeroDescriptionStyle}>Choose, complete, evidence, and report HSE inspections from the field.</p>
      <div style={mobileHeroCardGridStyle}>
        <div style={mobileHeroCardStyle}>
          <span>Last Refreshed</span>
          <strong>{new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</strong>
        </div>
        <div style={mobileHeroCardStyle}>
          <span>Latest Inspection</span>
          <strong>{latestSummary}</strong>
        </div>
      </div>
    </section>
  );
}

function TopRow({ status }: { status: string }) {
  return (
    <div style={topMetaRowStyle}>
      <Link href="/hse" style={backLinkStyle}>&larr; Back to Dashboard</Link>
      <div style={statusBannerStyle}><strong>Status:</strong> {status}</div>
    </div>
  );
}

function DashboardView({
  kpis,
  qrDataUrl,
  onCreate,
  onFilter,
  canCreateInspection,
  isMobile,
  onGenerateBlankPdf,
}: {
  kpis: { open: number; complete: number; findings: number; evidenceCount: number };
  qrDataUrl: string;
  onCreate: (templateId?: string) => void;
  onFilter: (status: string) => void;
  canCreateInspection: boolean;
  isMobile: boolean;
  onGenerateBlankPdf: (template: InspectionTemplate) => void;
}) {
  return (
    <>
      <section style={isMobile ? mobileStatsGridStyle : statsGridStyle}>
        <QualityKpiCard title="Open Inspections" value={kpis.open} accent="#63B1BC" onClick={() => onFilter("Open")} />
        <QualityKpiCard title="Completed / Closed" value={kpis.complete} accent="#005670" onClick={() => onFilter("Complete")} />
        <QualityKpiCard title="Open Findings" value={kpis.findings} accent="#F93822" />
        <QualityKpiCard title="Evidence Files" value={kpis.evidenceCount} accent="#53565A" />
      </section>

      <section style={isMobile ? mobileDashboardGridStyle : dashboardGridStyle}>
        <SectionCard title="Inspection Form Library">
          <div style={isMobile ? mobileStoryGridStyle : storyGridStyle}>
            {inspectionTemplates.map((template) => (
              <button key={template.id} type="button" style={miniTemplateButtonStyle} onClick={() => onGenerateBlankPdf(template)}>
                <strong>{template.documentNumber}</strong>
                <span>{template.title}</span>
                <small>{template.enabled ? templateRevisionLabel(template) : "Blank printable template"}</small>
                <small style={blankPdfCueStyle}>Open blank PDF</small>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Live Digital Inspections">
          <p style={emptyTextStyle}>
            All six HSE inspection forms are now wired for laptop entry, mobile-friendly completion, evidence upload, register tracking, and PDF output.
          </p>
          <div style={buttonRowStyle}>
            {inspectionTemplates.map((template) => (
              <button key={template.id} type="button" onClick={() => onCreate(template.id)} style={primaryButtonStyle} disabled={!canCreateInspection}>
                Create {template.documentNumber.replace("ENS-HSEQ-", "")}
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Mobile QR Access">
          <p style={emptyTextStyle}>
            Scan this QR code to open the mobile inspection entry page, choose the inspection type, and complete the inspection at point of contact.
          </p>
          {qrDataUrl ? <img src={qrDataUrl} alt="HSE inspection field access QR code" style={qrImageStyle} /> : <div style={emptyBoxStyle}>Generating QR code...</div>}
          <Link href="/hse/inspections/field" style={secondaryLinkStyle}>Open mobile inspection page</Link>
        </SectionCard>

        <SectionCard title="Report Standard">
          <p style={emptyTextStyle}>
            Generated inspection reports use the Enshore header, green section bars, compact tables, evidence links, revision reference, and page numbering.
          </p>
        </SectionCard>

        <SectionCard title="Next Forms">
          <p style={emptyTextStyle}>
            Use the form library to open blank printable PDFs, or use Create Inspection / mobile QR access to complete inspections digitally.
          </p>
        </SectionCard>
      </section>
    </>
  );
}

function RegisterView({
  records,
  totalRecords,
  search,
  statusFilter,
  selected,
  draft,
  people,
  evidence,
  saving,
  uploading,
  uploadItemNumber,
  selectedId,
  onSearch,
  onStatusFilter,
  onCreate,
  onSelect,
  onDraftChange,
  onPersonSelect,
  onChecklistChange,
  onSave,
  onDelete,
  onUpload,
  onUploadForItem,
  onUploadItemNumberChange,
  onOpenEvidence,
  onDeleteEvidence,
  onGeneratePdf,
  onGeneratePdfForRecord,
  linkedActions,
  canCreateInspection,
  canEditInspection,
  isMobile,
  detailPanelRef,
}: {
  records: HseInspectionRecord[];
  totalRecords: number;
  search: string;
  statusFilter: string;
  selected: HseInspectionRecord | null;
  draft: HseInspectionRecord;
  people: PeopleOption[];
  evidence: InspectionEvidence[];
  saving: boolean;
  uploading: boolean;
  uploadItemNumber: string;
  selectedId: string;
  onSearch: (value: string) => void;
  onStatusFilter: (value: string) => void;
  onCreate: () => void;
  onSelect: (record: HseInspectionRecord) => void;
  onDraftChange: <K extends keyof HseInspectionRecord>(key: K, value: HseInspectionRecord[K]) => void;
  onPersonSelect: (value: string, target: "inspector" | "signoff") => void;
  onChecklistChange: (itemId: string, field: keyof ChecklistResponse, value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onUploadForItem: (itemNumber: string, event: ChangeEvent<HTMLInputElement>) => void;
  onUploadItemNumberChange: (value: string) => void;
  onOpenEvidence: (file: InspectionEvidence) => void;
  onDeleteEvidence: (file: InspectionEvidence) => void;
  onGeneratePdf: () => void;
  onGeneratePdfForRecord: (record: HseInspectionRecord) => void;
  linkedActions: CentralAction[];
  canCreateInspection: boolean;
  canEditInspection: boolean;
  isMobile: boolean;
  detailPanelRef: RefObject<HTMLDivElement | null>;
}) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <section style={splitGridStyle}>
      <div style={isMobile ? mobilePanelStyle : panelStyle}>
        <PanelHeader title="Inspection Register" description="Logged HSE inspections with status, findings, evidence, and report output." />
        <div style={isMobile ? mobileRegisterToolbarStyle : registerToolbarStyle}>
          <input style={inputStyle} placeholder="Search inspections" value={search} onChange={(event) => onSearch(event.target.value)} />
          <button type="button" onClick={() => setShowFilters((current) => !current)} style={showFilters ? secondaryButtonStyle : primaryButtonStyle}>
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
          <button type="button" onClick={onCreate} style={primaryButtonStyle} disabled={!canCreateInspection}>Create Inspection</button>
        </div>
        {showFilters ? (
        <div style={isMobile ? mobileRegisterToolbarStyle : registerToolbarStyle}>
          <select style={selectStyle} value={statusFilter} onChange={(event) => onStatusFilter(event.target.value)}>
            <option value="">All Statuses</option>
            {["Draft", "Open", "Complete", "Closed"].map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <button type="button" onClick={() => { onSearch(""); onStatusFilter(""); }} style={secondaryButtonStyle}>Clear Filters</button>
        </div>
        ) : null}
        <div style={tableInfoStyle}>Showing {records.length} of {totalRecords} inspections</div>
        {isMobile ? (
          <div style={mobileRegisterListStyle}>
            {records.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => onSelect(record)}
                style={{ ...mobileRegisterCardStyle, borderColor: selected?.id === record.id ? "#005670" : "#dbe3ef" }}
              >
                <div>
                  <strong style={mobileRegisterNumberStyle}>{record.inspection_number}</strong>
                  <span style={mobileRegisterTitleStyle}>{record.form_title}</span>
                  <span style={mutedTextStyle}>{record.area_zone || record.vessel_spread || "No area"} - {record.inspector_name || "No inspector"}</span>
                </div>
                <div style={mobileRegisterMetaStyle}>
                  <StatusPill status={record.status} />
                  <span>{displayDate(record.inspection_date) || "-"}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    style={pdfButtonStyle}
                    onClick={(event) => {
                      event.stopPropagation();
                      onGeneratePdfForRecord(record);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        onGeneratePdfForRecord(record);
                      }
                    }}
                  >
                    PDF
                  </span>
                </div>
              </button>
            ))}
            {!records.length ? <div style={emptyBoxStyle}>No inspections match the current filter.</div> : null}
          </div>
        ) : (
        <div style={tableShellStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Inspection No.</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Area / Zone</th>
                <th style={thStyle}>Inspector</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Report</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} onClick={() => onSelect(record)} style={{ ...clickableRowStyle, background: selected?.id === record.id ? "#ECECE7" : "white" }}>
                  <td style={tdStrongStyle}>{record.inspection_number}</td>
                  <td style={tdStyle}>{record.form_title}</td>
                  <td style={tdStyle}>{record.area_zone || record.vessel_spread || "-"}</td>
                  <td style={tdStyle}>{record.inspector_name || "-"}</td>
                  <td style={tdStyle}>{displayDate(record.inspection_date) || "-"}</td>
                  <td style={tdStyle}><StatusPill status={record.status} /></td>
                  <td style={reportTdStyle}>
                    <button
                      type="button"
                      style={pdfButtonStyle}
                      onClick={(event) => {
                        event.stopPropagation();
                        onGeneratePdfForRecord(record);
                      }}
                    >
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
              {!records.length ? (
                <tr>
                  <td colSpan={7} style={emptyCellStyle}>No inspections match the current filter.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        )}
      </div>

      <div ref={detailPanelRef} style={isMobile ? mobileDetailPanelStyle : detailPanelStyle}>
        {!selected ? (
          <div style={emptyBoxStyle}>Select an inspection to open the detail/edit panel.</div>
        ) : (
          <>
            <PanelHeader title={`${draft.inspection_number} - ${draft.title}`} description={`${draft.form_number} ${recordRevisionLabel(draft)}`} />
            <InspectionForm
              draft={draft}
              people={people}
              compact
              onDraftChange={onDraftChange}
              onPersonSelect={onPersonSelect}
              onChecklistChange={onChecklistChange}
              canUploadEvidence={Boolean(selectedId) && canEditInspection}
              uploading={uploading}
              onUploadEvidenceForItem={onUploadForItem}
              isMobile={isMobile}
            />
            <LinkedActionsPanel inspection={draft} linkedActions={linkedActions} canCreateAction={canCreateInspection} />
            <EvidencePanel
              evidence={evidence}
              uploading={uploading}
              uploadItemNumber={uploadItemNumber}
              formId={draft.form_id}
              canEdit={canEditInspection}
              onUploadItemNumberChange={onUploadItemNumberChange}
              onUpload={onUpload}
              onOpen={onOpenEvidence}
              onDelete={onDeleteEvidence}
            />
            <div style={formActionsStyle}>
              <button type="button" style={secondaryButtonStyle} onClick={onGeneratePdf}>Generate PDF Report</button>
              <button type="button" style={primaryButtonStyle} onClick={onSave} disabled={saving || !canEditInspection}>{saving ? "Saving..." : "Save Inspection"}</button>
              <button type="button" style={dangerButtonStyle} onClick={onDelete} disabled={!canEditInspection}>Delete Inspection</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function CreateInspectionView({
  selectedTemplate,
  selectedTemplateId,
  draft,
  people,
  saving,
  pendingEvidence,
  uploadItemNumber,
  onSelectTemplate,
  onDraftChange,
  onPersonSelect,
  onChecklistChange,
  onPendingUpload,
  onPendingUploadForItem,
  onUploadItemNumberChange,
  onRemovePendingEvidence,
  onSave,
  canCreateInspection,
  isMobile,
  isFieldCreateMode,
}: {
  selectedTemplate: InspectionTemplate;
  selectedTemplateId: string;
  draft: HseInspectionRecord;
  people: PeopleOption[];
  saving: boolean;
  pendingEvidence: PendingEvidence[];
  uploadItemNumber: string;
  onSelectTemplate: (id: string) => void;
  onDraftChange: <K extends keyof HseInspectionRecord>(key: K, value: HseInspectionRecord[K]) => void;
  onPersonSelect: (value: string, target: "inspector" | "signoff") => void;
  onChecklistChange: (itemId: string, field: keyof ChecklistResponse, value: string) => void;
  onPendingUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onPendingUploadForItem: (itemNumber: string, event: ChangeEvent<HTMLInputElement>) => void;
  onUploadItemNumberChange: (value: string) => void;
  onRemovePendingEvidence: (id: string) => void;
  onSave: () => void;
  canCreateInspection: boolean;
  isMobile: boolean;
  isFieldCreateMode: boolean;
}) {
  return (
    <section style={isMobile ? mobilePanelStyle : panelStyle}>
      <PanelHeader
        title={isFieldCreateMode ? selectedTemplate.title : "Create Inspection"}
        description={isFieldCreateMode ? `${selectedTemplate.documentNumber} ${templateRevisionLabel(selectedTemplate)} - Complete the inspection and upload evidence as you go.` : "Choose the Enshore inspection form. FRM-041 and FRM-044 are wired first so we can prove the layout, evidence, and PDF before rolling out the remaining forms."}
      />

      {!isFieldCreateMode ? <div style={isMobile ? mobileTemplateGridStyle : templateGridStyle}>
        {inspectionTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelectTemplate(template.id)}
            style={{
              ...templateCardStyle,
              borderColor: selectedTemplateId === template.id ? "#005670" : "#cbd5e1",
              boxShadow: selectedTemplateId === template.id ? "0 0 0 2px rgba(0, 86, 112, 0.14)" : "0 1px 2px rgba(15, 23, 42, 0.06)",
            }}
          >
            <span style={docNumberStyle}>{template.documentNumber}</span>
            <strong>{template.title}</strong>
            <small>{template.description}</small>
            <span style={templateStatusStyle}>{template.enabled ? `Live build - ${templateRevisionLabel(template)}` : "Queued"}</span>
          </button>
        ))}
      </div> : null}

      {!isFieldCreateMode ? <div style={isMobile ? mobileSelectedHeaderStyle : selectedHeaderStyle}>
        <div>
          <div style={selectedEyebrowStyle}>{selectedTemplate.documentNumber}</div>
          <h2 style={selectedTitleStyle}>{selectedTemplate.title}</h2>
          <p style={selectedDescriptionStyle}>
            {selectedTemplate.enabled
              ? `${templateRevisionLabel(selectedTemplate)}.`
              : "This template is staged for the next rollout."}
          </p>
        </div>
        <span style={statusPillStyle}>{selectedTemplate.enabled ? "Ready to complete" : "Template queued"}</span>
      </div> : null}

      {selectedTemplate.enabled ? (
        <>
          <InspectionForm
            draft={draft}
            people={people}
            onDraftChange={onDraftChange}
            onPersonSelect={onPersonSelect}
            onChecklistChange={onChecklistChange}
            canUploadEvidence={canCreateInspection}
            uploading={false}
            onUploadEvidenceForItem={onPendingUploadForItem}
            isMobile={isMobile}
          />
          <PendingEvidencePanel
            pendingEvidence={pendingEvidence}
            uploadItemNumber={uploadItemNumber}
            formId={draft.form_id}
            onUploadItemNumberChange={onUploadItemNumberChange}
            onUpload={onPendingUpload}
            onRemove={onRemovePendingEvidence}
            canCreate={canCreateInspection}
          />
          <div style={formActionsStyle}>
            <button type="button" style={primaryButtonStyle} onClick={onSave} disabled={saving || !canCreateInspection}>{saving ? "Saving..." : "Save Inspection"}</button>
          </div>
        </>
      ) : (
        <div style={emptyBoxStyle}>
          {selectedTemplate.documentNumber} will use this same inspection engine once it is wired: structured form, evidence upload, mobile completion, and PDF output.
        </div>
      )}
    </section>
  );
}

function InspectionForm({
  draft,
  people,
  compact,
  onDraftChange,
  onPersonSelect,
  onChecklistChange,
  canUploadEvidence,
  uploading,
  onUploadEvidenceForItem,
  isMobile = false,
}: {
  draft: HseInspectionRecord;
  people: PeopleOption[];
  compact?: boolean;
  onDraftChange: <K extends keyof HseInspectionRecord>(key: K, value: HseInspectionRecord[K]) => void;
  onPersonSelect: (value: string, target: "inspector" | "signoff") => void;
  onChecklistChange: (itemId: string, field: keyof ChecklistResponse, value: string) => void;
  canUploadEvidence: boolean;
  uploading: boolean;
  onUploadEvidenceForItem: (itemNumber: string, event: ChangeEvent<HTMLInputElement>) => void;
  isMobile?: boolean;
}) {
  return (
    <div style={compact ? (isMobile ? mobileCompactFormStyle : compactFormStyle) : undefined}>
      <InspectionSection title="Report Details">
        <div style={isMobile ? mobileFormGridStyle : formGridStyle}>
          <Field label="Inspection No."><input style={{ ...inputStyle, background: "#f8fafc" }} value={draft.inspection_number} readOnly /></Field>
          <Field label="Status">
            <select style={inputStyle} value={draft.status} onChange={(event) => onDraftChange("status", event.target.value as InspectionStatus)}>
              {["Draft", "Open", "Complete", "Closed"].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </Field>
          <Field label="Title"><input style={inputStyle} value={draft.title} onChange={(event) => onDraftChange("title", event.target.value)} /></Field>
          <Field label="Department"><input style={inputStyle} value={draft.department || ""} onChange={(event) => onDraftChange("department", event.target.value)} /></Field>
          <Field label="Inspection Date"><input type="date" style={inputStyle} value={draft.inspection_date || ""} onChange={(event) => onDraftChange("inspection_date", event.target.value)} /></Field>
          <Field label="Project / Work Scope"><input style={inputStyle} value={draft.project_work_scope || ""} onChange={(event) => onDraftChange("project_work_scope", event.target.value)} /></Field>
          <Field label="Vessel / Spread"><input style={inputStyle} value={draft.vessel_spread || ""} onChange={(event) => onDraftChange("vessel_spread", event.target.value)} /></Field>
          <Field label="Area / Zone"><input style={inputStyle} value={draft.area_zone || ""} onChange={(event) => onDraftChange("area_zone", event.target.value)} /></Field>
          <Field label="Inspector">
            <PeopleSelect people={people} value={draft.inspector_name || ""} onChange={(value) => onPersonSelect(value, "inspector")} />
          </Field>
          <Field label="Inspector Position"><input style={inputStyle} value={draft.inspector_position || ""} onChange={(event) => onDraftChange("inspector_position", event.target.value)} /></Field>
        </div>
      </InspectionSection>

      {getChecklistForTemplateId(draft.form_id).map((section) => (
        <InspectionSection key={section.id} title={section.title}>
          {isMobile ? (
            <div style={mobileChecklistListStyle}>
              {section.items.map((item) => {
                const response = draft.checklist_responses[item.id] || { answer: "", comments: "" };
                return (
                  <div key={item.id} style={mobileChecklistCardStyle}>
                    <div style={mobileChecklistItemHeaderStyle}>
                      <strong>{item.number}</strong>
                      <span>{item.text}</span>
                    </div>
                    <div style={mobileAnswerGridStyle}>
                      {(["N/A", "Yes", "No"] as ChecklistAnswer[]).map((answer) => (
                        <label
                          key={answer}
                          style={{
                            ...mobileAnswerOptionStyle,
                            borderColor: response.answer === answer ? "#005670" : "#cbd5e1",
                            background: response.answer === answer ? "#ECECE7" : "#ffffff",
                            color: response.answer === answer ? "#005670" : "#0f172a",
                          }}
                        >
                          <input
                            type="radio"
                            name={`${item.id}-${compact ? "edit" : "create"}`}
                            checked={response.answer === answer}
                            onChange={() => onChecklistChange(item.id, "answer", answer)}
                          />
                          {answer}
                        </label>
                      ))}
                    </div>
                    <textarea
                      style={smallTextareaStyle}
                      placeholder="Comments / action notes"
                      value={response.comments}
                      onChange={(event) => onChecklistChange(item.id, "comments", event.target.value)}
                    />
                    <label style={{ ...mobileItemUploadButtonStyle, opacity: canUploadEvidence ? 1 : 0.55 }}>
                      {uploading ? "Uploading..." : `Upload evidence for item ${item.number}`}
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                        capture="environment"
                        style={{ display: "none" }}
                        disabled={!canUploadEvidence || uploading}
                        onChange={(event) => onUploadEvidenceForItem(item.id, event)}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={checklistShellStyle}>
              <div style={checklistHeaderStyle}>
                <span>Item</span>
                <span>Description</span>
              <span style={centerHeaderCellStyle}>N/A</span>
              <span style={centerHeaderCellStyle}>Yes</span>
              <span style={centerHeaderCellStyle}>No</span>
                <span>Comments / action notes</span>
                <span>Evidence</span>
              </div>
              {section.items.map((item) => {
                const response = draft.checklist_responses[item.id] || { answer: "", comments: "" };
                return (
                <div key={item.id} style={checklistRowStyle}>
                  <strong style={centeredChecklistCellStyle}>{item.number}</strong>
                  <span style={centeredChecklistCellStyle}>{item.text}</span>
                    {(["N/A", "Yes", "No"] as ChecklistAnswer[]).map((answer) => (
                      <label key={answer} style={radioCellStyle}>
                        <input
                          type="radio"
                          name={`${item.id}-${compact ? "edit" : "create"}`}
                          checked={response.answer === answer}
                          onChange={() => onChecklistChange(item.id, "answer", answer)}
                        />
                      </label>
                    ))}
                    <textarea style={smallTextareaStyle} value={response.comments} onChange={(event) => onChecklistChange(item.id, "comments", event.target.value)} />
                    <label style={{ ...itemUploadButtonStyle, opacity: canUploadEvidence ? 1 : 0.55 }}>
                      {uploading ? "..." : "Upload"}
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                        capture="environment"
                        style={{ display: "none" }}
                        disabled={!canUploadEvidence || uploading}
                        onChange={(event) => onUploadEvidenceForItem(item.id, event)}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </InspectionSection>
      ))}

      <InspectionSection title={additionalCommentsTitle(draft.form_id)}>
        <textarea style={largeTextareaStyle} value={draft.additional_comments || ""} onChange={(event) => onDraftChange("additional_comments", event.target.value)} />
      </InspectionSection>

      <InspectionSection title="Sign-Off">
        <div style={isMobile ? mobileFormGridStyle : formGridStyle}>
          <Field label="Name">
            <PeopleSelect people={people} value={draft.signoff_name || ""} onChange={(value) => onPersonSelect(value, "signoff")} />
          </Field>
          <Field label="Position"><input style={inputStyle} value={draft.signoff_position || ""} onChange={(event) => onDraftChange("signoff_position", event.target.value)} /></Field>
          <Field label="Company"><input style={inputStyle} value={draft.signoff_company || ""} onChange={(event) => onDraftChange("signoff_company", event.target.value)} /></Field>
          <Field label="Date"><input type="date" style={inputStyle} value={draft.signoff_date || ""} onChange={(event) => onDraftChange("signoff_date", event.target.value)} /></Field>
        </div>
      </InspectionSection>
    </div>
  );
}

function LinkedActionsPanel({
  inspection,
  linkedActions,
  canCreateAction,
}: {
  inspection: HseInspectionRecord;
  linkedActions: CentralAction[];
  canCreateAction: boolean;
}) {
  const createHref = `/hse/actions?view=create&prefill_source=${encodeURIComponent("HSE Inspection")}` +
    `&prefill_department=HSEQ` +
    `&prefill_project=${encodeURIComponent(inspection.project_work_scope || inspection.vessel_spread || "")}` +
    `&prefill_title=${encodeURIComponent(`${inspection.inspection_number} - ${inspection.title}`)}` +
    `&prefill_description=${encodeURIComponent(`Linked HSE inspection: ${inspection.form_number} ${inspection.form_title}\nArea / Zone: ${inspection.area_zone || ""}\nInspection date: ${displayDate(inspection.inspection_date)}`)}` +
    `&linked_hse_inspection_id=${encodeURIComponent(inspection.id)}` +
    `&linked_hse_inspection_number=${encodeURIComponent(inspection.inspection_number)}`;

  return (
    <InspectionSection title="Linked Actions">
      <div style={buttonRowStyle}>
        {canCreateAction ? (
          <Link href={createHref} style={primaryLinkStyle}>Create Linked HSE Action</Link>
        ) : (
          <button type="button" style={secondaryButtonStyle} disabled>Create Linked HSE Action</button>
        )}
        <span style={mutedTextStyle}>Actions are controlled in central Action Management and linked back to this inspection.</span>
      </div>
      <div style={evidenceListStyle}>
        {linkedActions.map((action) => (
          <div key={action.id} style={evidenceCardStyle}>
            <div>
              <strong>{action.action_number || "Action"} - {action.title || "Untitled action"}</strong>
              <div style={mutedTextStyle}>
                {action.owner || "No owner"} - {action.status || "No status"}{action.due_date ? ` - Due ${displayDate(action.due_date)}` : ""}
              </div>
            </div>
            <Link href={`/hse/actions?actionId=${encodeURIComponent(action.id)}`} style={secondaryLinkStyle}>Open Action</Link>
          </div>
        ))}
        {!linkedActions.length ? <div style={emptyBoxStyle}>No central actions linked to this inspection yet.</div> : null}
      </div>
    </InspectionSection>
  );
}

function EvidenceItemPicker({ value, formId, onChange }: { value: string; formId: string; onChange: (value: string) => void }) {
  const itemOptions = checklistOptionsForTemplate(formId);
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>Link evidence to item number</span>
      <select style={inputStyle} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">General inspection evidence</option>
        {itemOptions.map((item) => (
          <option key={item.id} value={item.id}>{item.label}</option>
        ))}
      </select>
    </label>
  );
}

function PendingEvidencePanel({
  pendingEvidence,
  uploadItemNumber,
  formId,
  onUploadItemNumberChange,
  onUpload,
  onRemove,
  canCreate,
}: {
  pendingEvidence: PendingEvidence[];
  uploadItemNumber: string;
  formId: string;
  onUploadItemNumberChange: (value: string) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (id: string) => void;
  canCreate: boolean;
}) {
  return (
    <InspectionSection title="Evidence Upload">
      <p style={emptyTextStyle}>Upload photos/files while creating the inspection. They will be uploaded when the inspection is saved.</p>
      <EvidenceItemPicker value={uploadItemNumber} formId={formId} onChange={onUploadItemNumberChange} />
      <label style={{ ...uploadButtonStyle, opacity: canCreate ? 1 : 0.55 }}>
        Upload Photos / Files
        <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" capture="environment" style={{ display: "none" }} onChange={onUpload} disabled={!canCreate} />
      </label>
      <div style={evidenceListStyle}>
        {pendingEvidence.map((file) => (
          <div key={file.id} style={evidenceCardStyle}>
            <div>
              <strong>{file.file.name}</strong>
              <div style={mutedTextStyle}>{formatFileSize(file.file.size)}{file.item_number ? ` - Item ${file.item_number}` : " - General evidence"}</div>
            </div>
            <button type="button" style={dangerButtonStyle} onClick={() => onRemove(file.id)} disabled={!canCreate}>Remove</button>
          </div>
        ))}
        {!pendingEvidence.length ? <div style={emptyBoxStyle}>No staged evidence yet.</div> : null}
      </div>
    </InspectionSection>
  );
}

function EvidencePanel({
  evidence,
  uploading,
  uploadItemNumber,
  formId,
  canEdit,
  onUploadItemNumberChange,
  onUpload,
  onOpen,
  onDelete,
}: {
  evidence: InspectionEvidence[];
  uploading: boolean;
  uploadItemNumber: string;
  formId: string;
  canEdit: boolean;
  onUploadItemNumberChange: (value: string) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpen: (file: InspectionEvidence) => void;
  onDelete: (file: InspectionEvidence) => void;
}) {
  const sortedEvidence = sortEvidenceByItem(evidence);
  return (
    <InspectionSection title="Evidence Upload">
      <p style={emptyTextStyle}>Upload inspection photos or supporting files. On mobile, choose the camera option to capture evidence at the inspection point.</p>
      <EvidenceItemPicker value={uploadItemNumber} formId={formId} onChange={onUploadItemNumberChange} />
      <label style={{ ...uploadButtonStyle, opacity: canEdit ? 1 : 0.55 }}>
        {uploading ? "Uploading..." : "Upload Evidence"}
        <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" capture="environment" style={{ display: "none" }} onChange={onUpload} disabled={uploading || !canEdit} />
      </label>
      <div style={evidenceListStyle}>
        {sortedEvidence.map((file) => (
          <div key={file.id} style={evidenceCardStyle}>
            <div>
              <strong>{file.file_name}</strong>
              <div style={mutedTextStyle}>
                {formatFileSize(file.file_size)} - Uploaded {displayDateTime(file.uploaded_at)}
                {file.item_number ? ` - Item ${file.item_number}` : " - General evidence"}
              </div>
            </div>
            <div style={buttonRowStyle}>
              <button type="button" style={secondaryButtonStyle} onClick={() => onOpen(file)}>Open / Preview</button>
              <button type="button" style={dangerButtonStyle} onClick={() => onDelete(file)} disabled={!canEdit}>Delete</button>
            </div>
          </div>
        ))}
        {!evidence.length ? <div style={emptyBoxStyle}>No evidence uploaded yet.</div> : null}
      </div>
    </InspectionSection>
  );
}

function PeopleSelect({ people, value, onChange }: { people: PeopleOption[]; value: string; onChange: (value: string) => void }) {
  const hasLegacyValue = value && !people.some((person) => person.name === value || person.id === value);
  return (
    <select style={inputStyle} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Select person</option>
      {hasLegacyValue ? <option value={value}>{value}</option> : null}
      {people.map((person) => <option key={person.id} value={person.name}>{person.name}</option>)}
    </select>
  );
}

function InspectionSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={inspectionSectionStyle}>
      <h3 style={inspectionSectionTitleStyle}>{title}</h3>
      <div style={inspectionSectionBodyStyle}>{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  const color = status === "Closed" || status === "Complete" ? "#005670" : status === "Open" ? "#63B1BC" : "#FFAD00";
  return <span style={{ ...statusPillInlineStyle, background: `${color}22`, color }}>{status}</span>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...tabButtonStyle,
        background: active ? "#005670" : "#e2e8f0",
        color: active ? "white" : "#0f172a",
      }}
    >
      {children}
    </button>
  );
}

function PanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <div style={panelHeaderStyle}>
      <h2 style={panelTitleStyle}>{title}</h2>
      <p style={panelDescriptionStyle}>{description}</p>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={sectionCardStyle}>
      <h2 style={sectionTitleStyle}>{title}</h2>
      {children}
    </section>
  );
}

const topMetaRowStyle: CSSProperties = {
  marginBottom: 20,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  background: "rgba(255,255,255,0.92)",
  border: "1px solid #dbe3ef",
  borderRadius: "16px",
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};
const backLinkStyle: CSSProperties = { color: "#005670", fontWeight: 700, textDecoration: "none" };
const statusBannerStyle: CSSProperties = { background: "white", borderRadius: "12px", padding: "12px 16px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)", color: "#0f172a" };
const tabRowStyle: CSSProperties = { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" };
const tabButtonStyle: CSSProperties = { border: "none", borderRadius: "10px", padding: "10px 14px", fontWeight: 800, cursor: "pointer", minHeight: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1.2, boxSizing: "border-box" };
const statsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px", marginBottom: "20px" };
const dashboardGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "20px" };
const sectionCardStyle: CSSProperties = { background: "white", borderRadius: "16px", padding: "20px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)" };
const sectionTitleStyle: CSSProperties = { margin: "0 0 10px", fontSize: "18px", color: "#0f172a" };
const emptyTextStyle: CSSProperties = { color: "#475569", margin: "0 0 14px", lineHeight: 1.55 };
const storyGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" };
const miniTemplateStyle: CSSProperties = { border: "1px solid #cbd5e1", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "4px", color: "#0f172a", background: "#f8fafc" };
const miniTemplateButtonStyle: CSSProperties = { ...miniTemplateStyle, textAlign: "left", cursor: "pointer", font: "inherit" };
const blankPdfCueStyle: CSSProperties = { marginTop: "6px", color: "#005670", fontWeight: 900 };
const panelStyle: CSSProperties = { background: "white", borderRadius: "18px", padding: "20px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)" };
const panelHeaderStyle: CSSProperties = { background: "#005670", color: "white", borderRadius: "10px", padding: "14px 16px", marginBottom: "18px" };
const panelTitleStyle: CSSProperties = { margin: 0, fontSize: "18px", fontWeight: 800 };
const panelDescriptionStyle: CSSProperties = { margin: "4px 0 0", fontSize: "13px", lineHeight: 1.45 };
const splitGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "1fr", gap: "20px", alignItems: "start" };
const detailPanelStyle: CSSProperties = {
  display: "grid",
  gap: "18px",
  border: "1px solid #dbe3ef",
  borderRadius: "18px",
  padding: "18px",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
  width: "100%",
  boxSizing: "border-box",
  minWidth: 0,
};
const registerToolbarStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  alignItems: "end",
  marginBottom: "14px",
  padding: "12px",
  border: "1px solid #dbe3ef",
  borderRadius: "16px",
  background: "rgba(248,250,252,0.92)",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
};
const inputStyle: CSSProperties = { width: "100%", minHeight: "42px", border: "1px solid #cbd5e1", borderRadius: "9px", padding: "9px 12px", fontSize: "14px", background: "white", boxSizing: "border-box" };
const selectStyle: CSSProperties = { ...inputStyle };
const tableInfoStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "4px",
  flexWrap: "wrap",
  color: "#475569",
  fontSize: "13px",
  fontWeight: 700,
  margin: "12px 0",
};
const tableShellStyle: CSSProperties = {
  overflowX: "auto",
  border: "1px solid #dbe3ef",
  borderRadius: "16px",
  background: "#ffffff",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
};
const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#ffffff",
  minWidth: 960,
  fontSize: "13px",
};
const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "13px 14px",
  background: "#f8fafc",
  color: "#334155",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #dbe3ef",
  whiteSpace: "nowrap",
};
const tdStyle: CSSProperties = {
  padding: "13px 14px",
  borderBottom: "1px solid #edf2f7",
  color: "#0f172a",
  verticalAlign: "middle",
  fontSize: "13px",
  lineHeight: 1.45,
};
const tdStrongStyle: CSSProperties = { ...tdStyle, fontWeight: 900, color: "#005670" };
const reportTdStyle: CSSProperties = { ...tdStyle, textAlign: "center", width: "96px" };
const clickableRowStyle: CSSProperties = { cursor: "pointer" };
const emptyCellStyle: CSSProperties = {
  padding: "26px 14px",
  textAlign: "center",
  color: "#64748b",
  background: "#f8fafc",
  borderBottom: "1px dashed #cbd5e1",
};
const primaryButtonStyle: CSSProperties = { background: "#005670", color: "white", border: "none", borderRadius: "10px", padding: "11px 16px", fontWeight: 800, cursor: "pointer" };
const secondaryButtonStyle: CSSProperties = { background: "#e2e8f0", color: "#0f172a", border: "none", borderRadius: "10px", padding: "11px 16px", fontWeight: 800, cursor: "pointer" };
const pdfButtonStyle: CSSProperties = { background: "#e2e8f0", color: "#0f172a", border: "none", borderRadius: "9px", padding: "8px 14px", fontWeight: 900, cursor: "pointer", minWidth: "54px", lineHeight: 1 };
const dangerButtonStyle: CSSProperties = { background: "#F93822", color: "white", border: "none", borderRadius: "10px", padding: "11px 16px", fontWeight: 800, cursor: "pointer" };
const primaryLinkStyle: CSSProperties = { ...primaryButtonStyle, display: "inline-flex", textDecoration: "none", alignItems: "center" };
const secondaryLinkStyle: CSSProperties = { ...secondaryButtonStyle, display: "inline-flex", textDecoration: "none", alignItems: "center" };
const templateGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px", marginBottom: "20px" };
const templateCardStyle: CSSProperties = { minHeight: "164px", display: "flex", flexDirection: "column", gap: "8px", textAlign: "left", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "14px", padding: "14px", cursor: "pointer", color: "#0f172a" };
const docNumberStyle: CSSProperties = { color: "#005670", fontWeight: 900, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.04em" };
const templateStatusStyle: CSSProperties = { marginTop: "auto", color: "#005670", fontWeight: 800, fontSize: "12px" };
const selectedHeaderStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "flex-start", border: "1px solid #D0D0CE", background: "#ECECE7", borderRadius: "14px", padding: "16px", marginBottom: "18px" };
const selectedEyebrowStyle: CSSProperties = { fontSize: "12px", color: "#005670", fontWeight: 900, letterSpacing: "0.04em" };
const selectedTitleStyle: CSSProperties = { margin: "4px 0", fontSize: "22px", color: "#0f172a" };
const selectedDescriptionStyle: CSSProperties = { margin: 0, color: "#475569", lineHeight: 1.45 };
const statusPillStyle: CSSProperties = { background: "#dcfce7", color: "#166534", borderRadius: "999px", padding: "7px 10px", fontWeight: 800, fontSize: "12px", whiteSpace: "nowrap" };
const statusPillInlineStyle: CSSProperties = { borderRadius: "999px", padding: "6px 9px", fontWeight: 900, fontSize: "12px", whiteSpace: "nowrap" };
const compactFormStyle: CSSProperties = { maxHeight: "62vh", overflow: "auto", paddingRight: "6px" };
const formGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" };
const fieldStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "6px", fontWeight: 800, color: "#334155", fontSize: "12px" };
const labelStyle: CSSProperties = { textTransform: "uppercase", letterSpacing: "0.03em" };
const inspectionSectionStyle: CSSProperties = { border: "1px solid #cbd5e1", borderRadius: "14px", overflow: "hidden", marginBottom: "16px", background: "white" };
const inspectionSectionTitleStyle: CSSProperties = { margin: 0, background: "#005670", color: "white", padding: "12px 14px", fontSize: "16px", fontWeight: 900 };
const inspectionSectionBodyStyle: CSSProperties = { padding: "14px" };
const checklistShellStyle: CSSProperties = { display: "grid", gap: "0", border: "1px solid #dbe3ef", borderRadius: "10px", overflow: "hidden" };
const checklistHeaderStyle: CSSProperties = { display: "grid", gridTemplateColumns: "60px minmax(220px, 1fr) 48px 48px 48px minmax(160px, 0.62fr) 74px", gap: 0, alignItems: "center", background: "#f1f5f9", fontWeight: 900, color: "#0f172a", fontSize: "12px" };
const checklistRowStyle: CSSProperties = { display: "grid", gridTemplateColumns: "60px minmax(220px, 1fr) 48px 48px 48px minmax(160px, 0.62fr) 74px", gap: 0, alignItems: "stretch", borderTop: "1px solid #dbe3ef", fontSize: "13px" };
const centerHeaderCellStyle: CSSProperties = { textAlign: "center", justifySelf: "center", width: "100%" };
const centeredChecklistCellStyle: CSSProperties = { display: "flex", alignItems: "center", padding: "8px 8px 8px 0", lineHeight: 1.35 };
const radioCellStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid #dbe3ef" };
const itemUploadButtonStyle: CSSProperties = { margin: "8px", minHeight: "30px", border: "1px solid #D0D0CE", background: "#ECECE7", color: "#005670", borderRadius: "8px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "11px", cursor: "pointer" };
const smallTextareaStyle: CSSProperties = { width: "100%", minHeight: "42px", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "8px", fontSize: "13px", resize: "vertical", boxSizing: "border-box" };
const largeTextareaStyle: CSSProperties = { ...smallTextareaStyle, minHeight: "110px" };
const actionTableStyle: CSSProperties = { display: "grid", gap: 0, border: "1px solid #dbe3ef", borderRadius: "10px", overflow: "hidden", marginBottom: "12px" };
const actionHeaderStyle: CSSProperties = { display: "grid", gridTemplateColumns: "52px minmax(220px, 1fr) 180px 150px 110px", background: "#f1f5f9", fontWeight: 900, fontSize: "12px" };
const actionRowStyle: CSSProperties = { display: "grid", gridTemplateColumns: "52px minmax(220px, 1fr) 180px 150px 110px", gap: "8px", alignItems: "center", padding: "8px", borderTop: "1px solid #dbe3ef" };
const formActionsStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap", marginTop: "16px" };
const emptyBoxStyle: CSSProperties = { border: "1px dashed #cbd5e1", borderRadius: "12px", padding: "18px", color: "#64748b", background: "#f8fafc" };
const uploadButtonStyle: CSSProperties = { ...primaryButtonStyle, display: "inline-flex", width: "fit-content", marginBottom: "12px" };
const evidenceListStyle: CSSProperties = { display: "grid", gap: "10px" };
const evidenceCardStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", border: "1px solid #dbe3ef", borderRadius: "12px", padding: "12px", background: "#f8fafc" };
const mutedTextStyle: CSSProperties = { color: "#64748b", fontSize: "12px", marginTop: "4px" };
const buttonRowStyle: CSSProperties = { display: "flex", gap: "8px", flexWrap: "wrap" };
const qrImageStyle: CSSProperties = { width: "160px", height: "160px", border: "1px solid #dbe3ef", borderRadius: "12px", padding: "8px", background: "white", marginBottom: "10px" };

const mobileMainStyle: CSSProperties = {
  maxWidth: "100%",
  overflowX: "hidden",
};

const mobileHeroStyle: CSSProperties = {
  marginBottom: "16px",
  padding: "20px 18px",
  borderRadius: "20px",
  background: "linear-gradient(135deg, #005670 0%, #005670 64%, #63B1BC 160%)",
  color: "#ffffff",
  display: "grid",
  gap: "12px",
  boxShadow: "0 16px 30px rgba(0, 86, 112, 0.18)",
};

const mobileHeroEyebrowStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.86)",
};

const mobileHeroTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "34px",
  lineHeight: 1.05,
  fontWeight: 600,
};

const mobileHeroDescriptionStyle: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.45,
  color: "rgba(255,255,255,0.95)",
};

const mobileHeroCardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "10px",
};

const mobileHeroCardStyle: CSSProperties = {
  minHeight: "74px",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "14px",
  padding: "12px",
  background: "rgba(255,255,255,0.12)",
  display: "grid",
  gap: "8px",
  fontSize: "13px",
  wordBreak: "break-word",
};

const mobileStatsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
  marginBottom: "16px",
};

const mobileDashboardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "14px",
};

const mobileStoryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "10px",
};

const mobilePanelStyle: CSSProperties = {
  ...panelStyle,
  padding: "12px",
  borderRadius: "14px",
};

const mobileRegisterToolbarStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "8px",
  marginBottom: "12px",
};

const mobileRegisterListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const mobileRegisterCardStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #dbe3ef",
  borderRadius: "12px",
  background: "#ffffff",
  padding: "12px",
  textAlign: "left",
  display: "grid",
  gap: "10px",
  color: "#0f172a",
  cursor: "pointer",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
};

const mobileRegisterNumberStyle: CSSProperties = {
  display: "block",
  color: "#005670",
  fontWeight: 900,
  marginBottom: "4px",
};

const mobileRegisterTitleStyle: CSSProperties = {
  display: "block",
  fontWeight: 800,
  lineHeight: 1.35,
};

const mobileRegisterMetaStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  flexWrap: "wrap",
  color: "#475569",
  fontSize: "12px",
};

const mobileDetailPanelStyle: CSSProperties = {
  ...detailPanelStyle,
  padding: "12px",
  borderRadius: "14px",
};

const mobileTemplateGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "10px",
  marginBottom: "16px",
};

const mobileSelectedHeaderStyle: CSSProperties = {
  ...selectedHeaderStyle,
  flexDirection: "column",
  padding: "12px",
};

const mobileCompactFormStyle: CSSProperties = {
  maxHeight: "none",
  overflow: "visible",
  paddingRight: 0,
};

const mobileFormGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "10px",
};

const mobileChecklistListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const mobileChecklistCardStyle: CSSProperties = {
  border: "1px solid #dbe3ef",
  borderRadius: "12px",
  padding: "12px",
  background: "#f8fafc",
  display: "grid",
  gap: "10px",
};

const mobileChecklistItemHeaderStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "44px 1fr",
  gap: "8px",
  alignItems: "start",
  lineHeight: 1.35,
  color: "#0f172a",
};

const mobileAnswerGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "8px",
};

const mobileAnswerOptionStyle: CSSProperties = {
  minHeight: "40px",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  background: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  fontWeight: 900,
  fontSize: "13px",
};

const mobileItemUploadButtonStyle: CSSProperties = {
  ...itemUploadButtonStyle,
  margin: 0,
  minHeight: "38px",
  width: "100%",
  boxSizing: "border-box",
};
