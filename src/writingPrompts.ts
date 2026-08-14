/** Gợi ý câu hỏi khi note trống, đỡ bí ý — hiện 1 câu ngẫu nhiên, đổi mỗi lần
 * mở Compose (không lưu trạng thái, không cần thiết cho việc này). */
const PROMPTS_VI = [
  "Hôm nay bạn biết ơn điều gì?",
  "Chuyện gì làm bạn cười hôm nay?",
  "Có điều gì đang làm bạn lo lắng không?",
  "Bạn muốn nhớ lại khoảnh khắc nào của hôm nay?",
  "Nếu chỉ được nói 1 câu về hôm nay, đó là gì?",
  "Ai đó đã làm bạn vui hôm nay?",
  "Bạn học được điều gì mới hôm nay?",
];

const PROMPTS_EN = [
  "What are you grateful for today?",
  "What made you laugh today?",
  "Is something on your mind right now?",
  "What moment from today do you want to remember?",
  "If you could say one sentence about today, what would it be?",
  "Who made your day better today?",
  "What did you learn today?",
];

export function randomPrompt(lang: "vi" | "en"): string {
  const list = lang === "vi" ? PROMPTS_VI : PROMPTS_EN;
  return list[Math.floor(Math.random() * list.length)];
}
