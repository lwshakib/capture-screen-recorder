import { useLocalStorage } from "@uidotdev/usehooks";
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
  // Retrieve the auth token from local storage
  const [token] = useLocalStorage<string | null>("auth-token-v2", null);

  // Whenever the token changes, attempt to fetch user info from the backend
  useEffect(() => {
    if (token) {
      getUser(token);
    }
  }, [token, getUser]);

  return (
    // Main container with full height and rounded corners
    <div className="bg-background flex px-1 flex-col rounded-3xl overflow-hidden h-screen ">
      {/* Scrollable/Flexible content area for children */}
      <div className="flex-1">{children}</div>

      {/* Persistence footer (Logo, Logout button, etc.) */}
      <Footer />
    </div>
  );
}
