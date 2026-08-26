"""
mikrotik-toolkit: Security Hardening & Vulnerability Auditor
Developed by Algo2World (https://algo2world.com) • Part of the Ind. Sovereign Ecosystem
Performs comprehensive RouterOS v7 security posture assessment,
firewall rule audits, open resolver detection, and generates 1-click remediation scripts.
"""

import logging
from typing import Any, Dict, List, Optional
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from api_handler import RouterOSClient

logger = logging.getLogger("mikrotik_toolkit.audit")
console = Console()


class AuditResult:
    """Represents a single security audit check result and score impact."""
    def __init__(
        self,
        category: str,
        name: str,
        status: str,  # PASS, WARN, FAIL, INFO
        score_impact: int,
        details: str,
        remediation_cmd: Optional[str] = None,
    ):
        self.category = category
        self.name = name
        self.status = status
        self.score_impact = score_impact
        self.details = details
        self.remediation_cmd = remediation_cmd


class SecurityAuditor:
    """Enterprise security auditor for MikroTik RouterOS v7."""

    def __init__(self, client: RouterOSClient):
        self.client = client
        self.findings: List[AuditResult] = []
        self.identity = "MikroTik"
        self.ros_version = "7.x"

    def run_full_audit(self) -> Dict[str, Any]:
        """Runs the complete suite of RouterOS security audits."""
        self.findings = []
        
        try:
            self.identity = self.client.get_system_identity()
            resource = self.client.get_system_resource()
            self.ros_version = resource.get("version", "v7.x")
        except Exception as e:
            logger.debug("Identity fetch exception during audit init: %s", e)

        self._audit_ip_services()
        self._audit_winbox_security()
        self._audit_dns_resolver()
        self._audit_firewall_filters()
        self._audit_default_users()
        self._audit_mac_services_and_discovery()
        self._audit_snmp_security()

        # Calculate final score out of 100
        total_deductions = sum(f.score_impact for f in self.findings if f.status in ("FAIL", "WARN"))
        score = max(0, min(100, 100 - total_deductions))

        if score >= 90:
            posture = "Hardened (Grade A)"
            color = "green"
        elif score >= 75:
            posture = "Moderate (Grade B)"
            color = "blue"
        elif score >= 55:
            posture = "Vulnerable (Grade C)"
            color = "yellow"
        else:
            posture = "Critical Risk (Grade F)"
            color = "red"

        return {
            "identity": self.identity,
            "version": self.ros_version,
            "score": score,
            "posture": posture,
            "color": color,
            "findings": self.findings,
            "remediation_script": self.generate_remediation_script(),
        }

    def _audit_ip_services(self):
        """Audits plain-text management services (Telnet, FTP, HTTP, plain API)."""
        try:
            services = self.client.get("ip/service")
            if not isinstance(services, list):
                services = [services] if services else []
        except Exception as e:
            self.findings.append(
                AuditResult("Management Services", "IP Service Query", "WARN", 5, f"Could not query IP services: {e}")
            )
            return

        insecure_services = {"telnet": 15, "ftp": 15, "www": 10, "api": 10}

        for svc in services:
            name = svc.get("name", "")
            disabled = svc.get("disabled", False)
            if isinstance(disabled, str):
                disabled = disabled.lower() in ("true", "yes")

            port = svc.get("port", "")
            address = svc.get("address", "")

            if name in insecure_services:
                impact = insecure_services[name]
                if not disabled:
                    if address:
                        self.findings.append(
                            AuditResult(
                                "Management Services",
                                f"Insecure Service: {name.upper()}",
                                "WARN",
                                impact // 2,
                                f"Service {name} on port {port} is enabled, but constrained to CIDR [{address}].",
                                f"/ip service disable {name}",
                            )
                        )
                    else:
                        self.findings.append(
                            AuditResult(
                                "Management Services",
                                f"Insecure Service: {name.upper()}",
                                "FAIL",
                                impact,
                                f"Plain-text management service '{name}' is ENABLED on default port {port} with unrestricted access (0.0.0.0/0).",
                                f"/ip service disable {name}",
                            )
                        )
                else:
                    self.findings.append(
                        AuditResult(
                            "Management Services",
                            f"Insecure Service: {name.upper()}",
                            "PASS",
                            0,
                            f"Legacy plain-text service '{name}' is properly disabled.",
                        )
                    )

    def _audit_winbox_security(self):
        """Audits Winbox service port and access subnet ACLs."""
        try:
            services = self.client.get("ip/service")
            if not isinstance(services, list):
                services = [services] if services else []
            winbox = next((s for s in services if s.get("name") == "winbox"), None)
            
            if not winbox:
                return

            disabled = winbox.get("disabled", False)
            if isinstance(disabled, str):
                disabled = disabled.lower() in ("true", "yes")

            port = str(winbox.get("port", "8291"))
            address = winbox.get("address", "")

            if not disabled:
                if port == "8291" and not address:
                    self.findings.append(
                        AuditResult(
                            "Winbox Security",
                            "Winbox Exposure",
                            "FAIL",
                            15,
                            "Winbox is active on standard port 8291 without IP restriction list ('address'). Vulnerable to automated bot scanners.",
                            '/ip service set winbox port=58291 address="192.168.0.0/16,10.0.0.0/8"',
                        )
                    )
                elif not address:
                    self.findings.append(
                        AuditResult(
                            "Winbox Security",
                            "Winbox IP ACL",
                            "WARN",
                            8,
                            f"Winbox moved to custom port {port}, but has no subnet address restrictions configured.",
                            '/ip service set winbox address="192.168.0.0/16,10.0.0.0/8"',
                        )
                    )
                else:
                    self.findings.append(
                        AuditResult(
                            "Winbox Security",
                            "Winbox Hardening",
                            "PASS",
                            0,
                            f"Winbox is secured on port {port} with restricted address filter: [{address}].",
                        )
                    )
        except Exception as e:
            logger.debug("Winbox audit exception: %s", e)

    def _audit_dns_resolver(self):
        """Detects whether the router acts as an open recursive DNS resolver to the internet."""
        try:
            dns_settings = self.client.get("ip/dns")
            if isinstance(dns_settings, list) and dns_settings:
                dns_settings = dns_settings[0]

            allow_remote = dns_settings.get("allow-remote-requests", False)
            if isinstance(allow_remote, str):
                allow_remote = allow_remote.lower() in ("true", "yes")

            if allow_remote:
                # Check if firewall drops UDP/TCP 53 on WAN
                filters = self.client.get("ip/firewall/filter")
                if not isinstance(filters, list):
                    filters = [filters] if filters else []

                has_dns_drop = any(
                    f.get("chain") == "input"
                    and f.get("action") == "drop"
                    and str(f.get("dst-port")) in ("53", "53,53")
                    and (not f.get("disabled") or f.get("disabled") == "false")
                    for f in filters
                )

                if not has_dns_drop:
                    self.findings.append(
                        AuditResult(
                            "DNS Security",
                            "Open DNS Recursive Resolver",
                            "FAIL",
                            25,
                            "CRITICAL: 'allow-remote-requests=yes' is enabled WITHOUT an input drop rule for port 53 on WAN. "
                            "Device can be abused for massive DNS Amplification DDoS attacks.",
                            "/ip firewall filter add chain=input action=drop protocol=udp dst-port=53 in-interface-list=WAN comment=\"defconf: drop DNS from WAN\"\n"
                            "/ip firewall filter add chain=input action=drop protocol=tcp dst-port=53 in-interface-list=WAN comment=\"defconf: drop DNS TCP from WAN\"",
                        )
                    )
                else:
                    self.findings.append(
                        AuditResult(
                            "DNS Security",
                            "DNS Remote Requests",
                            "PASS",
                            0,
                            "Remote DNS queries enabled for LAN clients with active WAN firewall drop filters on port 53.",
                        )
                    )
            else:
                self.findings.append(
                    AuditResult(
                        "DNS Security",
                        "DNS Remote Requests",
                        "PASS",
                        0,
                        "Remote DNS requests disabled ('allow-remote-requests=no'). Router does not serve DNS to clients.",
                    )
                )
        except Exception as e:
            logger.debug("DNS audit exception: %s", e)

    def _audit_firewall_filters(self):
        """Audits essential RouterOS stateful firewall drop rules (drop invalid in input and forward)."""
        try:
            filters = self.client.get("ip/firewall/filter")
            if not isinstance(filters, list):
                filters = [filters] if filters else []

            has_drop_invalid_input = False
            has_drop_invalid_forward = False
            has_fasttrack = False

            for rule in filters:
                chain = rule.get("chain", "")
                action = rule.get("action", "")
                conn_state = rule.get("connection-state", "")
                disabled = rule.get("disabled", False)
                if isinstance(disabled, str):
                    disabled = disabled.lower() in ("true", "yes")

                if disabled:
                    continue

                if chain == "input" and action == "drop" and "invalid" in conn_state:
                    has_drop_invalid_input = True
                if chain == "forward" and action == "drop" and "invalid" in conn_state:
                    has_drop_invalid_forward = True
                if chain == "forward" and action == "fasttrack-connection":
                    has_fasttrack = True

            if not has_drop_invalid_input:
                self.findings.append(
                    AuditResult(
                        "Firewall Architecture",
                        "Input Chain: Drop Invalid Packets",
                        "FAIL",
                        15,
                        "Missing firewall rule to drop invalid connection states in 'input' chain.",
                        '/ip firewall filter add chain=input action=drop connection-state=invalid comment="defconf: drop invalid packets"',
                    )
                )
            else:
                self.findings.append(
                    AuditResult(
                        "Firewall Architecture",
                        "Input Chain: Drop Invalid Packets",
                        "PASS",
                        0,
                        "Input chain properly drops invalid connection state packets.",
                    )
                )

            if not has_drop_invalid_forward:
                self.findings.append(
                    AuditResult(
                        "Firewall Architecture",
                        "Forward Chain: Drop Invalid Packets",
                        "WARN",
                        10,
                        "Missing firewall rule to drop invalid connection states in 'forward' chain.",
                        '/ip firewall filter add chain=forward action=drop connection-state=invalid comment="defconf: drop invalid forward packets"',
                    )
                )
            else:
                self.findings.append(
                    AuditResult(
                        "Firewall Architecture",
                        "Forward Chain: Drop Invalid Packets",
                        "PASS",
                        0,
                        "Forward chain properly drops invalid connection state packets.",
                    )
                )

            if not has_fasttrack:
                self.findings.append(
                    AuditResult(
                        "Firewall Architecture",
                        "FastTrack Hardware Offload",
                        "INFO",
                        0,
                        "FastTrack rule not detected in forward chain (normal for VPN concentrators and QoS routers).",
                    )
                )
        except Exception as e:
            logger.debug("Firewall filter audit exception: %s", e)

    def _audit_default_users(self):
        """Checks for default 'admin' user or weak administrative setups."""
        try:
            users = self.client.get("user")
            if not isinstance(users, list):
                users = [users] if users else []

            admin_user = next((u for u in users if u.get("name") == "admin"), None)
            if admin_user:
                group = admin_user.get("group", "")
                self.findings.append(
                    AuditResult(
                        "Identity & Access Management",
                        "Default 'admin' Username",
                        "WARN",
                        10,
                        f"Default 'admin' user exists in '{group}' group. Renaming or creating a custom superuser mitigates dictionary attacks.",
                        '/user add name="netadmin_ops" group=full password="[SECURE_STRONG_PASSWORD]"\n/user disable admin',
                    )
                )
            else:
                self.findings.append(
                    AuditResult(
                        "Identity & Access Management",
                        "Default 'admin' Username",
                        "PASS",
                        0,
                        "Default 'admin' user has been removed or renamed.",
                    )
                )
        except Exception as e:
            logger.debug("User audit exception: %s", e)

    def _audit_mac_services_and_discovery(self):
        """Audits MAC-Winbox, MAC-Telnet, and Neighbor Discovery exposure on WAN."""
        try:
            disc = self.client.get("ip/neighbor/discovery-settings")
            if isinstance(disc, list) and disc:
                disc = disc[0]
            
            disc_interface = disc.get("discover-interface-list", "all") if isinstance(disc, dict) else "all"
            if disc_interface in ("all", "!none", ""):
                self.findings.append(
                    AuditResult(
                        "Discovery & Layer-2 Services",
                        "MNDP / CDP Neighbor Discovery",
                        "WARN",
                        8,
                        f"Neighbor discovery is broadcasting on '{disc_interface}'. Should be restricted to 'LAN' or 'none'.",
                        "/ip neighbor discovery-settings set discover-interface-list=LAN",
                    )
                )
            else:
                self.findings.append(
                    AuditResult(
                        "Discovery & Layer-2 Services",
                        "MNDP Neighbor Discovery",
                        "PASS",
                        0,
                        f"Neighbor discovery restricted to interface list: [{disc_interface}].",
                    )
                )
        except Exception as e:
            logger.debug("Neighbor discovery audit exception: %s", e)

    def _audit_snmp_security(self):
        """Audits SNMP default community strings (public/private)."""
        try:
            snmp = self.client.get("snmp")
            if isinstance(snmp, list) and snmp:
                snmp = snmp[0]
            
            enabled = snmp.get("enabled", False) if isinstance(snmp, dict) else False
            if isinstance(enabled, str):
                enabled = enabled.lower() in ("true", "yes")

            if enabled:
                communities = self.client.get("snmp/community")
                if not isinstance(communities, list):
                    communities = [communities] if communities else []

                has_default_public = any(c.get("name") == "public" for c in communities)
                if has_default_public:
                    self.findings.append(
                        AuditResult(
                            "SNMP & Telemetry",
                            "Default 'public' SNMP Community",
                            "FAIL",
                            15,
                            "SNMP is enabled with default 'public' community string. Network topology and interfaces can be probed.",
                            '/snmp community set [find name="public"] name="snmp_v2c_secure_hash" addresses=192.168.10.0/24',
                        )
                    )
        except Exception as e:
            logger.debug("SNMP audit exception: %s", e)

    def generate_remediation_script(self) -> str:
        """Generates an executable RouterOS .rsc script with all needed fixes."""
        remediations = [f.remediation_cmd for f in self.findings if f.remediation_cmd]
        
        script = (
            f"# =========================================================\n"
            f"# MIKROTIK-TOOLKIT AUTO-GENERATED HARDENING REMEDIATION RSC\n"
            f"# Developed by Algo2World (https://algo2world.com)\n"
            f"# Target Device: {self.identity} ({self.client.host})\n"
            f"# RouterOS Version: {self.ros_version}\n"
            f"# =========================================================\n\n"
        )

        if not remediations:
            script += "# Congratulations! No high or medium vulnerabilities found. Device is hardened.\n"
            return script

        for i, cmd in enumerate(remediations, 1):
            script += f"# Hardening Fix {i}\n{cmd}\n\n"

        return script

    def display_terminal_summary(self, audit_data: Dict[str, Any]):
        """Prints a rich tabular report to stdout."""
        table = Table(title=f"Security Posture Report: {audit_data['identity']} ({self.client.host})", show_lines=True)
        table.add_column("Category", style="cyan", no_wrap=True)
        table.add_column("Check / Control", style="white")
        table.add_column("Status", justify="center")
        table.add_column("Severity / Details", style="dim")

        for f in audit_data["findings"]:
            if f.status == "PASS":
                status_str = "[bold green]PASS[/bold green]"
            elif f.status == "WARN":
                status_str = f"[bold yellow]WARN (-{f.score_impact})[/bold yellow]"
            elif f.status == "FAIL":
                status_str = f"[bold red]FAIL (-{f.score_impact})[/bold red]"
            else:
                status_str = "[blue]INFO[/blue]"

            table.add_row(f.category, f.name, status_str, f.details)

        console.print(table)
        console.print(
            Panel(
                f"[bold]Hardening Score:[/bold] [{audit_data['color']}]{audit_data['score']}/100[/{audit_data['color']}] — [bold {audit_data['color']}]{audit_data['posture']}[/bold {audit_data['color']}]",
                title="Audit Assessment Summary — Algo2World Security Engine",
            )
        )
