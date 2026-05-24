import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

/**
 * Custom hook for navigation with scroll to top
 */
export function useNavigation() {
  const navigate = useNavigate();

  const navigateTo = (path: string) => {
    navigate(path);
    // Scroll to top after navigation
    window.scrollTo(0, 0);
  };

  return { navigateTo, navigate };
}

/**
 * Hook to scroll to top on route change
 */
export function useScrollToTop() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
}

