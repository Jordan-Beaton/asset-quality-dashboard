import assert from "node:assert/strict";
import { buildExtractionDiagnostics, detectTableRoles, emptyExtractionMapping, isExcludedAuthorityHeading } from "../src/lib/noiExtractionRules";

const baltic = [
  ["Task #", "Activity Description", "Responsible Party", "Controlling Document/Standard", "Acceptance Criteria", "ENS Surveillance", "Employer Surveillance", "MWS"],
  ["1.0", "Burial Assessment Study Submission", "Equipment Engineer", "BLP-TECH-SPEC", "Approved by Employer", "A", "H", "R"],
  ["2.0", "Trial Procedure & Acceptance Scheme Submission", "Lead Project Engineer", "BLP-TECH-SPEC", "Approved by Employer", "A", "H", "R"],
  ["3.0", "Pre-Trial Equipment Inspection & Certification", "Equipment Superintendent", "Equipment Specifications", "Certified fit for purpose", "M", "W", "W"],
];

const balticRoles = detectTableRoles(baltic, "Enshore Subsea Limited", emptyExtractionMapping());
assert.ok(balticRoles, "Baltic table roles should be detected");
assert.deepEqual(balticRoles.authorityColumns, [{ column: 6, heading: "Employer Surveillance" }]);
assert.equal(balticRoles.identifierColumn?.heading, "Task #");
assert.equal(balticRoles.activityColumn?.heading, "Activity Description");
assert.equal(isExcludedAuthorityHeading("MWS", "Enshore Subsea Limited"), true);

const diagnostics = buildExtractionDiagnostics([baltic], "Enshore Subsea Limited", emptyExtractionMapping());
assert.deepEqual(diagnostics.targetAuthorityHeadings, ["Employer Surveillance"]);
assert.ok(diagnostics.excludedAuthorityHeadings.includes("MWS"));
assert.ok(diagnostics.identifierHeadings.includes("Task #"));

const unfamiliar = [["Work Ref", "Operation Narrative", "Principal Inspection", "Vendor"], ["A-1", "Load test", "W", "H"]];
const custom = { authorityHeadings: ["Principal Inspection"], identifierHeadings: ["Work Ref"], activityHeadings: ["Operation Narrative"] };
const customRoles = detectTableRoles(unfamiliar, "Example Vendor", custom);
assert.equal(customRoles?.authorityColumns[0]?.heading, "Principal Inspection");
assert.equal(customRoles?.identifierColumn?.heading, "Work Ref");
assert.equal(customRoles?.activityColumn?.heading, "Operation Narrative");

console.log("NOI extraction rule regression checks passed.");
