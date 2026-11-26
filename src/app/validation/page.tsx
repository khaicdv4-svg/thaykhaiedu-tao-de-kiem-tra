import { redirect } from 'next/navigation';

/** Kiểm định đề đã gộp vào bước 5 (Kho đề) từ 26/11/2026. Giữ đường dẫn cũ để không gãy liên kết đã lưu. */
export default function ValidationPage() {
  redirect('/tests#kiem-dinh');
}
