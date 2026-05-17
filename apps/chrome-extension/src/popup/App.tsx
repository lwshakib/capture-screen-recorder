import { useEffect } from "react";
import { useExtensionContext } from "../context/ExtensionContext";
import { Button } from "@workspace/ui/components/button";
import { 
  Loader2, 
  Settings, 
  LogOut, 
  Video, 
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Separator } from "@workspace/ui/components/separator";

/**
 * Minimal Popup App
 * Designed for speed and focus.
 */
export default function App() {
  const { user, status, login, logout, checkAuth } = useExtensionContext();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for auth success from background
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.action === "AUTH_SUCCESS") checkAuth();
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [checkAuth]);

  const toggleRecorder = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.runtime.sendMessage({ action: "TOGGLE" });
      window.close(); // Close popup after toggling
    }
  };

  return (
    <div className="w-[320px] bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Video className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">Capture</h1>
        </div>
        <button className="h-8 w-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors text-muted-foreground">
          <Settings className="h-4 w-4" />
        </button>
      </div>

      <div className="px-5 pb-6 space-y-5">
        {status === "loading" ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Syncing...</span>
          </div>
        ) : user ? (
          <>
            {/* Minimal User Bar */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-accent/30 border border-border/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 border border-background">
                  <AvatarImage src={user.image} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col leading-none">
                  <span className="text-xs font-bold truncate max-w-[120px]">{user.name}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <ShieldCheck className="h-2.5 w-2.5 text-green-500" />
                    <span className="text-[9px] uppercase font-black tracking-tighter text-muted-foreground/70">Verified</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={logout}
                className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors text-muted-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Primary Action */}
            <Button 
              onClick={toggleRecorder}
              className="w-full h-12 rounded-2xl font-bold shadow-xl shadow-primary/15 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              Open Recorder UI
            </Button>
          </>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="text-center space-y-1.5 px-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Unlock professional recording features by signing in to your account.
              </p>
            </div>
            <Button 
              onClick={login}
              className="w-full h-11 rounded-2xl font-bold bg-primary hover:opacity-90 transition-opacity"
            >
              Sign In to Start
            </Button>
          </div>
        )}

        <Separator className="opacity-40" />

        <div className="flex items-center justify-between">
          <a 
            href="#" 
            className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            Go to Dashboard <ExternalLink className="h-2.5 w-2.5" />
          </a>
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
