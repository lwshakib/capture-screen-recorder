import { useEffect } from "react";

import { useRecorderContext } from "../context";
import Footer from "./Footer";

/**
 * ControlLayout Component
 * Wraps children components with a layout and handles fetching user data if a token exists.
 */
export default function ControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Access the getUser function from global recorder context
  const { getUser } = useRecorderContext();
  // Whenever the component mounts, attempt to fetch user info from the backend using the token on disk
  useEffect(() => {
    const fetchUser = async () => {
      const token = await window.ipcRenderer.invoke("get-token");
      if (token && typeof token === "string") {
        getUser(token);
      }
    };
    fetchUser();
  }, [getUser]);

  return (
    // Main container with full height and rounded corners
    <div className="bg-background flex px-1 flex-col rounded-3xl overflow-hidden h-screen ">
      {/* Scrollable/Flexible content area for children */}
      <div className="flex-1 overflow-hidden flex flex-col">{children}</div>

      {/* Persistence footer (Logo, Logout button, etc.) */}
      <Footer />
    </div>
  );
}
