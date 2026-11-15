'use client';

/** Trang quản trị: gom việc quản trị hệ thống, kèm tóm tắt tình trạng trường. */

import { useEffect, useState } from 'react';
import { Bot, Building2, CalendarDays, CloudCog, FolderTree, MailPlus, ShieldEllipsis, UserCog, Users, UsersRound } from 'lucide-react';
import { TrangGom } from '@/components/layout/TrangGom';
import { VAI_TRO_QUAN_TRI } from '@/core/constants/navigation';

interface TomTat { truong: string; namHoc: string; soTo: number; soNguoi: number; soNgung: number }

export default function TrangQuanTri() {
  const [tt, setTt] = useState<TomTat | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/cai-dat-he-thong')
      .then(async (r) => ({ ok: r.ok, j: await r.json().catch(() => ({})) }))
      .then(({ ok, j }) => {
        if (!ok) { setLoi(j.error ?? 'Chưa đọc được dữ liệu.'); return; }
        const nd = (j.nguoiDung ?? []) as { hoatDong: boolean }[];
        setTt({
          truong: j.truong?.ten ?? 'Chưa có',
          namHoc: (j.namHoc ?? []).find((n: { hienTai: boolean }) => n.hienTai)?.ten ?? 'Chưa đặt',
          soTo: (j.to ?? []).length,
          soNguoi: nd.length,
          soNgung: nd.filter((n) => !n.hoatDong).length,
        });
      })
      .catch(() => setLoi('Không kết nối được hệ thống.'));
  }, []);

  const o = (nhan: string, gt: React.ReactNode) => (
    <div className="px-5 py-4">
      <div className="text-[13px] text-slate-500">{nhan}</div>
      <div className="text-[17px] font-bold text-slate-900 mt-0.5 truncate">{gt}</div>
    </div>
  );

  return (
    <TrangGom
      tieuDe="Trang quản trị"
      moTa="Thông tin trường, năm học, tổ chuyên môn, tài khoản và vai trò. Những thay đổi ở đây có hiệu lực cho cả trường."
      icon={ShieldEllipsis}
      choVaiTro={VAI_TRO_QUAN_TRI}
      dauTrang={
        <div className="the-tke grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100">
          {loi ? <div className="col-span-full px-5 py-4 text-sm text-amber-800">{loi}</div> : (
            <>
              {o('Trường', tt?.truong ?? '…')}
              {o('Năm học hiện tại', tt?.namHoc ?? '…')}
              {o('Tổ chuyên môn', tt ? `${tt.soTo} tổ` : '…')}
              {o('Tài khoản', tt ? `${tt.soNguoi} người${tt.soNgung ? `, ${tt.soNgung} ngưng` : ''}` : '…')}
            </>
          )}
        </div>
      }
      phan={[
        {
          ten: 'Cài đặt hệ thống',
          the: [
            { ten: 'Thông tin trường', moTa: 'Tên, mã trường, địa chỉ và các khối học', href: '/settings#truong', icon: Building2 },
            { ten: 'Năm học', moTa: 'Thêm năm học, đặt năm học hiện tại', href: '/settings#nam-hoc', icon: CalendarDays },
            { ten: 'Tổ chuyên môn', moTa: 'Thêm tổ, chọn tổ trưởng, tổ phó và khối phụ trách', href: '/settings#to', icon: FolderTree },
            { ten: 'Danh sách người dùng', moTa: 'Tài khoản trong trường, vai trò và khối đang dạy', href: '/settings#nguoi-dung', icon: Users },
          ],
        },
        {
          ten: 'Tài khoản và vai trò',
          the: [
            { ten: 'Đăng ký Gmail theo vai trò', moTa: 'Đăng ký trước Gmail của Ban giám hiệu, tổ trưởng, tổ phó', href: '/phan-quyen#email', icon: MailPlus, xetQuyen: '/phan-quyen' },
            { ten: 'Cấp vai trò và ủy quyền', moTa: 'Cấp thêm vai trò có thời hạn, ủy quyền khi vắng', href: '/phan-quyen', icon: UserCog },
            { ten: 'Trang tổ trưởng', moTa: 'Việc của tổ: ma trận chung, bộ não, quyền giáo viên', href: '/to-truong', icon: UsersRound },
          ],
        },
        {
          ten: 'Kết nối và AI',
          the: [
            { ten: 'Cài đặt AI', moTa: 'Khóa API dùng chung, danh sách model, model cho từng việc', href: '/ai-settings', icon: Bot },
            { ten: 'Kết nối PPCT HUB', moTa: 'Trạng thái đồng bộ phân phối chương trình từ kho chung', href: '/sources#ppct-hub', icon: CloudCog },
          ],
        },
      ]}
    />
  );
}
