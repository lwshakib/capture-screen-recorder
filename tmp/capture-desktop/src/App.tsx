import { useEffect } from "react";
import AuthButton from "./components/AuthButton";
import ControlLayout from "./components/ControlLayout";
import LoadingSkeleton from "./components/LoadingSkeleton";
import MediaConfiguration from "./components/MediaConfiguration";
import { useRecorderContext } from "./context";

export default function App() {
  // Get user state from global context
  const { user, isUserLoading } = useRecorderContext();

  // Effect: Automatically open the simplified Studio recording controls
  // once the user is successfully logged in and loaded.
  useEffect(() => {
    if (!isUserLoading && user) {
      window.ipcRenderer.send("open-studio");
    }
  }, [isUserLoading, user]);

  // Loading state
  if (isUserLoading) {
    return (
      <div style={{ userSelect: "none" }}>
        <ControlLayout>
          <LoadingSkeleton />
        </ControlLayout>
      </div>
    );
  }

  // Main Render:
  // If user is logged in -> Show Media Configuration (Source/Mic selection)
  // If user is logged out -> Show Login Button
  return (
    <div style={{ userSelect: "none" }}>
      <ControlLayout>
        {user ? <MediaConfiguration /> : <AuthButton />}
      </ControlLayout>
    </div>
  );
}
