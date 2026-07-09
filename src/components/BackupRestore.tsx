import React, { useState, useRef } from "react";
import { 
  Database, Download, Upload, AlertTriangle, CheckCircle2, 
  RefreshCw, AlertCircle, Shield
} from "lucide-react";
import { User } from "../types";

interface BackupRestoreProps {
  currentUser: User;
  onRestoreSuccess: () => Promise<void>;
}

export default function BackupRestore({ currentUser, onRestoreSuccess }: BackupRestoreProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "reading" | "restoring" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setErrorMsg("");
      const response = await fetch(`/api/backup?role=${currentUser.role}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Gặp lỗi khi kết nối tới máy chủ.");
      }
      
      const blob = await response.blob();
      const dateStr = new Date().toISOString().split("T")[0];
      const fileName = `task_manager_backup_${dateStr}.json`;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Download backup error:", err);
      setStatus("error");
      setErrorMsg(err.message || "Không thể tải xuống bản sao lưu. Vui lòng thử lại.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSelectFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const validateAndSelectFile = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "json") {
      setStatus("error");
      setErrorMsg("Định dạng tệp tin không hỗ trợ. Vui lòng chọn tệp tin cấu trúc .json");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setStatus("idle");
    setErrorMsg("");
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRestore = () => {
    if (!selectedFile) return;

    setStatus("reading");
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const fileContent = e.target?.result as string;
        let parsedState: any = null;

        try {
          parsedState = JSON.parse(fileContent);
        } catch (jsonErr) {
          throw new Error("Tệp tin JSON bị lỗi cú pháp hoặc hỏng dữ liệu.");
        }

        if (!parsedState) {
          throw new Error("Không thể phân tích cú pháp tệp tin sao lưu.");
        }

        setStatus("restoring");

        // Send to server
        const response = await fetch(`/api/restore?role=${currentUser.role}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(parsedState)
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Gặp lỗi trong quá trình ghi dữ liệu lên máy chủ.");
        }

        setStatus("success");
        setSelectedFile(null);
        
        // Refresh the application data
        await onRestoreSuccess();
      } catch (err: any) {
        console.error("Restore error:", err);
        setStatus("error");
        setErrorMsg(err.message || "Tệp tin bị lỗi định dạng cấu trúc dữ liệu hoặc không hợp lệ.");
      }
    };

    reader.onerror = () => {
      setStatus("error");
      setErrorMsg("Không thể đọc tệp tin từ thiết bị của bạn.");
    };

    reader.readAsText(selectedFile);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
      {/* LEFT BLOCK: BACKUP */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-200 dark:border-gray-800 flex items-center space-x-2">
          <Database className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="font-extrabold text-base text-gray-950 dark:text-white">Sao lưu dữ liệu</h3>
            <p className="text-xs text-gray-400">Tải toàn bộ cơ sở dữ liệu hiện tại về máy tính cá nhân để lưu trữ.</p>
          </div>
        </div>

        <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Dữ liệu được xuất dưới dạng tệp tin <strong className="text-gray-800 dark:text-gray-200">JSON</strong> tiêu chuẩn, gọn nhẹ và bảo toàn đầy đủ thông tin gốc.
            </p>
            <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-xs text-indigo-950 dark:text-indigo-200">
              <strong className="block mb-1">Bản sao lưu bao gồm:</strong>
              <ul className="list-disc pl-4 space-y-1 text-gray-600 dark:text-gray-400">
                <li>Danh sách nhân viên & mật khẩu đăng nhập</li>
                <li>Toàn bộ thông tin các nhiệm vụ được giao</li>
                <li>Lịch sử báo cáo tiến độ chi tiết của toàn bộ dự án</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              disabled={downloading}
              onClick={handleDownload}
              className="w-full inline-flex items-center justify-center space-x-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-md hover:shadow-indigo-500/10 transition-all cursor-pointer"
            >
              {downloading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloading ? "ĐANG TẢI BẢN SAO LƯU..." : "TẢI BẢN SAO LƯU (JSON)"}</span>
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Bản sao lưu sẽ được tải tự động qua trình duyệt và lưu trữ trên máy tính của bạn dưới định dạng .json
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT BLOCK: RESTORE */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-200 dark:border-gray-800 flex items-center space-x-2">
          <Upload className="w-5 h-5 text-amber-500" />
          <div>
            <h3 className="font-extrabold text-base text-gray-950 dark:text-white">Khôi phục dữ liệu</h3>
            <p className="text-xs text-gray-400">Chọn hoặc kéo thả tệp sao lưu trước đó để khôi phục hệ thống.</p>
          </div>
        </div>

        <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Warning Section */}
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-800 dark:text-amber-400 leading-normal">
                <strong className="font-bold block mb-0.5">CẢNH BÁO QUAN TRỌNG:</strong>
                Việc khôi phục dữ liệu sẽ ghi đè và <strong className="font-bold underline text-amber-900 dark:text-amber-300">THAY THẾ TOÀN BỘ</strong> dữ liệu hiện tại của hệ thống. Hành động này không thể hoàn tác, hãy chắc chắn tệp sao lưu của bạn là chính xác.
              </div>
            </div>

            {/* File Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleBrowseClick}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 ${
                dragOver 
                  ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20" 
                  : selectedFile 
                    ? "border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10" 
                    : "border-gray-200 dark:border-gray-800 hover:border-indigo-500 dark:hover:border-indigo-800 bg-gray-50/30 dark:bg-gray-800/10"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleFileSelect}
              />
              
              {selectedFile ? (
                <>
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-gray-800 dark:text-gray-200 block truncate max-w-[280px]">
                      {selectedFile.name}
                    </span>
                    <span className="text-[10px] text-gray-400 block">
                      {(selectedFile.size / 1024).toFixed(2)} KB • Sẵn sàng khôi phục
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-full">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-gray-700 dark:text-gray-300 block">
                      Kéo thả tệp tin vào đây hoặc click để chọn
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-1">
                      Hỗ trợ tệp định dạng .json được xuất từ hệ thống
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Notification of status */}
            {status === "reading" && (
              <div className="flex items-center justify-center space-x-2 text-xs text-indigo-600 dark:text-indigo-400 py-1">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang đọc và phân tích cú pháp tệp tin JSON...</span>
              </div>
            )}
            {status === "restoring" && (
              <div className="flex items-center justify-center space-x-2 text-xs text-indigo-600 dark:text-indigo-400 py-1">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang nạp dữ liệu lên máy chủ và xây dựng lại database...</span>
              </div>
            )}
            {status === "success" && (
              <div className="flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl text-xs">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>Khôi phục dữ liệu thành công! Toàn bộ cơ sở dữ liệu đã được cập nhật mới.</span>
              </div>
            )}
            {status === "error" && (
              <div className="flex items-center space-x-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 p-3 rounded-xl text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span><strong>Khôi phục thất bại:</strong> {errorMsg}</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center space-x-3">
            <button
              type="button"
              disabled={!selectedFile || status === "reading" || status === "restoring"}
              onClick={handleRestore}
              className={`w-full inline-flex items-center justify-center space-x-2 px-5 py-3 text-xs font-bold rounded-xl shadow-md transition-all ${
                selectedFile && status !== "reading" && status !== "restoring"
                  ? "bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white hover:shadow-amber-500/10"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none"
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>TIẾN HÀNH KHÔI PHỤC NGAY</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
