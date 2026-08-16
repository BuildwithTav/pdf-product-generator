"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface ProjectStep {
  value: string;
  label: string;
}

interface StepsState {
  projectId: string | null;
  projectName: string | null;
  steps: ProjectStep[];
  activeStep: string | null;
  setStep: (value: string) => void;
}

interface StepsRegistration {
  projectId: string;
  projectName: string;
  steps: ProjectStep[];
  activeStep: string;
  setStep: (value: string) => void;
}

const StepsContext = createContext<{
  state: StepsState;
  register: (reg: StepsRegistration | null) => void;
}>({
  state: { projectId: null, projectName: null, steps: [], activeStep: null, setStep: () => {} },
  register: () => {},
});

export function StepsProvider({ children }: { children: React.ReactNode }) {
  const [reg, setReg] = useState<StepsRegistration | null>(null);

  const value = useMemo(
    () => ({
      state: {
        projectId: reg?.projectId ?? null,
        projectName: reg?.projectName ?? null,
        steps: reg?.steps ?? [],
        activeStep: reg?.activeStep ?? null,
        setStep: reg?.setStep ?? (() => {}),
      },
      register: setReg,
    }),
    [reg]
  );

  return <StepsContext.Provider value={value}>{children}</StepsContext.Provider>;
}

export function useSteps() {
  return useContext(StepsContext).state;
}

// Called by ProjectWorkspace to publish its current step list/state to the
// sidebar. Pass null on unmount to clear it.
export function useRegisterSteps(reg: StepsRegistration | null) {
  const { register } = useContext(StepsContext);
  const key = reg ? `${reg.projectId}:${reg.activeStep}:${reg.steps.length}` : "none";

  useEffect(() => {
    register(reg);
    return () => register(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
