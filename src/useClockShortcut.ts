import { useEffect, useRef } from "react";

// Space belongs to the clock only when it is not being used to type or
// activate another control. Clock buttons opt in to keydown timing explicitly.
export function useClockShortcut(enabled: boolean, onSpace: () => boolean) {
  const current = useRef({ enabled, onSpace });
  current.current = { enabled, onSpace };
  useEffect(() => {
    let handled = false;
    const keydown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") return;
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        !current.current.enabled
      )
        return;
      const target = event.target instanceof Element ? event.target : null;
      if (
        target?.closest(
          'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]',
        )
      )
        return;
      const control = target?.closest('button,a,summary,[role="button"]');
      if (control && !control.hasAttribute("data-clock-shortcut")) return;
      if (event.repeat) {
        event.preventDefault();
        return;
      }
      if (current.current.onSpace()) {
        event.preventDefault();
        handled = true;
      }
    };
    const keyup = (event: KeyboardEvent) => {
      if ((event.code === "Space" || event.key === " ") && handled) {
        event.preventDefault();
        handled = false;
      }
    };
    const blur = () => {
      handled = false;
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
    };
  }, []);
}
