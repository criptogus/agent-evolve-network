import { useCallback, useEffect, useState } from "react";
import {
  PROJECT_PROFILE_STORAGE_KEY,
  isProjectType,
  type ProjectType,
} from "@/lib/marketplace/project-profile";

/**
 * Persisted answer to the onboarding question "what are you building?".
 * Reads after mount so SSR and hydration stay identical.
 */
export function useProjectType() {
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PROJECT_PROFILE_STORAGE_KEY);
      if (isProjectType(stored)) setProjectType(stored);
    } catch {
      // private mode / blocked storage: fall back to no profile
    }
    setHydrated(true);
  }, []);

  const choose = useCallback((next: ProjectType | null) => {
    setProjectType(next);
    try {
      if (next) window.localStorage.setItem(PROJECT_PROFILE_STORAGE_KEY, next);
      else window.localStorage.removeItem(PROJECT_PROFILE_STORAGE_KEY);
    } catch {
      // ignore write failures
    }
  }, []);

  return { projectType, setProjectType: choose, hydrated };
}
