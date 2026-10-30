"use client";

import { useEffect } from "react";

/** The kit's components get their behaviour from DOM-level init scripts, which React doesn't run. */
export function DesignKitInit() {
  useEffect(() => {
    const init = async () => {
      const { initAll } = await import("govuk-frontend");
      const { initAllIAIDesignSystem } = await import("@i-dot-ai-npm/component-library-frontend");
      initAll();
      initAllIAIDesignSystem();
    };
    init();
  }, []);

  return null;
}
