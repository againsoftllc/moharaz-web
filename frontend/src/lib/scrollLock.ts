/* Page scroll lock for overlays (cart drawer, modals, the compare sheet).
   Hiding the scrollbar widens the page by its width, which made everything jump sideways when an
   overlay opened. The lock pads that width back (see `html.scroll-locked` in globals.css), and it is
   counted so stacked overlays — the cart drawer opened from the compare sheet — unlock in order. */

let locks = 0;

/** Locks page scrolling; call the returned function to release it. */
export function lockScroll() {
  const html = document.documentElement;
  if (locks++ === 0) {
    html.style.setProperty("--sbw", `${window.innerWidth - html.clientWidth}px`);
    html.classList.add("scroll-locked");
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) {
      html.classList.remove("scroll-locked");
      html.style.removeProperty("--sbw");
    }
  };
}
