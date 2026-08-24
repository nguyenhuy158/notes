# AI Ideas cho Notes App

Danh sách ý tưởng áp dụng AI vào app nhật ký. Stack: Cloudflare Workers AI
(binding `env.AI`, đã có sẵn trong `wrangler.jsonc`).

---

## 1. Tóm tắt ngày / tuần / tháng ⭐ ƯU TIÊN

- Gom các note trong ngày/tuần/tháng → gọi LLM tóm tắt thành 2-3 câu.
- Model: `@cf/meta/llama-3.1-8b-instruct` (hoặc mới hơn nếu có).
- Hiển thị ở đầu DayScreen hoặc Calendar như "recap" nhanh.
- Endpoint: `GET /api/summary?date=2025-01-15` hoặc `?week=...` / `?month=...`.

## 2. Gợi ý mood tự động

- Phân tích nội dung note vừa viết → suggest mood emoji phù hợp.
- Có thể dùng LLM classification hoặc sentiment model nhẹ.
- UI: sau khi lưu note, hiện gợi ý mood, user confirm/sửa.
- Endpoint: `POST /api/ai/suggest-mood` body: `{ text }`.

## 3. Auto-tag

- Sau khi lưu note text, chạy LLM phân loại nội dung → suggest tags từ danh
  sách tag đã có (`GET /api/tags`).
- Giảm ma sát gắn nhãn thủ công.
- Endpoint: `POST /api/ai/suggest-tags` body: `{ text, existingTags[] }`.

## 4. Hỏi đáp nhật ký (RAG)

- "Lần cuối mình đi Đà Lạt là khi nào?" — search nội dung note rồi cho LLM
  trả lời.
- Đơn giản: FTS trên D1 (LIKE hoặc FTS5 nếu enable).
- Nâng cao: text embedding (`@cf/baai/bge-small-en-v1.5`) + Cloudflare
  Vectorize.
- UI: màn "Hỏi nhật ký" dạng chatbot.

## 5. Writing prompts thông minh

- Hiện tại `writingPrompts.ts` là danh sách tĩnh.
- Dùng LLM generate prompt dựa trên context: mood hôm nay, tag hay dùng,
  "On this day" năm trước.
- Endpoint: `GET /api/ai/writing-prompt?mood=&tags=`.

## 6. "On this day" narrative

- Thay vì chỉ hiện note cũ, cho LLM viết đoạn ngắn kể lại "1 năm trước bạn
  đang..." — cảm xúc hơn.
- Kết hợp với endpoint `on-this-day` đã có (nếu có).

## 7. Semantic search (Vectorize)

- Cloudflare Vectorize + embedding model → tìm note theo nghĩa thay vì
  keyword.
- Ví dụ: search "lần buồn nhất" → ra note có mood 😔 + nội dung liên quan.
- Cần thêm binding Vectorize trong `wrangler.jsonc`.

## 8. Tổng kết năm bằng AI

- Cuối năm, feed mood + tag stats + note highlights → LLM viết "Year in
  Review" dạng letter cá nhân.
- Có thể trigger thủ công từ Settings hoặc tự hiện popup cuối năm.

## 9. Dịch note

- Dịch nội dung note sang ngôn ngữ khác (VI↔EN).
- Hữu ích khi share note cho người nước ngoài.
- Model: `@cf/meta/m2m100-1.2b` hoặc LLM instruct.

---

## Thứ tự ưu tiên

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 1 | Tóm tắt ngày | Thấp | Cao |
| 2 | Gợi ý mood | Thấp | Trung bình |
| 3 | Auto-tag | Thấp | Trung bình |
| 4 | RAG hỏi đáp | Trung bình | Cao |
| 5 | Writing prompts | Thấp | Thấp |
| 6 | On this day narrative | Thấp | Thấp |
| 7 | Semantic search | Cao | Cao |
| 8 | Tổng kết năm | Trung bình | Trung bình |
| 9 | Dịch note | Thấp | Thấp |
