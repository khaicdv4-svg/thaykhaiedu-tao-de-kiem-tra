/**
 * Vẽ trang PDF thành ảnh JPEG trên trình duyệt (để AI đọc chữ khi PDF là ảnh quét).
 * Chỉ chạy ở trình duyệt.
 */

export interface PdfAnh {
  soTrang: number;
  /** Vẽ trang số `trang` (từ 1) thành JPEG base64 (không có tiền tố data:), cạnh dài tối đa `canhDai` điểm ảnh. */
  ve: (trang: number, canhDai?: number) => Promise<string>;
}

export async function moPdfLamAnh(buf: ArrayBuffer): Promise<PdfAnh> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
  return {
    soTrang: pdf.numPages,
    async ve(trang, canhDai = 1700) {
      const t = await pdf.getPage(trang);
      const goc = t.getViewport({ scale: 1 });
      const viewport = t.getViewport({ scale: canhDai / Math.max(goc.width, goc.height) });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Trình duyệt không vẽ được trang PDF.');
      await t.render({ canvas, canvasContext: ctx, viewport }).promise;
      return canvas.toDataURL('image/jpeg', 0.75).split(',')[1];
    },
  };
}
