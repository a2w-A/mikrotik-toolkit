export interface User {
  id: number;
  username: string;
  is_first_login: boolean;
}

export type UserProfile = User;

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  requiresPasswordChange: boolean;
}

export interface RouterConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: "rest" | "api";
  username: string;
  verify_ssl: boolean;
  is_active: boolean;
  status: "connected" | "disconnected" | "error" | "untested";
  last_checked?: string;
  latency_ms?: number;
  firmware?: string;
  model?: string;
  uptime?: string;
  cpu_load?: number;
  error_message?: string;
}

export interface AuditFinding {
  category: string;
  check: string;
  status: "PASS" | "WARN" | "FAIL" | "INFO";
  deduction: number;
  details: string;
  remediation?: string;
}

export interface DhcpLease {
  id: string;
  address: string;
  mac: string;
  host: string;
  dynamic: boolean;
  status: string;
  expires: string;
  server?: string;
  comment?: string;
}

export interface WireGuardPeer {
  id: string;
  interface: string;
  public_key: string;
  allowed_address: string;
  endpoint: string;
  last_handshake: string;
  rx_human: string;
  tx_human: string;
  comment: string;
  is_stale: boolean;
}

export interface WireGuardInterface {
  id: string;
  name: string;
  listen_port: number;
  public_key: string;
  running: boolean;
  disabled: boolean;
}

export interface LiveBackupItem {
  id: string;
  name: string;
  type: "binary_backup" | "sanitized_rsc";
  size: string;
  created_at: string;
  host: string;
  download_url?: string;
  raw_content?: string;
}

export interface LiveRouterStatus {
  connected: boolean;
  router_info?: RouterConnection;
  identity: string;
  host: string;
  version: string;
  model: string;
  board_name?: string;
  architecture: string;
  cpu: string;
  cpu_count?: number;
  cpu_load: number;
  memory_total_bytes?: number;
  memory_free_bytes?: number;
  memory_free: string;
  hdd_total_bytes?: number;
  hdd_free_bytes?: number;
  hdd_free: string;
  uptime: string;
  score: number;
  posture: string;
  findings: AuditFinding[];
  dhcp_leases: DhcpLease[];
  wireguard_peers: WireGuardPeer[];
  wireguard_interfaces?: WireGuardInterface[];
}

export interface ToolkitFile {
  name: string;
  language: string;
  content: string;
  exists: boolean;
}

export interface CommandExecutionResult {
  command: string;
  timestamp: string;
  status: "success" | "error";
  output: string;
  execution_time_ms: number;
}
