import { Camera, Mic, PenLine, Video } from "lucide-react";
import type { NoteType } from "../shared/notes";

/** Icon đại diện từng loại note trong danh sách (Lịch, Dòng thời gian). */
export const NOTE_TYPE_ICON: Record<NoteType, typeof PenLine> = {
  text: PenLine,
  audio: Mic,
  photo: Camera,
  video: Video,
};
