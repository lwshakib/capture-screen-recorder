import { useEffect } from "react";
import AuthButton from "./components/AuthButton";
import ControlLayout from "./components/ControlLayout";
import LoadingSkeleton from "./components/LoadingSkeleton";
import MediaConfiguration from "./components/MediaConfiguration";
import { useRecorderContext } from "./context";

export default function App() {
  const { user, isUserLoading } = useRecorderContext();

  useEffect(() => {
    if (!isUserLoading && user) {
      window.ipcRenderer.send("open-studio");
    }
  }, [isUserLoading, user]);

  if (isUserLoading) {
    return (
      <div style={{ userSelect: "none" }}>
        <ControlLayout>
          <LoadingSkeleton />
        </ControlLayout>
      </div>
    );
  }

  return (
    <div style={{ userSelect: "none" }}>
      <ControlLayout>
        {user ? <MediaConfiguration /> : <AuthButton />}
      </ControlLayout>
    </div>
  );
}
