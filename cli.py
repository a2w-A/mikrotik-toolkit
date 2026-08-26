#!/usr/bin/env python3
"""
mikrotik-toolkit: Enterprise CLI for MikroTik RouterOS v7 Hardware & CHR
Developed by Algo2World (https://algo2world.com) • Part of the Ind. Sovereign Ecosystem
Author: Nikil & Algo2World Infrastructure Engineering Team
"""

import os
import json
import typer
from typing import Optional
from pathlib import Path
from rich.console import Console
from rich.panel import Panel

from api_handler import RouterOSClient, RouterOSAPIError
from backup_manager import BackupManager
from security_audit import SecurityAuditor
from dhcp_manager import DHCPManager
from wireguard_monitor import WireGuardMonitor

app = typer.Typer(
    name="mikrotik-toolkit",
    help="Enterprise CLI toolkit for auditing, provisioning, and securing MikroTik RouterOS v7 hardware and CHR instances by Algo2World.",
    add_completion=True,
    rich_markup_mode="rich",
)

console = Console()


def get_client(
    host: Optional[str] = None,
    port: Optional[int] = None,
    user: Optional[str] = None,
    password: Optional[str] = None,
    use_ssl: Optional[bool] = None,
    no_verify_ssl: bool = True,
) -> RouterOSClient:
    """Helper to instantiate RouterOSClient from CLI options or Environment variables."""
    target_host = host or os.getenv("MIKROTIK_HOST", "192.168.88.1")
    target_user = user or os.getenv("MIKROTIK_USER", "admin")
    target_pass = password or os.getenv("MIKROTIK_PASS", "")
    
    if use_ssl is None:
        env_ssl = os.getenv("USE_SSL", "true").lower() in ("true", "1", "yes")
        target_ssl = env_ssl
    else:
        target_ssl = use_ssl

    return RouterOSClient(
        host=target_host,
        port=port,
        username=target_user,
        password=target_pass,
        use_ssl=target_ssl,
        verify_ssl=not no_verify_ssl,
    )


@app.command("info")
def system_info(
    host: Optional[str] = typer.Option(None, "--host", "-h", help="MikroTik IP or FQDN"),
    port: Optional[int] = typer.Option(None, "--port", "-P", help="REST / API port"),
    user: Optional[str] = typer.Option(None, "--user", "-u", help="Username"),
    password: Optional[str] = typer.Option(None, "--pass", "-p", help="Password"),
    ssl: bool = typer.Option(True, "--ssl/--no-ssl", help="Use HTTPS/SSL"),
):
    """[bold green]System Info[/bold green]: Retrieve hardware specifications, CPU load, and RouterOS version."""
    try:
        client = get_client(host, port, user, password, ssl)
        identity = client.get_system_identity()
        res = client.get_system_resource()

        info_panel = (
            f"[bold cyan]Identity:[/bold cyan] {identity}\n"
            f"[bold cyan]Target Host:[/bold cyan] {client.host}:{client.port} (SSL: {client.use_ssl})\n"
            f"[bold cyan]RouterOS Version:[/bold cyan] {res.get('version', 'N/A')}\n"
            f"[bold cyan]Board Name:[/bold cyan] {res.get('board-name', 'RouterBOARD')}\n"
            f"[bold cyan]Architecture:[/bold cyan] {res.get('architecture-name', 'N/A')}\n"
            f"[bold cyan]CPU:[/bold cyan] {res.get('cpu', 'N/A')} @ {res.get('cpu-frequency', 0)}MHz ({res.get('cpu-count', 1)} cores)\n"
            f"[bold cyan]CPU Load:[/bold cyan] {res.get('cpu-load', 0)}%\n"
            f"[bold cyan]Free Memory:[/bold cyan] {int(res.get('free-memory', 0)) // 1024 // 1024} MB / {int(res.get('total-memory', 0)) // 1024 // 1024} MB\n"
            f"[bold cyan]Free HDD:[/bold cyan] {int(res.get('free-hdd-space', 0)) // 1024 // 1024} MB\n"
            f"[bold cyan]Uptime:[/bold cyan] {res.get('uptime', 'N/A')}"
        )
        console.print(Panel(info_panel, title="MikroTik RouterOS Node Info — Algo2World", border_style="cyan"))
    except RouterOSAPIError as e:
        console.print(f"[bold red]API Error:[/bold red] {e}")
        raise typer.Exit(code=1)


@app.command("audit")
def security_audit(
    host: Optional[str] = typer.Option(None, "--host", "-h", help="MikroTik IP or FQDN"),
    port: Optional[int] = typer.Option(None, "--port", "-P", help="REST / API port"),
    user: Optional[str] = typer.Option(None, "--user", "-u", help="Username"),
    password: Optional[str] = typer.Option(None, "--pass", "-p", help="Password"),
    ssl: bool = typer.Option(True, "--ssl/--no-ssl", help="Use HTTPS/SSL"),
    rsc_output: Optional[str] = typer.Option(None, "--generate-rsc", "-g", help="Path to write auto-remediation .rsc script"),
    json_output: bool = typer.Option(False, "--json", "-j", help="Output raw JSON data for CI/CD pipelines"),
):
    """[bold red]Security Audit[/bold red]: Evaluate firewall filters, service exposure, open DNS resolvers & IAM posture."""
    try:
        client = get_client(host, port, user, password, ssl)
        auditor = SecurityAuditor(client)
        audit_results = auditor.run_full_audit()

        if json_output:
            findings_data = [
                {
                    "category": f.category,
                    "check": f.name,
                    "status": f.status,
                    "deduction": f.score_impact,
                    "details": f.details,
                    "remediation": f.remediation_cmd,
                }
                for f in audit_results["findings"]
            ]
            payload = {
                "identity": audit_results["identity"],
                "version": audit_results["version"],
                "score": audit_results["score"],
                "posture": audit_results["posture"],
                "findings": findings_data,
            }
            console.print_json(json.dumps(payload))
        else:
            auditor.display_terminal_summary(audit_results)

        if rsc_output:
            remediation_path = Path(rsc_output)
            remediation_path.parent.mkdir(parents=True, exist_ok=True)
            with open(remediation_path, "w", encoding="utf-8") as f:
                f.write(audit_results["remediation_script"])
            console.print(f"[bold green]✔ Hardening remediation script written to:[/bold green] [bold]{remediation_path}[/bold]")

        if audit_results["score"] < 60:
            console.print("[bold yellow]Warning: Hardening score is below enterprise threshold (60/100).[/bold yellow]")

    except RouterOSAPIError as e:
        console.print(f"[bold red]API Error:[/bold red] {e}")
        raise typer.Exit(code=1)


@app.command("backup")
def backup_router(
    host: Optional[str] = typer.Option(None, "--host", "-h", help="MikroTik IP or FQDN"),
    port: Optional[int] = typer.Option(None, "--port", "-P", help="REST / API port"),
    user: Optional[str] = typer.Option(None, "--user", "-u", help="Username"),
    password: Optional[str] = typer.Option(None, "--pass", "-p", help="Password"),
    ssl: bool = typer.Option(True, "--ssl/--no-ssl", help="Use HTTPS/SSL"),
    encryption_password: Optional[str] = typer.Option(None, "--enc-pass", "-e", help="Password for AES binary .backup"),
    output_dir: str = typer.Option("./backups", "--out-dir", "-o", help="Local directory to store exports"),
    hide_sensitive: bool = typer.Option(True, "--hide-sensitive/--show-sensitive", help="Scrub sensitive credentials"),
):
    """[bold blue]Backup & Safe Export[/bold blue]: Create date-stamped sanitized RSC export and encrypted binary .backup."""
    try:
        client = get_client(host, port, user, password, ssl)
        mgr = BackupManager(client, output_dir=output_dir)

        # 1. Create sanitized RSC export
        rsc_path, rsc_size = mgr.create_safe_export(hide_sensitive=hide_sensitive)

        # 2. If encryption password provided, trigger binary backup
        if encryption_password:
            mgr.create_encrypted_backup(encryption_password=encryption_password)
        else:
            console.print("[dim]Note: Pass --enc-pass <secret> to also generate an AES-encrypted binary .backup file.[/dim]")

    except RouterOSAPIError as e:
        console.print(f"[bold red]API Error:[/bold red] {e}")
        raise typer.Exit(code=1)


@app.command("dhcp")
def dhcp_management(
    host: Optional[str] = typer.Option(None, "--host", "-h", help="MikroTik IP or FQDN"),
    port: Optional[int] = typer.Option(None, "--port", "-P", help="REST / API port"),
    user: Optional[str] = typer.Option(None, "--user", "-u", help="Username"),
    password: Optional[str] = typer.Option(None, "--pass", "-p", help="Password"),
    ssl: bool = typer.Option(True, "--ssl/--no-ssl", help="Use HTTPS/SSL"),
    bind_all: bool = typer.Option(False, "--bind-all", "-b", help="Bulk-convert all dynamic leases to static reservations"),
    tag: str = typer.Option("Bound-by-Toolkit", "--tag", "-t", help="Comment tag for static bindings"),
):
    """[bold magenta]DHCP Manager[/bold magenta]: List active leases, detect ARP/IP collisions, and bulk-bind dynamic leases."""
    try:
        client = get_client(host, port, user, password, ssl)
        mgr = DHCPManager(client)

        if bind_all:
            count = mgr.bulk_bind_dynamic_leases(comment_tag=tag)
            console.print(f"[bold green]✔ Successfully converted {count} dynamic leases to static reservations.[/bold green]")
        else:
            mgr.display_lease_table()

    except RouterOSAPIError as e:
        console.print(f"[bold red]API Error:[/bold red] {e}")
        raise typer.Exit(code=1)


@app.command("wireguard")
def wireguard_status(
    host: Optional[str] = typer.Option(None, "--host", "-h", help="MikroTik IP or FQDN"),
    port: Optional[int] = typer.Option(None, "--port", "-P", help="REST / API port"),
    user: Optional[str] = typer.Option(None, "--user", "-u", help="Username"),
    password: Optional[str] = typer.Option(None, "--pass", "-p", help="Password"),
    ssl: bool = typer.Option(True, "--ssl/--no-ssl", help="Use HTTPS/SSL"),
    purge_stale: bool = typer.Option(False, "--purge-stale", help="Automatically delete inactive/stale peers"),
):
    """[bold cyan]WireGuard Monitor[/bold cyan]: Track peer handshakes, transfer metrics, endpoints, and purge stale peers."""
    try:
        client = get_client(host, port, user, password, ssl)
        wg = WireGuardMonitor(client)

        if purge_stale:
            purged = wg.purge_stale_peers()
            console.print(f"[bold green]✔ Purged {purged} stale WireGuard peer records.[/bold green]")
        else:
            wg.display_wireguard_table()

    except RouterOSAPIError as e:
        console.print(f"[bold red]API Error:[/bold red] {e}")
        raise typer.Exit(code=1)


if __name__ == "__main__":
    app()

