/**
 * Ma trận chung CUOI_HK1 môn Tiếng Việt – Lớp 4, năm học 2026 - 2027.
 * Sinh tự động từ docs/mau-ma-tran/ma-tran-chung-chk1-tieng-viet.json. Sửa file JSON rồi chạy lại script, không sửa tay file này.
 */
import type { MaTranChung } from '@/types/matrix-template';

export const MA_TRAN_CHUNG_CHK1_TIENG_VIET: MaTranChung = {
  "phien_ban_mau": "1.0",
  "loai": "MA_TRAN_CHUNG",
  "lop": "Lớp 4",
  "ky_kiem_tra": "CUOI_HK1",
  "nam_hoc": "2026 - 2027",
  "truong": {
    "co_quan_chu_quan": "ỦY BAN NHÂN DÂN PHƯỜNG HÒA BÌNH",
    "truong": "TRƯỜNG TIỂU HỌC TRẦN VĂN ƠN",
    "noi_ky": "Hòa Bình"
  },
  "mon": "Tiếng Việt",
  "ma_mon": "TIENG_VIET",
  "bo_cuc": "TIENG_VIET_3_PHAN",
  "tieu_de": "MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ CUỐI HỌC KỲ I",
  "thoi_gian_phut": null,
  "ngay_ky": "ngày 25 tháng 8 năm 2026",
  "bai_kiem_tra": [
    {
      "ma": "doc",
      "ten": "Bài kiểm tra Đọc",
      "tong_diem": 10,
      "phan": [
        {
          "ma": "doc_thanh_tieng",
          "ten": "Phần 1: Đọc thành tiếng",
          "tong_diem": 2,
          "kieu": "TIEU_CHI",
          "dong": [
            {
              "mach": "Phần 1: Đọc thành tiếng",
              "noi_dung": "Chủ điểm: 3. Niềm vui sáng tạo; 4. Chắp cánh ước mơ",
              "yccd": [
                "Tốc độ đọc: khoảng 80 – 90 tiếng/phút/HS."
              ],
              "cau_hoi": [],
              "tieu_chi_diem": 0.5
            },
            {
              "mach": "Phần 1: Đọc thành tiếng",
              "noi_dung": "Chủ điểm: 3. Niềm vui sáng tạo; 4. Chắp cánh ước mơ",
              "yccd": [
                "Nghỉ hơi, ngắt nhịp: nghỉ hơi ở chỗ có dấu câu hoặc chỗ ngắt nhịp thơ. Đọc đúng và diễn cảm các văn bản truyện, kịch, thơ, văn bản miêu tả."
              ],
              "cau_hoi": [],
              "tieu_chi_diem": 0.5
            },
            {
              "mach": "Phần 1: Đọc thành tiếng",
              "noi_dung": "Chủ điểm: 3. Niềm vui sáng tạo; 4. Chắp cánh ước mơ",
              "yccd": [
                "Trả lời câu hỏi: 01 câu hỏi đọc hiểu văn bản đã đọc."
              ],
              "cau_hoi": [],
              "tieu_chi_diem": 1
            }
          ]
        },
        {
          "ma": "doc_hieu",
          "ten": "Phần 2: Đọc hiểu",
          "tong_diem": 8,
          "kieu": "CAU_HOI",
          "lua_chon": {
            "ma": "loai_van_ban",
            "ten": "Loại văn bản đọc hiểu (chọn một)",
            "phuong_an": [
              {
                "ma": "VBVH",
                "ten": "Văn bản văn học",
                "dong": [
                  {
                    "mach": "Phần 2: Đọc hiểu",
                    "noi_dung": "Đọc hiểu nội dung (VBVH)",
                    "yccd": [
                      "Nhận biết được một số chi tiết và nội dung chính của văn bản.",
                      "Nhận biết được chủ đề văn bản."
                    ],
                    "cau_hoi": [
                      {
                        "cau": "1",
                        "y_nho": null,
                        "so_cau_tinh": 1,
                        "muc": 1,
                        "hinh_thuc": "TN",
                        "dang": null,
                        "diem": 0.5
                      },
                      {
                        "cau": "2",
                        "y_nho": null,
                        "so_cau_tinh": 1,
                        "muc": 1,
                        "hinh_thuc": "TN",
                        "dang": null,
                        "diem": 0.5
                      },
                      {
                        "cau": "3",
                        "y_nho": null,
                        "so_cau_tinh": 1,
                        "muc": 1,
                        "hinh_thuc": "TN",
                        "dang": null,
                        "diem": 0.5
                      },
                      {
                        "cau": "4",
                        "y_nho": null,
                        "so_cau_tinh": 1,
                        "muc": 1,
                        "hinh_thuc": "TN",
                        "dang": null,
                        "diem": 0.5
                      }
                    ],
                    "nhom": "Đọc hiểu văn bản (5 điểm)"
                  },
                  {
                    "mach": "Phần 2: Đọc hiểu",
                    "noi_dung": "Đọc hiểu nội dung (VBVH)",
                    "yccd": [
                      "Dựa vào gợi ý hiểu được điều tác giả muốn nói qua văn bản.",
                      "Tóm tắt được văn bản truyện đơn giản."
                    ],
                    "cau_hoi": [
                      {
                        "cau": "5",
                        "y_nho": null,
                        "so_cau_tinh": 1,
                        "muc": 2,
                        "hinh_thuc": "TL",
                        "dang": null,
                        "diem": 1
                      }
                    ],
                    "nhom": "Đọc hiểu văn bản (5 điểm)"
                  },
                  {
                    "mach": "Phần 2: Đọc hiểu",
                    "noi_dung": "Đọc hiểu hình thức (VBVH)",
                    "yccd": [
                      "Nhận biết được đặc điểm của nhân vật thể hiện qua hình dáng, điệu bộ, hành động, lời thoại.",
                      "Nhận biết được trình tự sắp xếp các sự việc trong câu chuyện theo quan hệ nhân quả.",
                      "Nhận biết được quan hệ giữa các nhân vật trong câu chuyện thể hiện qua cách xưng hô.",
                      "Nhận biết hình ảnh trong thơ, lời thoại trong văn bản."
                    ],
                    "cau_hoi": [
                      {
                        "cau": "6",
                        "y_nho": null,
                        "so_cau_tinh": 1,
                        "muc": 2,
                        "hinh_thuc": "TL",
                        "dang": null,
                        "diem": 1
                      }
                    ],
                    "nhom": "Đọc hiểu văn bản (5 điểm)"
                  },
                  {
                    "mach": "Phần 2: Đọc hiểu",
                    "noi_dung": "Liên hệ, so sánh, kết nối (VBVH)",
                    "yccd": [
                      "Nêu được tình cảm, suy nghĩ của bản thân sau khi đọc văn bản.",
                      "Nêu được câu chuyện, bài hoặc đoạn thơ mà mình yêu thích nhất và giải thích vì sao.",
                      "Nêu được cách ứng xử với bản thân nếu gặp những tình huống tương tự như tình huống của nhân vật trong tác phẩm."
                    ],
                    "cau_hoi": [
                      {
                        "cau": "7",
                        "y_nho": null,
                        "so_cau_tinh": 1,
                        "muc": 3,
                        "hinh_thuc": "TL",
                        "dang": null,
                        "diem": 1
                      }
                    ],
                    "nhom": "Đọc hiểu văn bản (5 điểm)"
                  }
                ]
              },
              {
                "ma": "VBTT",
                "ten": "Văn bản thông tin",
                "dong": [
                  {
                    "mach": "Phần 2: Đọc hiểu",
                    "noi_dung": "Đọc hiểu nội dung (VBTT)",
                    "yccd": [
                      "Nhận biết được những thông tin chính trong văn bản.",
                      "Biết tóm tắt văn bản."
                    ],
                    "cau_hoi": [
                      {
                        "cau": "1",
                        "y_nho": null,
                        "so_cau_tinh": 1,
                        "muc": 1,
                        "hinh_thuc": "TN",
                        "dang": null,
                        "diem": 0.5
                      },
                      {
                        "cau": "2",
                        "y_nho": null,
                        "so_cau_tinh": 1,
                        "muc": 1,
                        "hinh_thuc": "TN",
                        "dang": null,
                        "diem": 0.5
                      },
                      {
                        "cau": "3",
                        "y_nho": null,
                        "so_cau_tinh": 1,
                        "muc": 1,
                        "hinh_thuc": "TN",
                        "dang": null,
                        "diem": 0.5
                      },
                      {
                        "cau": "4",
                        "y_nho": null,
                        "so_cau_tinh": 1,
                        "muc": 1,
                        "hinh_thuc": "TN",
                        "dang": null,
                        "diem": 0.5
                      }
                    ],
                    "nhom": "Đọc hiểu văn bản (5 điểm)"
                  },
                  {
                    "mach": "Phần 2: Đọc hiểu",
                    "noi_dung": "Đọc hiểu hình thức (VBTT)",
                    "yccd": [
                      "Nhận biết được đặc điểm của một số loại văn bản thông dụng, đơn giản và mối quan hệ giữa đặc điểm văn bản với mục đích của nó.",
                      "Nhận biết được bố cục văn bản thông tin thông thường: phần đầu, phần giữa (phần chính) và phần cuối."
                    ],
                    "cau_hoi": [
                      {
                        "cau": "5",
                        "y_nho": null,
                        "so_cau_tinh": 1,
                        "muc": 2,
                        "hinh_thuc": "TL",
                        "dang": null,
                        "diem": 1
                      }
                    ],
                    "nhom": "Đọc hiểu văn bản (5 điểm)"
                  },
                  {
                    "mach": "Phần 2: Đọc hiểu",
                    "noi_dung": "Liên hệ, so sánh, kết nối (VBTT)",
                    "yccd": [
                      "Nêu được một vấn đề có ý nghĩa đối với bản thân hay cộng đồng được gợi ra từ văn bản đã đọc."
                    ],
                    "cau_hoi": [
                      {
                        "cau": "6",
                        "y_nho": null,
                        "so_cau_tinh": 1,
                        "muc": 3,
                        "hinh_thuc": "TL",
                        "dang": null,
                        "diem": 1
                      }
                    ],
                    "nhom": "Đọc hiểu văn bản (5 điểm)"
                  },
                  {
                    "mach": "Phần 2: Đọc hiểu",
                    "noi_dung": "Liên hệ, so sánh, kết nối (VBTT)",
                    "yccd": [
                      "Nhận biết được thông tin qua hình ảnh, số liệu trong văn bản."
                    ],
                    "cau_hoi": [
                      {
                        "cau": "7",
                        "y_nho": null,
                        "so_cau_tinh": 1,
                        "muc": 2,
                        "hinh_thuc": "TL",
                        "dang": null,
                        "diem": 1
                      }
                    ],
                    "nhom": "Đọc hiểu văn bản (5 điểm)"
                  }
                ]
              }
            ]
          },
          "dong": [
            {
              "mach": "Phần 2: Đọc hiểu",
              "noi_dung": "Từ vựng",
              "yccd": [
                "Vốn từ theo chủ điểm.",
                "Nghĩa của một số thành ngữ dễ hiểu.",
                "Nghĩa của một số yếu tố Hán Việt thông dụng."
              ],
              "cau_hoi": [
                {
                  "cau": "8",
                  "y_nho": null,
                  "so_cau_tinh": 1,
                  "muc": 1,
                  "hinh_thuc": "TN",
                  "dang": null,
                  "diem": 0.5
                },
                {
                  "cau": "9",
                  "y_nho": null,
                  "so_cau_tinh": 1,
                  "muc": 1,
                  "hinh_thuc": "TN",
                  "dang": null,
                  "diem": 0.5
                }
              ],
              "nhom": "Kiến thức Tiếng Việt (3 điểm)",
              "chu_diem": "Mỗi người một vẻ; Trải nghiệm & khám phá"
            },
            {
              "mach": "Phần 2: Đọc hiểu",
              "noi_dung": "Ngữ pháp",
              "yccd": [
                "Tính từ: nhận diện và biết cách sử dụng tính từ.",
                "Dấu gạch ngang: nắm được công dụng của dấu gạch ngang (đặt ở đầu dòng để đánh dấu các ý liệt kê; nối các từ ngữ trong một liên danh)."
              ],
              "cau_hoi": [
                {
                  "cau": "10",
                  "y_nho": null,
                  "so_cau_tinh": 1,
                  "muc": 2,
                  "hinh_thuc": "TL",
                  "dang": null,
                  "diem": 1
                }
              ],
              "nhom": "Kiến thức Tiếng Việt (3 điểm)",
              "chu_diem": "Mỗi người một vẻ; Trải nghiệm & khám phá"
            },
            {
              "mach": "Phần 2: Đọc hiểu",
              "noi_dung": "Hoạt động giao tiếp",
              "yccd": [
                "Biện pháp tu từ nhân hoá: đặc điểm và tác dụng.",
                "Một số vấn đề về phong cách ngôn ngữ và ngữ dụng (đặt câu phù hợp với các chủ đề giao tiếp đã học)."
              ],
              "cau_hoi": [
                {
                  "cau": "11",
                  "y_nho": null,
                  "so_cau_tinh": 1,
                  "muc": 3,
                  "hinh_thuc": "TL",
                  "dang": null,
                  "diem": 1
                }
              ],
              "nhom": "Kiến thức Tiếng Việt (3 điểm)",
              "chu_diem": "Mỗi người một vẻ; Trải nghiệm & khám phá"
            }
          ]
        }
      ]
    },
    {
      "ma": "viet",
      "ten": "Bài kiểm tra Viết",
      "tong_diem": 10,
      "phan": [
        {
          "ma": "viet",
          "ten": "Phần 3: Viết văn bản",
          "tong_diem": 10,
          "kieu": "VIET",
          "lua_chon": {
            "ma": "the_loai",
            "ten": "Thể loại bài viết (chọn một)",
            "phuong_an": [
              {
                "ma": "DOAN_VAN_TUONG_TUONG",
                "ten": "Viết đoạn văn tưởng tượng dựa vào một câu chuyện đã đọc, đã nghe",
                "dong": [
                  {
                    "mach": "Phần 3: Viết văn bản",
                    "noi_dung": "Viết đoạn văn tưởng tượng dựa vào một câu chuyện đã đọc, đã nghe",
                    "yccd": [
                      "Viết được đoạn văn tưởng tượng dựa vào câu chuyện đã nghe, đã đọc; phát triển thêm chi tiết, sự việc phù hợp và có tính sáng tạo.",
                      "Đoạn văn có mở đoạn, kết đoạn phù hợp; diễn đạt mạch lạc, đúng chính tả."
                    ],
                    "cau_hoi": [
                      {
                        "cau": "Viết",
                        "y_nho": null,
                        "so_cau_tinh": 1,
                        "muc": 3,
                        "hinh_thuc": "TL",
                        "dang": "VIET",
                        "diem": 10
                      }
                    ],
                    "chu_diem": "Mỗi người một vẻ; Trải nghiệm & khám phá"
                  }
                ]
              },
              {
                "ma": "MIEU_TA_CON_VAT",
                "ten": "Viết bài văn miêu tả con vật",
                "dong": [
                  {
                    "mach": "Phần 3: Viết văn bản",
                    "noi_dung": "Viết bài văn miêu tả con vật",
                    "yccd": [
                      "Viết được bài văn miêu tả con vật hoàn chỉnh, có đủ ba phần: mở bài, thân bài, kết bài rõ ràng.",
                      "Miêu tả hình dáng và hoạt động đặc trưng của con vật; sử dụng nhân hóa và từ ngữ gợi tả, gợi cảm.",
                      "Thể hiện tình cảm, thái độ với con vật; bài viết mạch lạc, nhiều cảm xúc; trình bày sạch sẽ, đúng quy định.",
                      "Bắt đầu từ việc hình thành ý tưởng và triển khai ý tưởng một cách sáng tạo; sử dụng những từ ngữ gợi lên đặc điểm nổi bật của đối tượng được tả."
                    ],
                    "cau_hoi": [
                      {
                        "cau": "Viết",
                        "y_nho": null,
                        "so_cau_tinh": 1,
                        "muc": 3,
                        "hinh_thuc": "TL",
                        "dang": "VIET",
                        "diem": 10
                      }
                    ],
                    "chu_diem": "Mỗi người một vẻ; Trải nghiệm & khám phá"
                  }
                ]
              }
            ]
          },
          "dong": []
        }
      ]
    }
  ],
  "do_dai_van_ban": {
    "Truyện": "280 – 300 chữ",
    "Miêu tả": "200 – 220 chữ",
    "Thơ": "100 – 110 chữ",
    "Văn bản thông tin": "150 – 160 chữ"
  },
  "ti_le_muc_quy_dinh_doc_hieu": {
    "1": 3,
    "2": 3,
    "3": 2,
    "don_vi": "điểm trên 8"
  },
  "ky_vong_tu_file_goc": {
    "doc_hieu": {
      "tong_so_cau": 11,
      "so_cau_TN": 6,
      "so_cau_TL": 5,
      "diem_muc": {
        "1": 3,
        "2": 3,
        "3": 2
      },
      "tong_diem": 8
    }
  },
  "van_de_can_xac_nhan": [
    "Phần Kiến thức Tiếng Việt và Phần 3 Viết vẫn ghi chủ điểm giữa kì (Mỗi người một vẻ; Trải nghiệm & khám phá). Cuối HKI là Niềm vui sáng tạo; Chắp cánh ước mơ (Phần 1 đã ghi đúng). Thể loại bài viết cũng cần thầy xác nhận là kiểu bài đã học, đã trả bài ở cuối HKI."
  ],
  "chu_ky": [
    {
      "chuc_vu": "HIỆU TRƯỞNG",
      "ho_ten": ""
    },
    {
      "chuc_vu": "TỔ TRƯỞNG",
      "ho_ten": "Võ Việt Khái"
    }
  ]
};
