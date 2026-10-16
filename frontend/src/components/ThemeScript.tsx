"use client";

/* Re-applies a saved light/dark choice before first paint. The script is only in the server HTML, where the
   browser runs it while parsing <head>: rendered on the client too, React 19 warns "Encountered a script tag"
   (it never runs scripts it renders), and next/script's beforeInteractive runs only after the bundle loads,
   which flashes the dark theme. Hydration skips the extra tag in <head>. */
export default function ThemeScript() {
  if (typeof window !== "undefined") return null;
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `try{var t=localStorage.getItem("ut-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`,
      }}
    />
  );
}
