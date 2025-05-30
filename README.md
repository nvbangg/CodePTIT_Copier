# CodePTIT Copier

**Script CodePTIT Copier. Xóa dòng trống thừa khi copy Testcase. Tạo nút Copy nhanh Testcase và Mã bài_Tên bài đã Xóa dấu tiếng việt cùng khoảng trắng trên CodePTIT (cả phiên bản cũ và mới)**

## TÍNH NĂNG:

- **Xóa dòng trống thừa khi copy** nội dung trong Testcase (khi copy thuần lẫn nhấn nút copy nhanh)
- Tạo nút Copy nhanh Testcase trên CodePTIT **(cả phiên bản cũ và mới)**
- **Tạo nút Copy nhanh Mã bài_Tên bài** đã Xóa dấu tiếng việt cùng khoảng trắng kèm đuôi tùy chỉnh.
  - Ví dụ với mã bài `DSA06027`, tên bài là `SẮP XẾP ĐỔI CHỖ TRỰC TIẾP - LIỆT KÊ NGƯỢC`
  - Nội dung sẽ copy được là: `DSA06027_SapXepDoiChoTrucTiep-LietKeNguoc.cpp`
  - Giúp thuận tiện đặt tên và lưu file nhanh chóng

## CÁCH CÀI ĐẶT:

- Bước 1: Cài extension [Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) hoặc extension khác tương tự
  - Sau đó **Bật Developer mode (Chế độ nhà phát triển)** trong trình duyệt tại: `chrome://extensions`
  - **Lưu ý: Ở lần cài lần đầu tiên** hãy Tắt trình duyệt rồi Mở lại để Hoạt động
- Bước 2: Cài script tại: https://openuserjs.org/scripts/nvbangg/CodePTIT_Copier
  - Hoặc cài tại: https://greasyfork.org/vi/scripts/536045-codeptit-copier

### Nhớ Follow👀 và Tặng sao⭐ trên Github nha❤️ 
 **Follow👀:** [![Follow](https://img.shields.io/github/followers/nvbangg?label=Follow&style=social)](https://github.com/nvbangg) | **Star⭐:** [![Star](https://img.shields.io/github/stars/nvbangg/CodePTIT_Copier?style=social)](https://github.com/nvbangg/CodePTIT_Copier)

![StarGuide](https://raw.githubusercontent.com/nvbangg/nvbangg/main/data/star.gif)

[![Visitors](https://api.visitorbadge.io/api/visitors?path=https%3A%2F%2Fgithub.com%2Fnvbangg%2FCodePTIT_Copier&countColor=%232ccce4)](https://visitorbadge.io/status?path=https%3A%2F%2Fgithub.com%2Fnvbangg%2FCodePTIT_Copier)

## DEMO

![image](https://github.com/user-attachments/assets/058fcf8c-a3d8-46c7-9a45-16cca2e1ec47)

- Ở ví dụ trên, nếu copy bình thường sẽ bị lỗi dòng trống thừa, gây lỗi khi chạy testcase

```
Buoc 5: 1 3 4 5 8 9

Buoc 4: 1 3 4 5 9 8

Buoc 3: 1 3 4 9 8 5

Buoc 2: 1 3 8 9 5 4

Buoc 1: 1 8 5 9 3 4
```

- Còn nếu dùng script thì nội dung khi copy sẽ được là:

```
Buoc 5: 1 3 4 5 8 9
Buoc 4: 1 3 4 5 9 8
Buoc 3: 1 3 4 9 8 5
Buoc 2: 1 3 8 9 5 4
Buoc 1: 1 8 5 9 3 4
```

## SETTINGS

- Mở settings bằng cách: Nhấn vào Tampermonkey (hoặc click chuột phải) **khi ở trang `https://code.ptit.edu.vn`**, sau đó nhấn vào mục `Settings` trong mục `CodePTIT Copier`

![image](https://github.com/user-attachments/assets/706fb1c3-b832-4b13-8505-a7a7213ea3c6)
