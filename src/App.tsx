import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { LoginView } from "./components/LoginView";
import { FirstLoginModal } from "./components/FirstLoginModal";
import { RouterSetupModal } from "./components/RouterSetupModal";
import { RouterManagerModal } from "./components/RouterManagerModal";
import { SecurityAuditTab } from "./components/SecurityAuditTab";
import { WireGuardTab } from "./components/WireGuardTab";
import { DhcpTab } from "./components/DhcpTab";
import { BackupTab } from "./components/BackupTab";
import { TerminalTab } from "./components/TerminalTab";
import { CodeExplorerTab } from "./components/CodeExplorerTab";
import { RemediationModal } from "./components/RemediationModal";
import { ScriptBuilderModal } from "./components/ScriptBuilderModal";
import { Footer } from "./components/Footer";
import { LiveRouterStatus, RouterConnection, UserProfile } from "./types";

export default function App() {
  // Authentication State
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("mikrotik_jwt"));
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Router Management State
  const [routers, setRouters] = useState<RouterConnection[]>([]);
  const [activeRouterId, setActiveRouterId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveRouterStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // UI Navigation & Modals
  const [activeTab, setActiveTab] = useState<string>("audit");
  const [isAddRouterOpen, setIsAddRouterOpen] = useState<boolean>(false);
  const [isRouterManagerOpen, setIsRouterManagerOpen] = useState<boolean>(false);
  const [isRemediationOpen, setIsRemediationOpen] = useState<boolean>(false);
  const [isScriptBuilderOpen, setIsScriptBuilderOpen] = useState<boolean>(false);

  // 1. Verify Auth on Load
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("mikrotik_jwt");
      if (!storedToken) {
        setToken(null);
        setCurrentUser(null);
        setAuthChecking(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setToken(storedToken);
          setCurrentUser(data.user);
          setRequiresPasswordChange(Boolean(data.requiresPasswordChange));
        } else {
          localStorage.removeItem("mikrotik_jwt");
          setToken(null);
          setCurrentUser(null);
        }
      } catch {
        localStorage.removeItem("mikrotik_jwt");
        setToken(null);
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, []);

  // 2. Fetch Routers List when Authenticated
  const fetchRouters = async (jwtToken: string) => {
    try {
      const res = await fetch("/api/routers", {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRouters(data.routers || []);
        if (data.active_router_id) {
          setActiveRouterId(data.active_router_id);
        } else if (data.routers && data.routers.length > 0) {
          setActiveRouterId(data.routers[0].id);
        } else {
          setActiveRouterId(null);
        }
      }
    } catch (err) {
      console.error("Failed to load routers:", err);
    }
  };

  // 3. Fetch Live Status for Active Router
  const fetchLiveStatus = async (jwtToken: string) => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/routeros/status", {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLiveStatus(data.status);
      } else {
        setLiveStatus(null);
      }
    } catch (err) {
      console.error("Failed to fetch live status:", err);
      setLiveStatus(null);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (token && !requiresPasswordChange) {
      fetchRouters(token);
    }
  }, [token, requiresPasswordChange]);

  useEffect(() => {
    if (token && !requiresPasswordChange) {
      fetchLiveStatus(token);
    }
  }, [token, activeRouterId, requiresPasswordChange]);

  // Auth Handlers
  const handleLoginSuccess = (
    newToken: string,
    user: UserProfile,
    mustChangePassword: boolean
  ) => {
    localStorage.setItem("mikrotik_jwt", newToken);
    setToken(newToken);
    setCurrentUser(user);
    setRequiresPasswordChange(mustChangePassword);
  };

  const handlePasswordChanged = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    setRequiresPasswordChange(false);
    if (token) {
      fetchRouters(token);
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error("Logout err:", err);
      }
    }
    localStorage.removeItem("mikrotik_jwt");
    setToken(null);
    setCurrentUser(null);
    setLiveStatus(null);
    setRouters([]);
    setActiveRouterId(null);
  };

  const handleSelectRouter = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch("/api/routers/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ routerId: id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveRouterId(id);
        fetchLiveStatus(token);
      }
    } catch (err) {
      console.error("Failed to activate router:", err);
    }
  };

  const handleDeleteRouter = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/routers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchRouters(token);
      }
    } catch (err) {
      console.error("Failed to delete router:", err);
    }
  };

  const handleRouterAdded = (newRouter: RouterConnection) => {
    if (!token) return;
    fetchRouters(token);
    setActiveRouterId(newRouter.id);
  };

  // If initial auth check is ongoing
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#0d0f14] flex flex-col items-center justify-center font-mono text-[#858d9d]">
        <div className="flex items-center space-x-3 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
          <span className="text-sm font-bold text-white tracking-tight">mikrotik-toolkit</span>
        </div>
        <p className="text-xs">Initializing local secure database & session...</p>
      </div>
    );
  }

  // If Not Authenticated -> Render Login View
  if (!token || !currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#d1d5db] flex flex-col font-mono selection:bg-blue-500/30 selection:text-white">
      {/* Mandatory First-Login Password Change Modal */}
      {requiresPasswordChange && (
        <FirstLoginModal
          token={token}
          onPasswordChanged={handlePasswordChanged}
        />
      )}

      {/* Top Header */}
      <Header
        status={liveStatus}
        routers={routers}
        activeRouterId={activeRouterId}
        onSelectRouter={handleSelectRouter}
        onRefresh={() => fetchLiveStatus(token)}
        isRefreshing={isRefreshing}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenRemediation={() => setIsRemediationOpen(true)}
        onOpenScriptBuilder={() => setIsScriptBuilderOpen(true)}
        onOpenAddRouter={() => setIsAddRouterOpen(true)}
        onOpenRouterManager={() => setIsRouterManagerOpen(true)}
        onLogout={handleLogout}
        username={currentUser.username}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 lg:px-6 py-5">
        {activeTab === "audit" && (
          <SecurityAuditTab
            status={liveStatus}
            onOpenRemediation={() => setIsRemediationOpen(true)}
            onOpenScriptBuilder={() => setIsScriptBuilderOpen(true)}
            onOpenAddRouter={() => setIsAddRouterOpen(true)}
          />
        )}

        {activeTab === "dhcp" && (
          <DhcpTab
            status={liveStatus}
            token={token}
            onOpenAddRouter={() => setIsAddRouterOpen(true)}
          />
        )}

        {activeTab === "wireguard" && (
          <WireGuardTab
            status={liveStatus}
            token={token}
            onOpenAddRouter={() => setIsAddRouterOpen(true)}
          />
        )}

        {activeTab === "backup" && (
          <BackupTab
            status={liveStatus}
            token={token}
            onOpenAddRouter={() => setIsAddRouterOpen(true)}
          />
        )}

        {activeTab === "terminal" && (
          <TerminalTab
            status={liveStatus}
            token={token}
            onOpenAddRouter={() => setIsAddRouterOpen(true)}
          />
        )}

        {activeTab === "code" && <CodeExplorerTab />}
      </main>

      {/* Modals */}
      <RouterSetupModal
        token={token}
        isOpen={isAddRouterOpen}
        onClose={() => setIsAddRouterOpen(false)}
        onRouterAdded={handleRouterAdded}
      />

      <RouterManagerModal
        isOpen={isRouterManagerOpen}
        onClose={() => setIsRouterManagerOpen(false)}
        routers={routers}
        activeRouterId={activeRouterId}
        onSelectRouter={handleSelectRouter}
        onDeleteRouter={handleDeleteRouter}
        onOpenAddRouter={() => setIsAddRouterOpen(true)}
      />

      <RemediationModal
        isOpen={isRemediationOpen}
        onClose={() => setIsRemediationOpen(false)}
        status={liveStatus}
        token={token}
        onRemediated={() => fetchLiveStatus(token)}
      />

      <ScriptBuilderModal
        isOpen={isScriptBuilderOpen}
        onClose={() => setIsScriptBuilderOpen(false)}
        status={liveStatus}
      />

      {/* Corporate Ecosystem Footer */}
      <Footer />
    </div>
  );
}
