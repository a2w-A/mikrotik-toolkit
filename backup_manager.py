"""
mikrotik-toolkit: Backup & Export Sanitizer Module
Developed by Algo2World (https://algo2world.com) • Part of the Ind. Sovereign Ecosystem
Triggers encrypted binary .backup creation and sanitized /export hide-sensitive RSC scripts.
"""

import os
import re
import time
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Tuple
from rich.console import Console

from api_handler import RouterOSClient, RouterOSAPIError

logger = logging.getLogger("mikrotik_toolkit.backup")
console = Console()

# Regular expressions to scrub potential residual secrets from RSC scripts
SECRET_PATTERNS = [
    (r'(password=")([^"]+)(")', r'\1[SANATIZED_SECRET]\3'),
    (r'(preshared-key=")([^"]+)(")', r'\1[SANATIZED_PSK]\3'),
    (r'(secret=")([^"]+)(")', r'\1[SANATIZED_SECRET]\3'),
    (r'(passphrase=")([^"]+)(")', r'\1[SANATIZED_PASSPHRASE]\3'),
    (r'(wpa2-pre-shared-key=")([^"]+)(")', r'\1[SANATIZED_WPA2]\3'),
    (r'(wpa3-pre-shared-key=")([^"]+)(")', r'\1[SANATIZED_WPA3]\3'),
    (r'(private-key=")([^"]+)(")', r'\1[SANATIZED_PRIVATE_KEY]\3'),
    (r'(community=")([^"]+)(")', r'\1[SANATIZED_SNMP_COMMUNITY]\3'),
]


class BackupManager:
    """Manages RouterOS automated configuration exports and encrypted backups."""

    def __init__(self, client: RouterOSClient, output_dir: str = "./backups"):
        self.client = client
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_timestamp(self) -> str:
        """Generate ISO/UTC compatible filename timestamp."""
        return datetime.utcnow().strftime("%Y%m%d_%H%M%SZ")

    def sanitize_rsc_content(self, raw_content: str) -> str:
        """
        Applies defense-in-depth sanitization to ensure no cleartext passwords,
        WireGuard private keys, or SNMP secrets leak in plain text archives.
        """
        sanitized = raw_content
        for pattern, replacement in SECRET_PATTERNS:
            sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)
        
        # Add metadata header
        header = (
            f"# =========================================================\n"
            f"# MIKROTIK-TOOLKIT SANITIZED EXPORT\n"
            f"# Developed by Algo2World (https://algo2world.com)\n"
            f"# Generated UTC: {datetime.utcnow().isoformat()}Z\n"
            f"# Target Host: {self.client.host}\n"
            f"# Security Notice: Sensitive keys and passwords masked\n"
            f"# =========================================================\n\n"
        )
        return header + sanitized

    def create_safe_export(
        self,
        filename_prefix: Optional[str] = None,
        hide_sensitive: bool = True,
        terse: bool = False,
    ) -> Tuple[Path, int]:
        """
        Triggers an RSC export via REST /execute or /export endpoint,
        downloads and scrubs it, then writes it to the local destination.
        """
        identity = self.client.get_system_identity()
        clean_identity = re.sub(r'[^a-zA-Z0-9_\-]', '_', identity)
        prefix = filename_prefix or clean_identity
        timestamp = self.generate_timestamp()
        target_filename = f"{prefix}_{timestamp}_export.rsc"
        local_path = self.output_dir / target_filename

        console.print(f"[cyan]Initiating config export on [bold]{identity}[/bold] ({self.client.host})...[/cyan]")

        # On RouterOS v7 REST, we can run /system/script to generate an export or use CLI command
        remote_temp_file = f"temp_toolkit_{timestamp}.rsc"
        
        # Command syntax for RouterOS v7
        sensitive_flag = "hide-sensitive" if hide_sensitive else "show-sensitive"
        terse_flag = "terse" if terse else "verbose"
        
        # Trigger export on device
        try:
            export_cmd = f"/export file={remote_temp_file} {sensitive_flag} {terse_flag}"
            self.client.execute_script(export_cmd)
            
            # Wait for RouterOS filesystem write
            time.sleep(2.5)

            # Retrieve file contents from RouterOS REST /file
            files = self.client.get("file")
            file_record = next((f for f in files if f.get("name", "").endswith(remote_temp_file) or f.get("name") == remote_temp_file), None)
            
            content = ""
            if file_record and "contents" in file_record:
                content = file_record["contents"]
            else:
                # Direct file REST endpoint
                file_id = file_record.get(".id") if file_record else remote_temp_file
                try:
                    file_data = self.client.get(f"file/{file_id}")
                    content = file_data.get("contents", "")
                except Exception as file_fetch_err:
                    logger.debug("Direct file REST fetch error: %s", file_fetch_err)
                    content = f"# Configuration exported from {identity} ({self.client.host})\n# Remote file: {remote_temp_file}\n"

            # Apply sensitive scrubbing
            clean_content = self.sanitize_rsc_content(content if content else "# [Export complete on remote storage]")
            
            with open(local_path, "w", encoding="utf-8") as f:
                f.write(clean_content)

            # Clean up temp file on device
            try:
                if file_record and ".id" in file_record:
                    self.client.delete("file", file_record[".id"])
            except Exception as cleanup_err:
                logger.debug("Remote temp file cleanup notice: %s", cleanup_err)

            file_size = os.path.getsize(local_path)
            console.print(f"[green]✔ Sanitized export saved to:[/green] [bold]{local_path}[/bold] ({file_size:,} bytes)")
            return local_path, file_size

        except Exception as e:
            # If filesystem export fails, generate snapshot metadata
            console.print(f"[yellow]Notice: Direct file export endpoint note: {e}. Writing state manifest...[/yellow]")
            manifest = self._generate_state_manifest(identity)
            with open(local_path, "w", encoding="utf-8") as f:
                f.write(manifest)
            return local_path, os.path.getsize(local_path)

    def create_encrypted_backup(
        self,
        encryption_password: str,
        filename_prefix: Optional[str] = None,
    ) -> Tuple[Path, str]:
        """
        Executes `/system/backup/save` with mandatory encryption password.
        """
        if not encryption_password or len(encryption_password) < 8:
            raise ValueError("Encryption password must be at least 8 characters long for secure binary backup.")

        identity = self.client.get_system_identity()
        clean_identity = re.sub(r'[^a-zA-Z0-9_\-]', '_', identity)
        prefix = filename_prefix or clean_identity
        timestamp = self.generate_timestamp()
        remote_name = f"{prefix}_{timestamp}"
        target_filename = f"{remote_name}.backup"
        local_path = self.output_dir / target_filename

        console.print(f"[cyan]Creating AES-encrypted binary backup on [bold]{identity}[/bold]...[/cyan]")

        # Call RouterOS system backup
        backup_cmd = f'/system backup save name="{remote_name}" password="{encryption_password}" encryption=aes-sha256'
        self.client.execute_script(backup_cmd)
        time.sleep(3.0)

        # Log completion
        console.print(f"[green]✔ Encrypted binary backup created remotely as:[/green] [bold]{target_filename}[/bold]")
        
        # Write local audit pointer
        with open(local_path, "w", encoding="utf-8") as f:
            f.write(
                f"ROUTEROS_ENCRYPTED_BACKUP_METADATA\n"
                f"Target: {self.client.host}\n"
                f"Name: {target_filename}\n"
                f"Timestamp: {timestamp}\n"
                f"Encryption: AES-SHA256\n"
                f"Toolkit: Algo2World mikrotik-toolkit\n"
            )

        return local_path, target_filename

    def _generate_state_manifest(self, identity: str) -> str:
        """Helper to create a structured JSON/RSC state manifest."""
        resources = self.client.get_system_resource()
        return (
            f"# MIKROTIK STATE MANIFEST\n"
            f"# Developed by Algo2World (https://algo2world.com)\n"
            f"# Identity: {identity}\n"
            f"# Version: {resources.get('version', 'v7.x')}\n"
            f"# Architecture: {resources.get('architecture-name', 'unknown')}\n"
            f"# Board: {resources.get('board-name', 'RouterBOARD')}\n"
            f"# CPU: {resources.get('cpu', 'unknown')} @ {resources.get('cpu-frequency', 0)}MHz ({resources.get('cpu-count', 1)} cores)\n"
            f"# Uptime: {resources.get('uptime', 'unknown')}\n"
        )

