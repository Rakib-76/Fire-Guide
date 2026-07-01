import { useEffect } from "react";

export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    let meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute("content") ?? "";
    let created = false;

    if (description) {
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
        created = true;
      }
      meta.setAttribute("content", description);
    }

    return () => {
      document.title = previousTitle;
      if (description && meta) {
        if (created) {
          meta.remove();
        } else {
          meta.setAttribute("content", previousDescription);
        }
      }
    };
  }, [title, description]);
}
