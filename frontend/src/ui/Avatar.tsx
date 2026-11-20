import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { funEmoji } from "@dicebear/collection";

/** Điểm chặn duy nhất cho lib avatar — đổi lib chỉ sửa trong file này. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const dataUri = useMemo(() => createAvatar(funEmoji, { seed: name, size }).toDataUri(), [name, size]);
  return (
    <img
      src={dataUri}
      alt=""
      width={size}
      height={size}
      className="rounded-full bg-surface-muted"
    />
  );
}
