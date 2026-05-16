"use client";

import { useEffect } from "react";
import { Session, useCaptureStore } from "@/context";

export function SessionProvider({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  const setSession = useCaptureStore((state) => state.setSession);

  useEffect(() => {
    setSession(session);
  }, [session, setSession]);

  return <>{children}</>;
}
