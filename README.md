# 📖 Sách Lật Bản Tĩnh (Flipbook Web)

Chào bạn, đây là mã nguồn dự án sách lật HTML tĩnh đã được xây dựng theo hiệu ứng lật trang 3D với StPageFlip. Mỗi trang sách tự động đi kèm ảnh và nhạc.

## Cấu trúc thư mục giải thích
- `index.html`: Cấu trúc cốt lõi của cuốn sách. Nơi chia sẵn các `.page`.
- `css/style.css`: Quy định UI (độ đẹp, bóng đổ, glassmorphism, background).
- `js/app.js`: Lo chạy hiệu ứng lật sách và đồng bộ phát/dừng audio.
- `assets/images/`: Thư mục ảnh cho từng trang.
- `assets/audio/`: Thư mục mp3 cho từng trang.

## 🎛 Cách Thay Nội Dung (Ảnh / Nhạc)

1. **Thay thế hình ảnh:**
   - Bạn chỉ cần dán đè ảnh mới của bạn vào thư mục `assets/images/`.
   - Lưu ý đặt tên file giống với file cũ, ví dụ: `page-1.jpg`, `page-2.jpg`.
   - Mẹo: Kích thước ảnh đẹp nhất là chuẩn dọc, ví dụ 800x1000px hoặc 400x500px.

2. **Thay thế âm thanh:**
   - Dán file `.mp3` của bạn vào `assets/audio/`.
   - Đặt tên file tương ứng, ví dụ `page-1.mp3`.

3. **Thêm / Bớt số lượng trang:**
   - Mở file `index.html`.
   - Tìm đoạn `<div class="page" data-audio="..."> ... </div>`.
   - Bạn hãy copy cả đoạn đó dán xuống dưới để tạo thêm trang `page-5`, `page-6`, sau đó đổi số liệu bên trong cho đúng với tên file bạn vừa đặt.

## ⚠️ Lưu ý khi dùng
- Do chính sách của Google Chrome / Safari, nhạc **không thể tự động phát** ngay khi vừa load web. Vì vậy mình đã tạo Màn hình chờ "Mở sách" ở đầu tiên. Mọi người ấn vào nút đó thì sau đó lật trang nhạc mới được quyền kêu.
- Bạn nên sử dụng Local Server (như VSCode Live Server) để chạy thử vì thư viện đọc `.html` dạng file tĩnh đôi khi sẽ chặn CORS với Audio.

Chúc bạn có một Album Kỷ Niệm siêu xịn xò! 🎉
