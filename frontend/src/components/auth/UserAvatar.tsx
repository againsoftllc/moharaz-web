import type { User } from "./AuthProvider";

/** The account's photo when one is uploaded, otherwise the first letter of the name. */
export default function UserAvatar({ user, className = "" }: { user: User; className?: string }) {
  return (
    <span className={`avatar ${className}`}>
      {user.avatar
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={user.avatar} alt="" />
        : user.name[0]?.toUpperCase()}
    </span>
  );
}

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Reads a picked image, centre-crops it square and scales it to `size` px as a JPEG data URL,
 * so the photo stays small enough to keep in localStorage with the rest of the demo session.
 */
export function toAvatar(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Please choose an image file (JPG, PNG or WebP)."));
    if (file.size > MAX_BYTES) return reject(new Error("Image is too large — maximum 5 MB."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); return reject(new Error("Couldn't process that image.")); }
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read that image.")); };
    img.src = url;
  });
}
