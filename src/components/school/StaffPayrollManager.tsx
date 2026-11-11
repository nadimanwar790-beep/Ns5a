// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Briefcase,
  IndianRupee,
  FileText,
  Printer,
  Download,
  CheckCircle,
  Calendar,
  Users,
  Search,
  Filter,
  CreditCard,
  Building,
  Award
} from "lucide-react";
import { School, SchoolSession } from "../../school-types";

export interface SalaryStructure {
  employeeId: string;
  name: string;
  role: string;
  bankAccountNo?: string;
  ifscCode?: string;
  panNo?: string;
  basicSalary: number;
  da: number;       // Dearness Allowance
  hra: number;      // House Rent Allowance
  conveyance: number;
  pfDeduction: number;
  esiDeduction: number;
  advanceRecovery: number;
  presentDays: number;
  totalWorkingDays: number;
  unpaidLeaveDays: number;
  netPayable: number;
}

interface Props {
  school: School | null;
  activeSession: SchoolSession | null;
}

export const StaffPayrollManager: React.FC<Props> = ({ school, activeSession }) => {
  const schoolId = school?.id || "SCH-001";
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [selectedStaffForSlip, setSelectedStaffForSlip] = useState<SalaryStructure | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Seed sample payroll staff
  const staffPayrollList: SalaryStructure[] = useMemo(() => {
    return [
      {
        employeeId: "EMP-101",
        name: "Dr. Rajeshwar Sharma",
        role: "Principal & Senior Faculty",
        bankAccountNo: "918230918231",
        ifscCode: "SBIN0001234",
        panNo: "ABCDE1234F",
        basicSalary: 45000,
        da: 4500,
        hra: 6000,
        conveyance: 2500,
        pfDeduction: 1800,
        esiDeduction: 0,
        advanceRecovery: 0,
        presentDays: 26,
        totalWorkingDays: 26,
        unpaidLeaveDays: 0,
        netPayable: 56200
      },
      {
        employeeId: "EMP-102",
        name: "Pooja Mishra",
        role: "Senior Science Teacher",
        bankAccountNo: "501002345678",
        ifscCode: "HDFC0000456",
        panNo: "BKZPM9981A",
        basicSalary: 32000,
        da: 3200,
        hra: 4500,
        conveyance: 1800,
        pfDeduction: 1800,
        esiDeduction: 250,
        advanceRecovery: 2000,
        presentDays: 24,
        totalWorkingDays: 26,
        unpaidLeaveDays: 2,
        netPayable: 34988
      },
      {
        employeeId: "EMP-103",
        name: "Manoj Kumar",
        role: "Senior Mathematics Faculty",
        bankAccountNo: "349018234591",
        ifscCode: "PUNB0123400",
        panNo: "MNKPR4412B",
        basicSalary: 30000,
        da: 3000,
        hra: 4000,
        conveyance: 1800,
        pfDeduction: 1800,
        esiDeduction: 250,
        advanceRecovery: 0,
        presentDays: 26,
        totalWorkingDays: 26,
        unpaidLeaveDays: 0,
        netPayable: 36750
      },
      {
        employeeId: "EMP-104",
        name: "Sunil Verma",
        role: "Accountant & Cash Officer",
        bankAccountNo: "602349182736",
        ifscCode: "ICIC0001092",
        panNo: "SNLV89123C",
        basicSalary: 25000,
        da: 2500,
        hra: 3500,
        conveyance: 1500,
        pfDeduction: 1800,
        esiDeduction: 200,
        advanceRecovery: 0,
        presentDays: 25,
        totalWorkingDays: 26,
        unpaidLeaveDays: 1,
        netPayable: 29538
      },
      {
        employeeId: "EMP-105",
        name: "Rameshwar Singh",
        role: "Head Driver (Bus No. 01)",
        bankAccountNo: "102938475610",
        ifscCode: "SBIN0005678",
        panNo: "RMSH55124D",
        basicSalary: 18000,
        da: 1800,
        hra: 2000,
        conveyance: 1200,
        pfDeduction: 1500,
        esiDeduction: 150,
        advanceRecovery: 1000,
        presentDays: 26,
        totalWorkingDays: 26,
        unpaidLeaveDays: 0,
        netPayable: 20350
      }
    ];
  }, []);

  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staffPayrollList;
    const q = searchQuery.toLowerCase();
    return staffPayrollList.filter(
      (s) => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || s.employeeId.toLowerCase().includes(q)
    );
  }, [staffPayrollList, searchQuery]);

  // Overall Totals
  const payrollSummary = useMemo(() => {
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    for (const s of staffPayrollList) {
      const gross = s.basicSalary + s.da + s.hra + s.conveyance;
      const deduct = s.pfDeduction + s.esiDeduction + s.advanceRecovery;
      totalGross += gross;
      totalDeductions += deduct;
      totalNet += s.netPayable;
    }
    return { totalGross, totalDeductions, totalNet, count: staffPayrollList.length };
  }, [staffPayrollList]);

  // Export Bank NEFT Transfer CSV
  const handleExportBankCsv = () => {
    const headers = "Beneficiary Name,Account Number,IFSC Code,Amount (INR),Narration\n";
    const rows = staffPayrollList
      .map(
        (s) =>
          `"${s.name}","${s.bankAccountNo || ""}","${s.ifscCode || ""}","${s.netPayable}","Salary for ${selectedMonth}"`
      )
      .join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + rows);
    const link = document.createElement("a");
    link.href = csvContent;
    link.download = `NSTA_Salary_Bank_Transfer_${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center shrink-0 shadow-lg">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              हाजिरी आधारित ऑटो-स्टाफ पेरोल व सैलरी स्लिप (Payroll Desk)
            </h2>
            <p className="text-xs text-slate-400">
              बायोमेट्रिक हाजिरी, PF/ESI कटौती, 3-पार्ट सैलरी स्लिप PDF, व बैंक NEFT लिस्ट
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-bold"
          />
          <button
            onClick={handleExportBankCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            बैंक NEFT CSV
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center gap-1.5 shadow"
          >
            <Printer className="w-3.5 h-3.5" />
            मासिक पे-शीट प्रिंट
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="text-xs text-slate-400 font-bold mb-1">कुल सकल वेतन (Total Gross):</div>
          <div className="text-2xl font-black text-white">₹{payrollSummary.totalGross.toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-slate-500 mt-1">कुल {payrollSummary.count} शिक्षक व स्टाफ सदस्य</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-rose-500/30">
          <div className="text-xs text-rose-400 font-bold mb-1">कुल कटौतियां (PF, ESI, Advance):</div>
          <div className="text-2xl font-black text-rose-400">₹{payrollSummary.totalDeductions.toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-slate-500 mt-1">सरकारी व एडवांस रिकवरी</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-teal-950 via-slate-900 to-slate-900 border border-teal-500/40 shadow-lg">
          <div className="text-xs text-teal-300 font-bold mb-1">कुल देय इन-हैंड वेतन (Net Disbursed):</div>
          <div className="text-2xl font-black text-teal-300">₹{payrollSummary.totalNet.toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-teal-200/70 mt-1">बैंक में ट्रांसफर करने योग्य शुद्ध राशि</div>
        </div>
      </div>

      {/* Staff Payroll Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-400" />
            मासिक वेतन रजिस्टर ({selectedMonth})
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="स्टाफ नाम या आईडी खोजें..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">आईडी व कर्मचारी</th>
                <th className="px-4 py-3">पद (Designation)</th>
                <th className="px-4 py-3 text-center">उपस्थिति (Att.)</th>
                <th className="px-4 py-3 text-right">मूल वेतन (Basic)</th>
                <th className="px-4 py-3 text-right">भत्ते (Allowances)</th>
                <th className="px-4 py-3 text-right">कटौती (Deductions)</th>
                <th className="px-4 py-3 text-right">शुद्ध वेतन (Net)</th>
                <th className="px-4 py-3 text-center">सैलरी स्लिप</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStaff.map((staff) => {
                const totalAllowances = staff.da + staff.hra + staff.conveyance;
                const totalDeductions = staff.pfDeduction + staff.esiDeduction + staff.advanceRecovery;
                return (
                  <tr key={staff.employeeId} className="hover:bg-slate-850/60 transition">
                    <td className="px-4 py-3 font-semibold text-white">
                      <div>{staff.name}</div>
                      <div className="text-[10px] text-teal-400 font-mono">{staff.employeeId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{staff.role}</td>
                    <td className="px-4 py-3 text-center font-bold">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px]">
                        {staff.presentDays}/{staff.totalWorkingDays} दिन
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">₹{staff.basicSalary.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-medium">+₹{totalAllowances.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-right text-rose-400 font-medium">-₹{totalDeductions.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-right font-black text-white text-sm">
                      ₹{staff.netPayable.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedStaffForSlip(staff)}
                        className="px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-bold flex items-center gap-1 mx-auto"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        स्लिप PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINT OFFICIAL SALARY SLIP MODAL */}
      {selectedStaffForSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl space-y-4">
            <div className="text-center border-b pb-3">
              <div className="text-[10px] font-black uppercase text-teal-700 tracking-wider">OFFICIAL SALARY SLIP / वेतन पर्ची</div>
              <h2 className="text-xl font-black text-slate-950 uppercase">{school?.name || "SCHOOL NAME"}</h2>
              <p className="text-[10px] text-slate-500 font-semibold">
                Month: <strong>{selectedMonth}</strong> • Pay Date: {new Date().toLocaleDateString("en-IN")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-2xl border">
              <div>
                <span className="text-slate-500">Employee ID:</span>
                <div className="font-bold font-mono text-slate-900">{selectedStaffForSlip.employeeId}</div>
              </div>
              <div>
                <span className="text-slate-500">Employee Name:</span>
                <div className="font-bold text-slate-900">{selectedStaffForSlip.name}</div>
              </div>
              <div>
                <span className="text-slate-500">Designation:</span>
                <div className="font-bold">{selectedStaffForSlip.role}</div>
              </div>
              <div>
                <span className="text-slate-500">Bank Account / IFSC:</span>
                <div className="font-mono text-slate-700">{selectedStaffForSlip.bankAccountNo} ({selectedStaffForSlip.ifscCode})</div>
              </div>
            </div>

            {/* Earnings vs Deductions Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Earnings */}
              <div className="border rounded-2xl p-3 space-y-1.5">
                <div className="font-black text-emerald-800 uppercase text-[10px] border-b pb-1">Earnings (आय)</div>
                <div className="flex justify-between"><span>Basic Salary:</span><span className="font-bold">₹{selectedStaffForSlip.basicSalary}</span></div>
                <div className="flex justify-between"><span>D.A.:</span><span>₹{selectedStaffForSlip.da}</span></div>
                <div className="flex justify-between"><span>H.R.A.:</span><span>₹{selectedStaffForSlip.hra}</span></div>
                <div className="flex justify-between"><span>Conveyance:</span><span>₹{selectedStaffForSlip.conveyance}</span></div>
                <div className="flex justify-between border-t pt-1 font-bold text-slate-900">
                  <span>Gross Earnings:</span>
                  <span>₹{(selectedStaffForSlip.basicSalary + selectedStaffForSlip.da + selectedStaffForSlip.hra + selectedStaffForSlip.conveyance)}</span>
                </div>
              </div>

              {/* Deductions */}
              <div className="border rounded-2xl p-3 space-y-1.5">
                <div className="font-black text-rose-800 uppercase text-[10px] border-b pb-1">Deductions (कटौती)</div>
                <div className="flex justify-between"><span>Provident Fund (PF):</span><span className="text-rose-600">₹{selectedStaffForSlip.pfDeduction}</span></div>
                <div className="flex justify-between"><span>ESI:</span><span className="text-rose-600">₹{selectedStaffForSlip.esiDeduction}</span></div>
                <div className="flex justify-between"><span>Salary Advance:</span><span className="text-rose-600">₹{selectedStaffForSlip.advanceRecovery}</span></div>
                <div className="flex justify-between"><span>Unpaid Absents:</span><span className="text-slate-500">{selectedStaffForSlip.unpaidLeaveDays} Days</span></div>
                <div className="flex justify-between border-t pt-1 font-bold text-slate-900">
                  <span>Total Deductions:</span>
                  <span className="text-rose-700">₹{(selectedStaffForSlip.pfDeduction + selectedStaffForSlip.esiDeduction + selectedStaffForSlip.advanceRecovery)}</span>
                </div>
              </div>
            </div>

            {/* Net Amount Banner */}
            <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 flex justify-between items-center text-teal-950">
              <span className="font-bold text-xs uppercase">Net Payable Amount (शुद्ध देय राशि):</span>
              <span className="text-2xl font-black">₹{selectedStaffForSlip.netPayable.toLocaleString("en-IN")}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 text-center text-[10px] text-slate-500 border-t">
              <div>
                <div className="border-t border-slate-300 pt-1">Employee Signature</div>
              </div>
              <div>
                <div className="border-t border-slate-300 pt-1">Authorized Principal / Treasurer</div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                सैलरी स्लिप प्रिंट करें (Print)
              </button>
              <button
                onClick={() => setSelectedStaffForSlip(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-800 font-bold text-xs"
              >
                बंद करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
