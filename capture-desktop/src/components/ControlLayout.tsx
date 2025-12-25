import { useLocalStorage } from "@uidotdev/usehooks";
import { useEffect } from "react";

import { useRecorderContext } from "../context";
import Footer from "./Footer";

export default function ControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getUser } = useRecorderContext();
  const [token] = useLocalStorage<string | null>("auth-token-v2", null);

  useEffect(() => {
    if (token) {
      getUser(token);
    }
  }, [token, getUser]);

  return (
    <div className="bg-background flex px-1 flex-col rounded-3xl overflow-hidden h-screen ">
      <div className="flex-1">{children}</div>

      <Footer />
    </div>
  );
}
