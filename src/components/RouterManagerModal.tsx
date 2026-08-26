import React from "react";
import {
  X,
  Server,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Activity,
  Globe,
  Radio,
  Clock,
  Cpu,
} from "lucide-react";
import { RouterConnection } from "../types";

interface RouterManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  routers: RouterConnection[];
  activeRouterId: string | null;
  onSelectRouter: (id: string) => void;
  onDeleteRouter: (id: string) => void;
  onOpenAddRouter: () => void;
}

export const RouterManagerModal: React.FC<RouterManagerModalProps> = ({
  isOpen,
  onClose,
  routers,
  activeRouterId,
  onSelectRouter,
  onDeleteRouter,
  onOpenAddRouter,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-[#141720] border border-[#2d333d] rounded-lg max-w-2xl w-full p-6 shadow-2xl relative text-[#e1e4ea] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#262b37] mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Managed RouterOS Devices
              </h2>
              <p className="text-xs text-[#858d9d]">
                Select active target or register new MikroTik routers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenAddRouter();
              }}
              className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Router</span>
            </button>
            <button
              onClick={onClose}
              className="text-[#858d9d] hover:text-white p-1 rounded hover:bg-[#222733] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Router List */}
        <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
          {routers.length === 0 ? (
            <div className="py-12 text-center text-[#858d9d]">
              <Server className="w-8 h-8 mx-auto mb-2 text-[#4b5563]" />
              <p className="text-xs">No RouterOS connections registered in database.</p>
              <button
                onClick={() => {
                  onClose();
                  onOpenAddRouter();
                }}
                className="mt-3 py-1.5 px-4 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded text-xs font-bold"
              >
                Register First Router
              </button>
            </div>
          ) : (
            routers.map((router) => {
              const isActive = router.id === activeRouterId;
              return (
                <div
                  key={router.id}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isActive
                      ? "bg-[#171d2b] border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                      : "bg-[#0f1118] border-[#222733] hover:border-[#353e50]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm">{router.name}</span>
                        {isActive && (
                          <span className="text-[9px] font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/40 px-2 py-0.5 rounded">
                            ACTIVE TARGET
                          </span>
                        )}
                        <span className="text-[10px] text-[#717b8c] font-semibold">
                          ({router.protocol.toUpperCase()})
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#9ca3af] mt-2">
                        <div>
                          Host: <strong className="text-white">{router.host}:{router.port}</strong>
                        </div>
                        <div>
                          User: <strong className="text-white">{router.username}</strong>
                        </div>
                        {router.firmware && (
                          <div>
                            ROS: <strong className="text-white">{router.firmware}</strong>
                          </div>
                        )}
                        {router.latency_ms !== undefined && (
                          <div>
                            Latency: <strong className="text-emerald-400">{router.latency_ms}ms</strong>
                          </div>
                        )}
                      </div>

                      {router.error_message && (
                        <div className="mt-2 text-[10px] text-red-400 flex items-center gap-1 bg-red-500/5 p-1.5 rounded border border-red-500/20">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{router.error_message}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isActive && (
                        <button
                          onClick={() => {
                            onSelectRouter(router.id);
                          }}
                          className="py-1.5 px-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded text-xs font-bold transition-colors"
                        >
                          Select
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteRouter(router.id)}
                        className="p-1.5 text-[#6b7280] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete connection"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
