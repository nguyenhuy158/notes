import type { ReactNode } from "react";

/**
 * Định dạng chữ tối giản — KHÔNG phải editor WYSIWYG, người dùng tự gõ cú
 * pháp (`**đậm**`, `*nghiêng*`, dòng bắt đầu `- ` thành gạch đầu dòng) trong
 * textarea thường, chỉ phần HIỂN THỊ (không phải lúc đang sửa) mới render ra
 * đậm/nghiêng/list. Cố tình không dùng lib markdown đầy đủ (react-markdown...)
 * cho vài note ngắn — regex nhỏ là đủ.
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={`${keyPrefix}-${i}`}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export function renderLite(text: string): ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const bullet = /^[-*]\s+(.*)/.exec(line);
    if (bullet) {
      return (
        <span key={i} className="flex gap-1.5">
          <span className="text-fg-muted">•</span>
          <span>{renderInline(bullet[1], String(i))}</span>
        </span>
      );
    }
    return (
      <span key={i}>
        {renderInline(line, String(i))}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}
