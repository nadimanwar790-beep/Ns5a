import type { School } from "../school-types";

export type TeacherRuleCategory =
  | "payroll"
  | "attendance"
  | "conduct"
  | "welfare"
  | "documents";

export interface TeacherRuleItem {
  id: string;
  order: number;
  title: string;
  description: string;
  highlight?: string;
  category: TeacherRuleCategory;
  icon: string;
  enabled: boolean;
}

export interface TeacherPayrollPolicyConfig {
  fullMonthBonusDays: number;
  maxFreeLeaveBeforeNoLeave: number;
  lateCutoffDays: number;
  lateTriggerMode: "more_than" | "every_n";
  dressCodeCutoffDays: number;
  salaryPayWindow: string;
  noticePeriodMonths: number;
  enableAttendanceBonus: boolean;
  enableLatePenalty: boolean;
  enableDressCodePenalty: boolean;
}

export interface SchoolTeacherRulesConfig {
  schoolId: string;
  trustLine: string;
  tagline: string;
  headerSubtitle: string;
  requireGuardianSignature: boolean;
  rules: TeacherRuleItem[];
  policy: TeacherPayrollPolicyConfig;
  updatedAt: string;
  updatedBy?: string;
}

export interface TeacherRuleAcceptance {
  schoolId: string;
  staffId: string;
  staffName: string;
  role?: string;
  acceptedAt: string;
  rulesVersion: string;
}

export interface StaffMonthlyPolicyAdjustments {
  lateDays: number;
  dressViolationDays: number;
  lateEmergencyExcused?: boolean;
  bonusWaived?: boolean;
  updatedAt?: string;
}

export const OFFICIAL_LIFE_MAKER_RULES_POSTER_URL =
  "/assets/aistudio/IMG-20261115-WA0004_d6deea08.jpg";

export const DEFAULT_TEACHER_PAYROLL_POLICY: TeacherPayrollPolicyConfig = {
  fullMonthBonusDays: 2,
  maxFreeLeaveBeforeNoLeave: 2,
  lateCutoffDays: 3,
  lateTriggerMode: "more_than",
  dressCodeCutoffDays: 3,
  salaryPayWindow: "15th–20th of next month",
  noticePeriodMonths: 2,
  enableAttendanceBonus: true,
  enableLatePenalty: true,
  enableDressCodePenalty: true,
};

export const LIFE_MAKER_DEFAULT_TEACHER_RULES: TeacherRuleItem[] = [
  {
    id: "rule_1",
    order: 1,
    title: "Full-Month Attendance Bonus (+2 Days)",
    description:
      "If you teach whole days in a month, you will get 2 days bonus payment in that particular month.",
    highlight: "+2 Days Bonus Pay",
    category: "payroll",
    icon: "🎁",
    enabled: true,
  },
  {
    id: "rule_2",
    order: 2,
    title: "Leave Disqualifies Monthly Bonus",
    description:
      "If you take leave for even one day in a month, you will not get any attendance bonus for that month.",
    highlight: "0 Leave = Bonus",
    category: "payroll",
    icon: "🚫",
    enabled: true,
  },
  {
    id: "rule_3",
    order: 3,
    title: "Maximum Absence Limit (>2 Days)",
    description:
      "If you remain absent for more than 2 days in a particular month, you will not be granted any leave allowance.",
    highlight: ">2 Absent = No Leave",
    category: "attendance",
    icon: "📅",
    enabled: true,
  },
  {
    id: "rule_4",
    order: 4,
    title: "Punctuality & Late Arrival Cut (>3 Days)",
    description:
      "You should be punctual as per school arrival time and departure time. If you become late more than 3 days, 1 day salary will be deducted. (Emergency cases will be considered by School Management or Principal.)",
    highlight: ">3 Late = 1 Day Cut",
    category: "attendance",
    icon: "⏰",
    enabled: true,
  },
  {
    id: "rule_5",
    order: 5,
    title: "Staff Child Fee Concession",
    description:
      "If your child studies in our school, Tuition Fee for one child is 100% free. If you have more than one child, you pay 50% tuition for the other child and receive a 50% discount on other charges.",
    highlight: "1st Child Tuition Free",
    category: "welfare",
    icon: "👨‍👧‍👦",
    enabled: true,
  },
  {
    id: "rule_6",
    order: 6,
    title: "Code of Conduct & Discipline",
    description:
      "If you do any unwanted activity inside or outside the school, you will be responsible for it. School Management has full authority to replace you and withhold back-dues salary.",
    highlight: "Strict Conduct",
    category: "conduct",
    icon: "⚠️",
    enabled: true,
  },
  {
    id: "rule_7",
    order: 7,
    title: "Mandatory School Dress Code (3 Days Cut)",
    description:
      "You must follow the school dress code. If you do not wear school dress and wear other dress for 3 days in a particular month, your 1 day salary will be deducted.",
    highlight: "3 Days Non-Dress = 1 Day Cut",
    category: "conduct",
    icon: "👔",
    enabled: true,
  },
  {
    id: "rule_8",
    order: 8,
    title: "2-Month Advance Resignation Notice",
    description:
      "If you want to leave the school, you must submit an application 2 months in advance. Otherwise, Management has the authority to withhold your back-dues salary.",
    highlight: "2 Months Notice",
    category: "conduct",
    icon: "📝",
    enabled: true,
  },
  {
    id: "rule_9",
    order: 9,
    title: "Secular & Inclusive Mindset",
    description:
      "Every teacher and staff member must maintain a secular, respectful mindset and never engage in communal behaviour.",
    highlight: "Secular Values",
    category: "conduct",
    icon: "🤝",
    enabled: true,
  },
  {
    id: "rule_10",
    order: 10,
    title: "Monthly Salary Disbursement Window",
    description:
      "Your monthly salary will be provided between the 15th and 20th of the next month.",
    highlight: "15th–20th Next Month",
    category: "payroll",
    icon: "💰",
    enabled: true,
  },
  {
    id: "rule_11",
    order: 11,
    title: "No Mobile Phone in Classroom",
    description:
      "You are not allowed to use a mobile phone in the class. You must deposit your mobile phone in the Account Office and may take or use it only after class periods.",
    highlight: "Deposit in Account Office",
    category: "conduct",
    icon: "📵",
    enabled: true,
  },
  {
    id: "rule_12",
    order: 12,
    title: "Mandatory Document Verification",
    description:
      "You must submit all educational documents (from Matriculation to Higher Degree) along with your teaching experience certificate.",
    highlight: "All Docs & Experience",
    category: "documents",
    icon: "📂",
    enabled: true,
  },
  {
    id: "rule_13",
    order: 13,
    title: "Zero Physical Punishment Policy",
    description:
      "You cannot give any physical punishment to any student. If you face difficulty in handling students, report the issue directly to the Principal or School Management.",
    highlight: "No Physical Punishment",
    category: "conduct",
    icon: "🛡️",
    enabled: true,
  },
];

export const isLifeMakerSchool = (school?: School | null): boolean => {
  const name = (school?.name || "").toLowerCase();
  return name.includes("life maker") || name.includes("lifemaker");
};

export const getDefaultTeacherRulesConfig = (
  schoolId: string,
  school?: School | null
): SchoolTeacherRulesConfig => ({
  schoolId,
  trustLine: isLifeMakerSchool(school)
    ? "Ummid Educational & Welfare Trust"
    : "",
  tagline: "Together for a Better Tomorrow...",
  headerSubtitle: "Rules & Regulations for Teachers & Faculty",
  requireGuardianSignature: true,
  rules: LIFE_MAKER_DEFAULT_TEACHER_RULES.map((r) => ({ ...r })),
  policy: { ...DEFAULT_TEACHER_PAYROLL_POLICY },
  updatedAt: new Date().toISOString(),
});

export interface ComputedRulePayrollResult {
  bonusEligible: boolean;
  bonusDays: number;
  bonusAmount: number;
  lateDays: number;
  latePenaltyDays: number;
  latePenaltyAmount: number;
  dressViolationDays: number;
  dressPenaltyDays: number;
  dressPenaltyAmount: number;
  exceededNoLeaveLimit: boolean;
  totalRuleDeduction: number;
  badges: string[];
}

export const computeTeacherRulePayrollAdjustment = (params: {
  presentDays: number;
  explicitAbsentDays: number;
  approvedLeaveDays: number;
  unpaidLeaveDays: number;
  perDayRate: number;
  adjustments?: StaffMonthlyPolicyAdjustments;
  policy?: TeacherPayrollPolicyConfig;
}): ComputedRulePayrollResult => {
  const policy = { ...DEFAULT_TEACHER_PAYROLL_POLICY, ...(params.policy || {}) };
  const adj = params.adjustments || { lateDays: 0, dressViolationDays: 0 };
  const perDayRate = Math.max(0, Number(params.perDayRate) || 0);
  const lateDays = Math.max(0, Number(adj.lateDays) || 0);
  const dressViolationDays = Math.max(0, Number(adj.dressViolationDays) || 0);

  // Rule 1 & 2: Whole month attendance (no absent or leave, and > 0 days present) => +2 days bonus
  const bonusEligible =
    Boolean(policy.enableAttendanceBonus) &&
    !adj.bonusWaived &&
    params.presentDays > 0 &&
    params.explicitAbsentDays === 0 &&
    params.approvedLeaveDays === 0 &&
    perDayRate > 0;

  const bonusDays = bonusEligible ? Math.max(0, Number(policy.fullMonthBonusDays) || 0) : 0;
  const bonusAmount = bonusDays > 0 ? Math.round(bonusDays * perDayRate) : 0;

  // Rule 3: Absent > 2 days => no leave allowance
  const exceededNoLeaveLimit = params.unpaidLeaveDays > (policy.maxFreeLeaveBeforeNoLeave ?? 2);

  // Rule 4: Late > 3 days => 1 day salary cut (unless excused for emergency)
  let latePenaltyDays = 0;
  if (policy.enableLatePenalty && !adj.lateEmergencyExcused && lateDays > 0) {
    const cutoff = Math.max(1, Number(policy.lateCutoffDays) || 3);
    if (policy.lateTriggerMode === "every_n") {
      latePenaltyDays = Math.floor(lateDays / cutoff);
    } else {
      latePenaltyDays = lateDays > cutoff ? 1 : 0;
    }
  }
  const latePenaltyAmount = latePenaltyDays > 0 ? Math.round(latePenaltyDays * perDayRate) : 0;

  // Rule 7: Non-school dress 3 days in month => 1 day salary cut
  let dressPenaltyDays = 0;
  if (policy.enableDressCodePenalty && dressViolationDays > 0) {
    const dressCut = Math.max(1, Number(policy.dressCodeCutoffDays) || 3);
    dressPenaltyDays = Math.floor(dressViolationDays / dressCut);
  }
  const dressPenaltyAmount = dressPenaltyDays > 0 ? Math.round(dressPenaltyDays * perDayRate) : 0;

  const totalRuleDeduction = latePenaltyAmount + dressPenaltyAmount;

  const badges: string[] = [];
  if (bonusDays > 0) badges.push(`+${bonusDays}d Full-Month Bonus`);
  if (exceededNoLeaveLimit) badges.push(`>${policy.maxFreeLeaveBeforeNoLeave}d Absent (No Leave)`);
  if (latePenaltyDays > 0) badges.push(`Late ${lateDays}d (-${latePenaltyDays}d Cut)`);
  else if (lateDays > 0 && adj.lateEmergencyExcused) badges.push(`Late ${lateDays}d (Emergency Excused)`);
  if (dressPenaltyDays > 0) badges.push(`Dress ${dressViolationDays}d (-${dressPenaltyDays}d Cut)`);

  return {
    bonusEligible,
    bonusDays,
    bonusAmount,
    lateDays,
    latePenaltyDays,
    latePenaltyAmount,
    dressViolationDays,
    dressPenaltyDays,
    dressPenaltyAmount,
    exceededNoLeaveLimit,
    totalRuleDeduction,
    badges,
  };
};
