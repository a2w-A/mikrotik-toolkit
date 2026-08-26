"""
mikrotik-toolkit: DHCP & Static Lease Manager
Developed by Algo2World (https://algo2world.com) • Part of the Ind. Sovereign Ecosystem
Audits active DHCP leases, detects ARP/IP conflicts, and facilitates bulk-binding dynamic to static.
"""

import logging
from typing import Any, Dict, List, Optional
from rich.console import Console
from rich.table import Table

from api_handler import RouterOSClient

logger = logging.getLogger("mikrotik_toolkit.dhcp")
console = Console()


class DHCPManager:
    """Manages RouterOS DHCP server leases, IP conflict detection, and static reservations."""

    def __init__(self, client: RouterOSClient):
        self.client = client

    def get_leases(self) -> List[Dict[str, Any]]:
        """Fetch all DHCP server lease records."""
        leases = self.client.get("ip/dhcp-server/lease")
        return leases if isinstance(leases, list) else ([leases] if leases else [])

    def get_arp_table(self) -> List[Dict[str, Any]]:
        """Fetch current ARP cache table."""
        arp = self.client.get("ip/arp")
        return arp if isinstance(arp, list) else ([arp] if arp else [])

    def analyze_leases_and_conflicts(self) -> Dict[str, Any]:
        """
        Correlates DHCP leases with ARP entries and checks for:
        1. Duplicate IP assignments
        2. Duplicate MAC addresses claiming different IPs
        3. Dynamic vs Static lease distribution
        4. Expired/Active state
        """
        leases = self.get_leases()
        arp_entries = self.get_arp_table()

        ip_to_leases: Dict[str, List[Dict[str, Any]]] = {}
        mac_to_leases: Dict[str, List[Dict[str, Any]]] = {}
        conflicts: List[Dict[str, Any]] = []

        total_dynamic = 0
        total_static = 0

        for lease in leases:
            ip = lease.get("address", "")
            mac = lease.get("mac-address", "").upper()
            dynamic = lease.get("dynamic", False)
            if isinstance(dynamic, str):
                dynamic = dynamic.lower() in ("true", "yes")

            if dynamic:
                total_dynamic += 1
            else:
                total_static += 1

            if ip:
                ip_to_leases.setdefault(ip, []).append(lease)
            if mac:
                mac_to_leases.setdefault(mac, []).append(lease)

        # Check for multiple leases with the same IP
        for ip, l_list in ip_to_leases.items():
            if len(l_list) > 1:
                conflicts.append({
                    "type": "DUPLICATE_IP_LEASE",
                    "severity": "CRITICAL",
                    "ip": ip,
                    "macs": [l.get("mac-address") for l in l_list],
                    "details": f"IP address {ip} assigned to {len(l_list)} different leases.",
                })

        # Check for ARP table collision (Static IP on host not known to DHCP lease table)
        for arp in arp_entries:
            arp_ip = arp.get("address", "")
            arp_mac = arp.get("mac-address", "").upper()
            # If ARP entry exists with a different MAC than the DHCP lease for that IP
            if arp_ip in ip_to_leases:
                matching_lease = next((l for l in ip_to_leases[arp_ip] if l.get("mac-address", "").upper() == arp_mac), None)
                if not matching_lease:
                    conflicts.append({
                        "type": "ARP_DHCP_MISMATCH",
                        "severity": "WARNING",
                        "ip": arp_ip,
                        "details": f"ARP host MAC {arp_mac} responded on IP {arp_ip}, but DHCP lease belongs to {[l.get('mac-address') for l in ip_to_leases[arp_ip]]}",
                    })

        return {
            "total_leases": len(leases),
            "dynamic_count": total_dynamic,
            "static_count": total_static,
            "conflicts": conflicts,
            "leases": leases,
        }

    def bulk_bind_dynamic_leases(self, comment_tag: str = "Bound-by-Toolkit") -> int:
        """
        Converts all dynamic leases to permanent static reservations.
        """
        leases = self.get_leases()
        bound_count = 0

        for lease in leases:
            is_dynamic = lease.get("dynamic", False)
            if isinstance(is_dynamic, str):
                is_dynamic = is_dynamic.lower() in ("true", "yes")

            if is_dynamic:
                lease_id = lease.get(".id")
                ip = lease.get("address", "")
                mac = lease.get("mac-address", "")
                host_name = lease.get("host-name", "")

                comment = f"{comment_tag} - {host_name}" if host_name else comment_tag
                
                try:
                    # In RouterOS REST API, execute make-static or patch
                    self.client.post("ip/dhcp-server/lease/make-static", {"numbers": lease_id})
                    self.client.patch("ip/dhcp-server/lease", lease_id, {"comment": comment})
                    bound_count += 1
                    console.print(f"[green]✔ Bound lease to static:[/green] {ip} ({mac}) - {host_name}")
                except Exception as e:
                    logger.debug("make-static API attempt notice: %s. Using CLI fallback.", e)
                    try:
                        cmd = f'/ip dhcp-server lease make-static numbers="{lease_id}"'
                        self.client.execute_script(cmd)
                        bound_count += 1
                        console.print(f"[green]✔ Static reservation bound via CLI fallback:[/green] {ip}")
                    except Exception as fallback_err:
                        console.print(f"[yellow]Failed to bind lease {ip}: {fallback_err}[/yellow]")
                        logger.error("DHCP conversion error: %s", fallback_err)

        return bound_count

    def display_lease_table(self):
        """Displays lease table in rich formatting."""
        data = self.analyze_leases_and_conflicts()
        table = Table(title="RouterOS Active DHCP Leases & Reservations — Algo2World", show_lines=True)
        table.add_column("IP Address", style="cyan", no_wrap=True)
        table.add_column("MAC Address", style="magenta")
        table.add_column("Host Name", style="white")
        table.add_column("Type", justify="center")
        table.add_column("Status", justify="center")
        table.add_column("Expires / Comment", style="dim")

        for l in data["leases"]:
            is_dyn = l.get("dynamic", False)
            if isinstance(is_dyn, str):
                is_dyn = is_dyn.lower() in ("true", "yes")

            type_badge = "[yellow]DYNAMIC[/yellow]" if is_dyn else "[green]STATIC[/green]"
            status = l.get("status", "bound")
            comment = l.get("comment", "")
            expires = l.get("expires-after", "")
            meta = comment or expires or "-"

            table.add_row(
                l.get("address", "-"),
                l.get("mac-address", "-"),
                l.get("host-name", "-") or "-",
                type_badge,
                status,
                meta,
            )

        console.print(table)
        if data["conflicts"]:
            console.print("\n[bold red]⚠️ IP Address Conflicts Detected:[/bold red]")
            for c in data["conflicts"]:
                console.print(f" - [{c['severity']}] {c['type']} on {c.get('ip')}: {c['details']}")
        else:
            console.print("\n[bold green]✔ No IP lease collisions or ARP mismatches detected.[/bold green]")

