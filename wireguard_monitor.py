"""
mikrotik-toolkit: WireGuard & VPN Interface Monitor
Developed by Algo2World (https://algo2world.com) • Part of the Ind. Sovereign Ecosystem
Audits RouterOS v7 WireGuard interfaces, peer handshakes, bandwidth transfer, and prunes stale peers.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from rich.console import Console
from rich.table import Table

from api_handler import RouterOSClient

logger = logging.getLogger("mikrotik_toolkit.wireguard")
console = Console()


def human_bytes(byte_count: Union[int, float, str] = 0) -> str:
    """Formats byte counts into human readable strings (KB, MB, GB, TB)."""
    try:
        b = float(byte_count)
    except Exception as e:
        logger.debug("Failed to parse byte count: %s", e)
        return "0 B"
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if b < 1024.0:
            return f"{b:.2f} {unit}"
        b /= 1024.0
    return f"{b:.2f} PB"


class WireGuardMonitor:
    """Enterprise WireGuard status analyzer and cleanup tool for RouterOS v7."""

    def __init__(self, client: RouterOSClient):
        self.client = client

    def get_interfaces(self) -> List[Dict[str, Any]]:
        """Fetch WireGuard interfaces."""
        ifaces = self.client.get("interface/wireguard")
        return ifaces if isinstance(ifaces, list) else ([ifaces] if ifaces else [])

    def get_peers(self) -> List[Dict[str, Any]]:
        """Fetch WireGuard peers."""
        peers = self.client.get("interface/wireguard/peers")
        return peers if isinstance(peers, list) else ([peers] if peers else [])

    def analyze_peers(self, stale_threshold_hours: int = 720) -> Dict[str, Any]:
        """
        Analyzes all peers for handshake freshness and data throughput.
        stale_threshold_hours defaults to 720 (30 days).
        """
        interfaces = self.get_interfaces()
        peers = self.get_peers()

        peer_summaries = []
        stale_peers = []
        total_rx = 0
        total_tx = 0

        for peer in peers:
            peer_id = peer.get(".id", "")
            interface = peer.get("interface", "wireguard1")
            public_key = peer.get("public-key", "")
            allowed_address = peer.get("allowed-address", "0.0.0.0/0")
            endpoint_address = peer.get("endpoint-address", "")
            endpoint_port = peer.get("endpoint-port", "")
            comment = peer.get("comment", "")
            disabled = peer.get("disabled", False)
            if isinstance(disabled, str):
                disabled = disabled.lower() in ("true", "yes")

            last_handshake = peer.get("last-handshake", "never")
            rx_bytes = int(peer.get("rx", 0) or 0)
            tx_bytes = int(peer.get("tx", 0) or 0)

            total_rx += rx_bytes
            total_tx += tx_bytes

            is_stale = False
            if last_handshake == "never" or not last_handshake:
                is_stale = True
            elif "w" in str(last_handshake) or "d" in str(last_handshake):
                # Simple check for days/weeks old
                if "w" in str(last_handshake) or ("d" in str(last_handshake) and int(str(last_handshake).split("d")[0]) > 30):
                    is_stale = True

            peer_obj = {
                "id": peer_id,
                "interface": interface,
                "public_key_short": f"{public_key[:8]}...{public_key[-6:]}" if len(public_key) > 14 else public_key,
                "public_key": public_key,
                "allowed_address": allowed_address,
                "endpoint": f"{endpoint_address}:{endpoint_port}" if endpoint_address else "Dynamic / Mobile",
                "last_handshake": last_handshake,
                "rx_human": human_bytes(rx_bytes),
                "tx_human": human_bytes(tx_bytes),
                "rx_raw": rx_bytes,
                "tx_raw": tx_bytes,
                "comment": comment,
                "disabled": disabled,
                "is_stale": is_stale,
            }

            peer_summaries.append(peer_obj)
            if is_stale:
                stale_peers.append(peer_obj)

        return {
            "interface_count": len(interfaces),
            "interfaces": interfaces,
            "peer_count": len(peers),
            "peers": peer_summaries,
            "stale_peers": stale_peers,
            "total_rx_human": human_bytes(total_rx),
            "total_tx_human": human_bytes(total_tx),
        }

    def purge_stale_peers(self) -> int:
        """Removes peers that have never connected or have been inactive beyond threshold."""
        analysis = self.analyze_peers()
        stale_list = analysis["stale_peers"]
        purged = 0

        for p in stale_list:
            peer_id = p["id"]
            try:
                self.client.delete("interface/wireguard/peers", peer_id)
                console.print(f"[green]✔ Removed stale peer:[/green] {p['public_key_short']} ({p['comment'] or p['allowed_address']})")
                purged += 1
            except Exception as e:
                console.print(f"[red]Failed to delete peer {peer_id}: {e}[/red]")
                logger.error("WireGuard peer delete exception: %s", e)

        return purged

    def display_wireguard_table(self):
        """Prints rich formatted WireGuard topology table."""
        analysis = self.analyze_peers()

        table = Table(title="RouterOS v7 WireGuard Peer Status & Telemetry — Algo2World", show_lines=True)
        table.add_column("Interface", style="cyan", no_wrap=True)
        table.add_column("Public Key", style="white")
        table.add_column("Allowed IPs", style="yellow")
        table.add_column("Endpoint", style="dim")
        table.add_column("Last Handshake", justify="center")
        table.add_column("RX / TX Data", justify="right")
        table.add_column("Comment / Tag", style="magenta")

        for p in analysis["peers"]:
            handshake_style = "[green]" if p["last_handshake"] not in ("never", "") and not p["is_stale"] else "[red]"
            hs_display = f"{handshake_style}{p['last_handshake']}[/{handshake_style}]"
            traffic_display = f"↓ {p['rx_human']}\n↑ {p['tx_human']}"

            table.add_row(
                p["interface"],
                p["public_key_short"],
                p["allowed_address"],
                p["endpoint"],
                hs_display,
                traffic_display,
                p["comment"] or "-",
            )

        console.print(table)
        console.print(
            f"[bold]Total Peers:[/bold] {analysis['peer_count']} | "
            f"[bold]Active Traffic:[/bold] RX {analysis['total_rx_human']} / TX {analysis['total_tx_human']} | "
            f"[bold red]Stale/Inactive Peers:[/bold red] {len(analysis['stale_peers'])}"
        )

