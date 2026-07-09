/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import { 
  BarChart3, 
  CheckCircle2, 
  ClipboardList, 
  TrendingUp, 
  Users, 
  Clock, 
  AlertTriangle,
  Award,
  Layers,
  Sparkles,
  Zap
} from "lucide-react";
import { Task, User, TaskStatus, TaskType, TaskPriority } from "../types";

interface AnnualStatsProps {
  tasks: Task[];
  users: User[];
  selectedYear: number;
  onSelectYear: (year: number) => void;
}

export default function AnnualStats({ tasks, users, selectedYear, onSelectYear }: AnnualStatsProps) {
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const taskYears = tasks.map(t => t.startDate ? new Date(t.startDate).getFullYear() : null).filter(Boolean) as number[];
    const minYear = taskYears.length > 0 ? Math.min(...taskYears) : 2026;
    const startYear = Math.min(minYear, 2026);
    const endYear = Math.max(startYear, currentYear + 1);
    const result: number[] = [];
    for (let y = startYear; y <= endYear; y++) {
      result.push(y);
    }
    return result;
  }, [tasks]);

  const members = useMemo(() => users.filter(u => u.role === "member"), [users]);

  // 1. Calculate overall multi-year metrics
  const annualComparisons = useMemo(() => {
    return years.map(y => {
      const yearTasks = tasks.filter(t => t.startDate && t.startDate.startsWith(y.toString()));
      const total = yearTasks.length;
      const completed = yearTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
      const inProgress = yearTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
      const notStarted = yearTasks.filter(t => t.status === TaskStatus.NOT_STARTED).length;
      const paused = yearTasks.filter(t => t.status === TaskStatus.PAUSED).length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      // Average progress of all tasks in that year
      const avgProgress = total > 0 
        ? Math.round(yearTasks.reduce((sum, t) => sum + t.progress, 0) / total) 
        : 0;

      return { year: y, total, completed, inProgress, notStarted, paused, rate, avgProgress };
    });
  }, [tasks, years]);

  // 2. Metrics for the currently selected year
  const selectedYearTasks = useMemo(() => {
    return tasks.filter(t => t.startDate && t.startDate.startsWith(selectedYear.toString()));
  }, [tasks, selectedYear]);

  const selectedYearMetrics = useMemo(() => {
    const total = selectedYearTasks.length;
    const completed = selectedYearTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const inProgress = selectedYearTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const notStarted = selectedYearTasks.filter(t => t.status === TaskStatus.NOT_STARTED).length;
    const paused = selectedYearTasks.filter(t => t.status === TaskStatus.PAUSED).length;
    
    // Task type distribution
    const typeCounts = {
      [TaskType.REGULAR]: selectedYearTasks.filter(t => t.type === TaskType.REGULAR).length,
      [TaskType.LONG_TERM]: selectedYearTasks.filter(t => t.type === TaskType.LONG_TERM).length,
      [TaskType.INCIDENTAL]: selectedYearTasks.filter(t => t.type === TaskType.INCIDENTAL).length,
    };

    // Priority distribution
    const priorityCounts = {
      [TaskPriority.HIGH]: selectedYearTasks.filter(t => t.priority === TaskPriority.HIGH).length,
      [TaskPriority.MEDIUM]: selectedYearTasks.filter(t => t.priority === TaskPriority.MEDIUM).length,
      [TaskPriority.LOW]: selectedYearTasks.filter(t => t.priority === TaskPriority.LOW).length,
    };

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      notStarted,
      paused,
      typeCounts,
      priorityCounts,
      completionRate
    };
  }, [selectedYearTasks]);

  // 3. Member contributions for the selected year
  const memberContributions = useMemo(() => {
    return members.map(member => {
      const assignedTasks = selectedYearTasks.filter(t => t.assignedTo.includes(member.id));
      const total = assignedTasks.length;
      const completed = assignedTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
      const inProgress = assignedTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      const avgProgress = total > 0 
        ? Math.round(assignedTasks.reduce((sum, t) => sum + t.progress, 0) / total) 
        : 0;

      return {
        member,
        total,
        completed,
        inProgress,
        rate,
        avgProgress
      };
    }).sort((a, b) => b.rate - a.rate || b.total - a.total); // Sort by completion rate then total tasks
  }, [members, selectedYearTasks]);

  // Find the top contributor (star of the year)
  const starContributor = useMemo(() => {
    const candidates = memberContributions.filter(m => m.total > 0);
    if (candidates.length === 0) return null;
    // Prioritize high average progress, then completed count
    return [...candidates].sort((a, b) => b.avgProgress - a.avgProgress || b.completed - a.completed)[0];
  }, [memberContributions]);

  // Dynamic SVG Chart calculations
  const maxTasksCount = useMemo(() => {
    const maxVal = Math.max(...annualComparisons.map(c => c.total), 4);
    return Math.ceil(maxVal / 2) * 2; // round to even number for nice ticks
  }, [annualComparisons]);

  const chartHeight = 160;
  const chartWidth = 460;

  return (
    <div className="space-y-6">
      
      {/* TWO COLUMN ROW: MULTI-YEAR COMPARISON & SELECTED YEAR OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT CARD: MULTI-YEAR COMPARISON CHART */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
              <div>
                <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">So Sánh Nhiệm Vụ Giữa Các Năm</h4>
                <p className="text-[11px] text-gray-500">Biểu đồ đối chiếu số lượng nhiệm vụ được giao và hoàn thành</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100/30">
                Toàn thời gian
              </span>
            </div>

            {/* SVG MULTI-BAR CHART */}
            <div className="relative pt-6 px-2">
              <svg viewBox={`0 0 ${chartWidth} 200`} className="w-full h-48 overflow-visible">
                {/* Y-axis Ticks & Grid Lines */}
                {[0, 0.5, 1].map((ratio, index) => {
                  const yVal = 20 + ratio * chartHeight;
                  const labelVal = Math.round(maxTasksCount * (1 - ratio));
                  return (
                    <g key={index} className="opacity-40">
                      <line 
                        x1="40" 
                        y1={yVal} 
                        x2={chartWidth} 
                        y2={yVal} 
                        stroke="currentColor" 
                        strokeWidth="1" 
                        strokeDasharray="4 4" 
                        className="text-gray-200 dark:text-gray-800"
                      />
                      <text 
                        x="30" 
                        y={yVal + 4} 
                        className="text-[9px] font-bold fill-gray-400 dark:fill-gray-500 text-right"
                        textAnchor="end"
                      >
                        {labelVal}
                      </text>
                    </g>
                  );
                })}

                {/* Bars rendering */}
                {annualComparisons.map((c, i) => {
                  const N = years.length;
                  const xBase = N <= 1 
                    ? chartWidth / 2 - 25
                    : 60 + i * ((chartWidth - 140) / (N - 1));
                  
                  // Heights proportional to maxTasksCount
                  const totalHeight = (c.total / maxTasksCount) * chartHeight;
                  const completedHeight = (c.completed / maxTasksCount) * chartHeight;
                  
                  // Y coordinates (SVG 0 is at top)
                  const totalY = 20 + chartHeight - totalHeight;
                  const completedY = 20 + chartHeight - completedHeight;

                  const isCurrent = c.year === selectedYear;

                  return (
                    <g key={c.year} className="group cursor-pointer" onClick={() => onSelectYear(c.year)}>
                      {/* Active Background Glow on hover/selection */}
                      <rect
                        x={xBase - 15}
                        y="10"
                        width="80"
                        height={chartHeight + 25}
                        rx="8"
                        fill="transparent"
                        className={`transition-colors ${
                          isCurrent 
                            ? "fill-indigo-50/20 dark:fill-indigo-950/5 stroke-indigo-100 dark:stroke-indigo-900/30 stroke-1" 
                            : "hover:fill-gray-50/50 dark:hover:fill-gray-800/20"
                        }`}
                      />

                      {/* Total tasks bar (Indigo/Blueish) */}
                      <rect
                        x={xBase}
                        y={totalY}
                        width="22"
                        height={Math.max(totalHeight, 1)}
                        rx="4"
                        className={`transition-all duration-300 ${
                          isCurrent ? "fill-indigo-600" : "fill-indigo-300 dark:fill-indigo-700/60"
                        }`}
                      />

                      {/* Completed tasks bar (Emerald) */}
                      <rect
                        x={xBase + 28}
                        y={completedY}
                        width="22"
                        height={Math.max(completedHeight, 1)}
                        rx="4"
                        className={`transition-all duration-300 ${
                          isCurrent ? "fill-emerald-500" : "fill-emerald-400/60 dark:fill-emerald-600/40"
                        }`}
                      />

                      {/* Tooltip text showing values on top of bars */}
                      <text
                        x={xBase + 25}
                        y={Math.min(totalY, completedY) - 6}
                        textAnchor="middle"
                        className="text-[9px] font-black fill-indigo-600 dark:fill-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {c.completed}/{c.total}
                      </text>

                      {/* X-axis labels */}
                      <text
                        x={xBase + 25}
                        y={20 + chartHeight + 16}
                        textAnchor="middle"
                        className={`text-[10px] font-black transition-colors ${
                          isCurrent 
                            ? "fill-indigo-600 dark:fill-indigo-400 font-extrabold" 
                            : "fill-gray-400 dark:fill-gray-500"
                        }`}
                      >
                        {c.year}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Chart Legends & Insights */}
          <div className="flex flex-wrap items-center justify-between border-t border-gray-100 dark:border-gray-800/80 pt-4 mt-4 text-[11px] text-gray-500">
            <div className="flex space-x-4">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 bg-indigo-500 rounded-md shrink-0"></span>
                <span>Nhiệm vụ được giao</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 bg-emerald-500 rounded-md shrink-0"></span>
                <span>Nhiệm vụ hoàn thành</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-1.5 font-bold text-gray-700 dark:text-gray-300">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              <span>Năm hiệu suất cao nhất: 2024 (100%)</span>
            </div>
          </div>
        </div>

        {/* RIGHT CARD: CHOSEN YEAR DETAILED STATS */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm lg:col-span-5 flex flex-col justify-between">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
            <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">
              Chỉ Số Hiệu Suất Năm {selectedYear}
            </h4>
            <p className="text-[11px] text-gray-500">Đánh giá tổng quan KPI hoàn thành công việc của năm</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
            {/* KPI Progress Circle Ring */}
            <div className="relative w-32 h-32 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-gray-100 dark:text-gray-800"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke={selectedYearMetrics.completionRate === 100 ? "#10b981" : "#6366f1"}
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - selectedYearMetrics.completionRate / 100)}`}
                  className="transition-all duration-500 stroke-round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-gray-800 dark:text-white">
                  {selectedYearMetrics.completionRate}%
                </span>
                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-extrabold uppercase tracking-widest">
                  Tỷ lệ KPI
                </span>
              </div>
            </div>

            {/* Quick Metrics Listing */}
            <div className="space-y-2.5 w-full sm:w-auto flex-1 max-w-xs">
              <div className="p-2 bg-gray-55/60 dark:bg-gray-800/40 rounded-xl border border-gray-150 dark:border-gray-800/60 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <ClipboardList className="w-4 h-4 text-indigo-500" />
                  <span className="font-semibold text-gray-600 dark:text-gray-400">Tổng công việc:</span>
                </div>
                <span className="font-bold text-gray-950 dark:text-white">{selectedYearMetrics.total}</span>
              </div>

              <div className="p-2 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl border border-emerald-500/10 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Đã hoàn thành:</span>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedYearMetrics.completed}</span>
              </div>

              <div className="p-2 bg-blue-500/5 dark:bg-blue-500/10 rounded-xl border border-blue-500/10 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-blue-600 dark:text-blue-400">Đang triển khai:</span>
                </div>
                <span className="font-bold text-blue-600 dark:text-blue-400">{selectedYearMetrics.inProgress}</span>
              </div>

              {selectedYearMetrics.paused > 0 && (
                <div className="p-2 bg-amber-500/5 dark:bg-amber-500/10 rounded-xl border border-amber-500/10 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-amber-600 dark:text-amber-400">Tạm dừng:</span>
                  </div>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{selectedYearMetrics.paused}</span>
                </div>
              )}
            </div>
          </div>

          {selectedYearMetrics.total === 0 && (
            <div className="text-center py-2 text-xs text-rose-500 font-semibold bg-rose-500/5 rounded-lg border border-rose-500/10">
              Không có dữ liệu nhiệm vụ cho năm {selectedYear}. Hãy tạo mới công việc.
            </div>
          )}
        </div>
      </div>

      {/* THREE COLUMN GRID: CORE STATS SUBSECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        
        {/* COL 1: TASK TYPE BREAKDOWN (BENTO GRID STYLE) */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm md:col-span-1 lg:col-span-4 space-y-4">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-2.5">
            <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Phân Loại Nhiệm Vụ ({selectedYear})</span>
            </h4>
          </div>

          <div className="space-y-3.5">
            {[
              { type: TaskType.REGULAR, label: "Thường xuyên", count: selectedYearMetrics.typeCounts[TaskType.REGULAR], color: "bg-emerald-500" },
              { type: TaskType.LONG_TERM, label: "Lâu dài", count: selectedYearMetrics.typeCounts[TaskType.LONG_TERM], color: "bg-indigo-500" },
              { type: TaskType.INCIDENTAL, label: "Đột xuất", count: selectedYearMetrics.typeCounts[TaskType.INCIDENTAL], color: "bg-amber-500" }
            ].map(t => {
              const pct = selectedYearMetrics.total > 0 ? Math.round((t.count / selectedYearMetrics.total) * 100) : 0;
              return (
                <div key={t.type} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-700 dark:text-gray-300">{t.label}</span>
                    <span className="font-black text-gray-950 dark:text-white">{t.count} <span className="text-gray-400 text-[10px] font-normal">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden border border-gray-200/40 dark:border-gray-700/40">
                    <div className={`h-full rounded-full ${t.color}`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COL 2: TASK PRIORITY DISTRIBUTION */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm md:col-span-1 lg:col-span-4 space-y-4">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-2.5">
            <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-2">
              <Zap className="w-4 h-4 text-rose-500" />
              <span>Phân Phối Mức Độ Ưu Tiên ({selectedYear})</span>
            </h4>
          </div>

          <div className="space-y-3.5">
            {[
              { priority: TaskPriority.HIGH, label: "Cao", count: selectedYearMetrics.priorityCounts[TaskPriority.HIGH], color: "bg-red-500" },
              { priority: TaskPriority.MEDIUM, label: "Trung bình", count: selectedYearMetrics.priorityCounts[TaskPriority.MEDIUM], color: "bg-blue-500" },
              { priority: TaskPriority.LOW, label: "Thấp", count: selectedYearMetrics.priorityCounts[TaskPriority.LOW], color: "bg-gray-400" }
            ].map(p => {
              const pct = selectedYearMetrics.total > 0 ? Math.round((p.count / selectedYearMetrics.total) * 100) : 0;
              return (
                <div key={p.priority} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-700 dark:text-gray-300">{p.label}</span>
                    <span className="font-black text-gray-950 dark:text-white">{p.count} <span className="text-gray-400 text-[10px] font-normal">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden border border-gray-200/40 dark:border-gray-700/40">
                    <div className={`h-full rounded-full ${p.color}`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COL 3: ANCHOR AWARD: STAR OF THE YEAR */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl border border-indigo-950 shadow-md md:col-span-2 lg:col-span-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 transform translate-x-6 -translate-y-6 opacity-10">
            <Award className="w-36 h-36" />
          </div>
          
          <div className="space-y-2 relative z-10">
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20 text-indigo-200 border border-white/10">
              <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
              <span>Gương Mặt Tiêu Biểu ({selectedYear})</span>
            </span>
            <h4 className="text-base font-black tracking-tight">Chiến Binh Xuất Sắc Nhất</h4>
            <p className="text-xs text-indigo-200/80 leading-relaxed">
              Thành viên hoàn thành nhiều nhiệm vụ và đạt hiệu suất tiến độ trung bình cao nhất trong năm.
            </p>
          </div>

          <div className="pt-4 mt-2 relative z-10 flex items-center space-x-3 border-t border-white/10">
            {starContributor ? (
              <>
                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base shadow-inner shrink-0 ${starContributor.member.avatarColor || "bg-indigo-600 text-white"}`}>
                  {starContributor.member.name.charAt(0)}
                </div>
                <div className="text-xs">
                  <p className="font-extrabold text-white text-sm">{starContributor.member.name}</p>
                  <p className="text-indigo-200/90 font-semibold mt-0.5">
                    Đã hoàn thành <span className="font-black text-emerald-400">{starContributor.completed}</span> / {starContributor.total} nhiệm vụ
                  </p>
                  <p className="text-indigo-300 text-[10px] font-bold mt-0.5">
                    Hiệu suất trung bình: <span className="text-white font-black">{starContributor.avgProgress}%</span>
                  </p>
                </div>
              </>
            ) : (
              <p className="text-xs text-indigo-300 italic py-2">Chưa có đủ dữ liệu đóng góp trong năm này.</p>
            )}
          </div>
        </div>

      </div>

      {/* MEMBER PERFORMANCE MATRIX (DETAILED BOARD) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-55/60 dark:bg-gray-800/20 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h4 className="font-extrabold text-sm text-gray-950 dark:text-white">
              Bảng Đóng Góp Chi Tiết Của Các Thành Viên ({selectedYear})
            </h4>
          </div>
          <span className="text-[11px] font-bold text-gray-400">Sắp xếp theo tỷ lệ hoàn thành KPI</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 text-[10px] text-gray-400 uppercase tracking-wider font-extrabold">
                <th className="py-3 px-4">Thành viên</th>
                <th className="py-3 px-4 text-center">Nhiệm vụ được giao</th>
                <th className="py-3 px-4 text-center">Đã hoàn thành</th>
                <th className="py-3 px-4 text-center">Đang thực hiện</th>
                <th className="py-3 px-4">Tiến trình hoàn thành trung bình</th>
                <th className="py-3 px-4 text-right">Tỷ lệ hoàn thành KPI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-gray-800">
              {memberContributions.map((row) => (
                <tr key={row.member.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="py-3 px-4 flex items-center space-x-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${row.member.avatarColor || "bg-indigo-600 text-white"}`}>
                      {row.member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white">{row.member.name}</p>
                      <p className="text-[10px] text-gray-400">@{row.member.username}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-gray-700 dark:text-gray-300">{row.total}</td>
                  <td className="py-3 px-4 text-center font-extrabold text-emerald-600 dark:text-emerald-400">{row.completed}</td>
                  <td className="py-3 px-4 text-center font-bold text-blue-600 dark:text-blue-400">{row.inProgress}</td>
                  <td className="py-3 px-4">
                    <div className="space-y-1 max-w-[200px]">
                      <div className="flex justify-between items-center text-[10px] font-bold text-gray-500">
                        <span>Tiến độ trung bình</span>
                        <span>{row.avgProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-150 dark:bg-gray-800 h-2 rounded-full overflow-hidden border border-gray-200/30 dark:border-gray-700/30">
                        <div 
                          className="h-full bg-indigo-500 rounded-full" 
                          style={{ width: `${row.avgProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-black ${
                      row.rate >= 100 
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/40" 
                        : row.rate >= 50
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/40"
                        : row.total === 0
                        ? "bg-gray-50 text-gray-400 dark:bg-gray-800/40 dark:text-gray-500 border border-gray-200/30"
                        : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/40"
                    }`}>
                      {row.total === 0 ? "N/A" : `${row.rate}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
