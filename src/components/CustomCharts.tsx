/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Edit, Trash2 } from "lucide-react";
import { Task, User, TaskStatus } from "../types";

// Helper to map statuses to colors
export const STATUS_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.NOT_STARTED]: "#9ca3af", // Gray
  [TaskStatus.IN_PROGRESS]: "#3b82f6", // Blue
  [TaskStatus.COMPLETED]: "#10b981",   // Green
  [TaskStatus.PAUSED]: "#f59e0b",      // Amber
  [TaskStatus.OVERDUE]: "#ef4444"      // Red
};

interface ChartProps {
  tasks: Task[];
  users: User[];
}

/**
 * 1. Pie/Donut Chart for Task Statuses
 */
export function StatusPieChart({ tasks }: { tasks: Task[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Calculate counts
  const counts = {
    [TaskStatus.NOT_STARTED]: 0,
    [TaskStatus.IN_PROGRESS]: 0,
    [TaskStatus.COMPLETED]: 0,
    [TaskStatus.PAUSED]: 0
  };

  tasks.forEach((t) => {
    // Treat as overdue if past due date and not completed
    const isOverdue = t.dueDate && new Date(t.dueDate) < new Date("2026-07-05") && t.status !== TaskStatus.COMPLETED;
    const statusKey = isOverdue ? TaskStatus.PAUSED : t.status; // group overdue or use actual stored status
    if (statusKey in counts) {
      counts[statusKey as keyof typeof counts]++;
    } else {
      counts[t.status as keyof typeof counts]++;
    }
  });

  const total = tasks.length || 1;
  const data = [
    { name: TaskStatus.NOT_STARTED, value: counts[TaskStatus.NOT_STARTED], color: "#9ca3af" },
    { name: TaskStatus.IN_PROGRESS, value: counts[TaskStatus.IN_PROGRESS], color: "#3b82f6" },
    { name: TaskStatus.COMPLETED, value: counts[TaskStatus.COMPLETED], color: "#10b981" },
    { name: TaskStatus.PAUSED, value: counts[TaskStatus.PAUSED], color: "#f59e0b" }
  ].filter(d => d.value > 0);

  // SVG Donut calculation
  const radius = 60;
  const strokeWidth = 20;
  const center = 80;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-around gap-6 p-2 w-full h-full">
      <div className="relative w-36 h-36 shrink-0">
        {data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
            Không có dữ liệu
          </div>
        ) : (
          <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
            {data.map((item, idx) => {
              const percentage = item.value / total;
              const strokeLength = percentage * circumference;
              const strokeOffset = -accumulatedOffset;
              accumulatedOffset += strokeLength;

              const isHovered = hoveredIdx === idx;

              return (
                <circle
                  key={item.name}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${strokeLength} ${circumference}`}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">{tasks.length}</span>
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Tổng số</span>
        </div>
      </div>

      <div className="flex flex-col justify-center space-y-2 w-full sm:w-auto max-w-xs shrink-0">
        {data.map((item, idx) => {
          const pct = Math.round((item.value / tasks.length) * 100) || 0;
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={item.name}
              className={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${
                isHovered ? "bg-gray-100 dark:bg-gray-800" : ""
              }`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-white pl-4">
                {item.value} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 2. Bar Chart for Task Progress
 * Compiles and displays the progress of individual tasks
 */
export function TaskProgressChart({ 
  tasks,
  onEditTask,
  onDeleteTask
}: { 
  tasks: Task[];
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
}) {
  // Sort tasks: prioritize IN_PROGRESS, then most recently updated
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === TaskStatus.IN_PROGRESS && b.status !== TaskStatus.IN_PROGRESS) return -1;
    if (a.status !== TaskStatus.IN_PROGRESS && b.status === TaskStatus.IN_PROGRESS) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const displayTasks = sortedTasks.slice(0, 5);

  return (
    <div className="p-4 space-y-4 h-full flex flex-col justify-center">
      {displayTasks.length === 0 ? (
        <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-500">
          Chưa có nhiệm vụ nào được giao
        </div>
      ) : (
        displayTasks.map((task) => (
          <div key={task.id} className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[60%]" title={task.title}>
                {task.title}
              </span>
              <div className="flex items-center space-x-1 shrink-0">
                {onEditTask && (
                  <button
                    onClick={() => onEditTask(task)}
                    className="p-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    title="Sửa tiến độ"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDeleteTask && (
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    title="Xóa nhiệm vụ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="font-bold text-indigo-600 dark:text-indigo-400 ml-1 shrink-0">{task.progress}%</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 h-3 overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  task.progress === 100 
                    ? "bg-emerald-500 dark:bg-emerald-600" 
                    : task.status === TaskStatus.PAUSED 
                    ? "bg-amber-500 dark:bg-amber-600"
                    : "bg-indigo-500 dark:bg-indigo-600"
                }`}
                style={{ width: `${task.progress}%` }}
              ></div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/**
 * 3. Bar Chart for Job Count per member
 * Showcases tasks count and their completion status
 */
export function MemberTaskCountChart({ tasks, users }: ChartProps) {
  const membersOnly = users.filter((u) => u.role === "member");

  const countData = membersOnly.map((member) => {
    const assigned = tasks.filter((t) => t.assignedTo && Array.isArray(t.assignedTo) && t.assignedTo.includes(member.id));
    const completed = assigned.filter((t) => t.status === TaskStatus.COMPLETED).length;
    const active = assigned.length - completed;

    return {
      name: (member.name || "").split(" ").slice(-2).join(" "), // get last 2 words of name
      active,
      completed,
      total: assigned.length
    };
  });

  const maxVal = Math.max(...countData.map(d => d.total), 1);
  const chartHeight = 120;

  return (
    <div className="p-4 h-full flex flex-col justify-between">
      {/* SVG Container */}
      <div className="relative flex items-end justify-around h-32 border-b border-gray-200 dark:border-gray-800 pb-1 pt-4">
        {countData.map((d, idx) => {
          const completedHeight = (d.completed / maxVal) * chartHeight;
          const activeHeight = (d.active / maxVal) * chartHeight;

          return (
            <div key={idx} className="group relative flex flex-col items-center w-12">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-gray-900 text-white text-[10px] p-2 rounded shadow-lg z-10 w-24 text-center pointer-events-none">
                <span className="font-bold">{d.name}</span>
                <span>Hoàn thành: {d.completed}</span>
                <span>Đang làm: {d.active}</span>
                <span className="border-t border-white/20 mt-1 pt-1 font-semibold">Tổng: {d.total}</span>
              </div>

              {/* Bars container */}
              <div className="w-6 flex flex-col justify-end" style={{ height: `${chartHeight}px` }}>
                {/* Active bar (blue) */}
                {d.active > 0 && (
                  <div
                    className="bg-blue-500 hover:bg-blue-600 transition-all rounded-t-sm"
                    style={{ height: `${activeHeight}px` }}
                  ></div>
                )}
                {/* Completed bar (emerald) */}
                {d.completed > 0 && (
                  <div
                    className="bg-emerald-500 hover:bg-emerald-600 transition-all rounded-sm mt-0.5"
                    style={{ height: `${completedHeight}px` }}
                  ></div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* X Axis labels */}
      <div className="flex justify-around mt-2">
        {countData.map((d, idx) => (
          <span key={idx} className="text-[10px] font-bold text-gray-500 dark:text-gray-400 w-12 text-center truncate">
            {d.name}
          </span>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center space-x-4 text-[10px] text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t border-gray-100 dark:border-gray-800/50">
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></span>
          <span>Đang thực hiện</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>
          <span>Đã hoàn thành</span>
        </div>
      </div>
    </div>
  );
}


