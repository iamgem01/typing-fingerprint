# Typing Fingerprint — Collection Lab

Bản thu thập dữ liệu, chưa huấn luyện hay xác thực danh tính. HTML/CSS/JavaScript thu sự kiện trong ô thử nghiệm; Python xử lý file xuất. Không cần cài thư viện.

## Chạy trên máy

```sh
python -m http.server 8000 --directory dist
```

Mở http://localhost:8000. Chọn mã ẩn danh (P01), buổi thu (S01), loại bàn phím, câu mẫu và đồng ý trước khi bắt đầu. Gõ đúng câu rồi thả hết phím, nhấn Enter để lưu. Câu mẫu bao gồm khoảng trắng, không có dấu chấm cuối.

Dữ liệu hoàn thành được lưu trong localStorage theo trình duyệt và địa chỉ web. Không đồng bộ giữa máy hay tài khoản, không có API thu thập tập trung. Xuất JSON sau mỗi buổi rồi chuyển file cho người quản lý bộ dữ liệu. Đừng nhập mật khẩu hoặc nội dung riêng tư vào ô thử nghiệm.

## Xuất dữ liệu

- JSON: schema_version, metadata, consent, raw events, validity reasons, paired features, summary. Bao gồm cả lượt không hợp lệ và lượt hủy đã lưu.
- CSV: một hàng cho mỗi cặp keydown/keyup hoàn chỉnh; có cột valid để lọc. Lượt không có cặp hoàn chỉnh chỉ có trong JSON.
- Timestamps: performance.now(), mili giây tương đối từ phím đầu. Độ phân giải thực tế tùy trình duyệt, không phải độ chính xác phần cứng.
- hold_ms = keyup - keydown; down_down_ms = keydown hiện tại - keydown trước; up_down_ms = keydown hiện tại - keyup trước (có thể âm khi hai phím chồng lấn). Thứ tự theo keydown. Có ghi Shift/Backspace và các phím điều khiển.
- Một lần nhấn giữ chỉ có một keydown; tự lặp bị bỏ qua.
- Mất focus, đổi tab/cửa sổ, clipboard, IME, shortcut có modifier, input không được hỗ trợ, sự kiện không trusted, thiếu keyup và sai văn bản có thể đánh dấu lượt không hợp lệ. Đây là kiểm tra chất lượng phía client, không phải cơ chế chống giả mạo an toàn.
- session_uuid được đổi khi đổi người/buổi/bàn phím hoặc tải lại trang. session_id là nhãn buổi do người thu tự đặt; giữ cùng nhãn cho cùng một buổi thực tế.

## Python

```sh
python scripts/extract_features.py typing-fingerprint-2026-11-06.json -o features.csv
```

Mặc định chỉ xuất lượt valid. Thêm `--include-invalid` để kiểm tra chất lượng.

## Quy trình đề xuất

Mỗi người 10–20 lượt mỗi buổi, ít nhất hai buổi khác nhau để thử quy trình (không phải khẳng định quy mô đủ cho mô hình). Khi đánh giá sau này, tách tập theo buổi thực tế; không chia ngẫu nhiên các phím của cùng lượt vào train/test. Dùng mã ẩn danh, xin đồng thuận và giới hạn người được giữ file sinh trắc học. Chưa có chức năng khớp danh tính trong bản này.

