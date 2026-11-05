import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { Server, ShieldAlert } from 'lucide-react';

export function SystemStatus() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Server className="w-4 h-4 text-blue-600" />
            <CardTitle>Khu vực trạng thái hạ tầng hệ thống</CardTitle>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>Bảo mật API Key Frontend: Đã kích hoạt</span>
          </div>
        </div>
        <CardDescription>
          Trạng thái sẵn sàng của các mô hình dịch vụ kỹ thuật cho các bước kết nối tiếp theo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <StatusIndicator
            label="Supabase Auth"
            sublabel="Xác thực người dùng & Phân quyền"
            status="CONFIGURED"
            statusText="Sẵn sàng kết nối"
          />
          <StatusIndicator
            label="PostgreSQL Database"
            sublabel="Lưu trữ dữ liệu quan hệ"
            status="CONFIGURED"
            statusText="Sẵn sàng Schema"
          />
          <StatusIndicator
            label="Supabase Storage"
            sublabel="Lưu trữ file SGK & Hình ảnh"
            status="CONFIGURED"
            statusText="Sẵn sàng bucket"
          />
          <StatusIndicator
            label="pgvector / RAG Engine"
            sublabel="Tìm kiếm ngữ nghĩa YCCĐ"
            status="CONFIGURED"
            statusText="Sẵn sàng vector space"
          />
          <StatusIndicator
            label="Gemini API Services"
            sublabel="Tạo câu hỏi & kiểm định"
            status="CONFIGURED"
            statusText="Bảo mật Backend Ready"
          />
          <StatusIndicator
            label="DOCX & PDF Export"
            sublabel="Xuất hồ sơ & in ấn đề"
            status="CONFIGURED"
            statusText="Sẵn sàng Interfaces"
          />
        </div>
      </CardContent>
    </Card>
  );
}
