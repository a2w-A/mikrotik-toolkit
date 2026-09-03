# mikrotik-toolkit 🚀

**Enterprise-grade Python CLI & REST API Automation Toolkit for MikroTik RouterOS v7 (Hardware & Cloud Hosted Routers / CHR).**

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![RouterOS v7](https://img.shields.io/badge/RouterOS-v7.x_REST_API-orange.svg)](https://mikrotik.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status: Production Grade](https://img.shields.io/badge/Status-Production_Grade-success.svg)](https://algo2world.com)

---

## 📐 Enterprise Network Topology & Architecture:

```text
               +-------------------------------------------------------------+
               |                  Corporate Internet / WAN                   |
               +-------------------------------------------------------------+
                                       |                 |
                        [Public WAN IP]|                 |[Public WAN IP]
                                       v                 v
                      +-------------------+   +--------------------+
                      | Edge Router HQ    |   | Cloud CHR (AWS/GCP)|
                      | CCR2004-16G-2S+   |   | RouterOS v7.14+    |
                      | 192.168.88.1:443  |   | 10.200.0.1:443     |
                      +-------------------+   +--------------------+
                                |    ^                     ^
    +---------------------------+    | [WireGuard Tunnel]  |
    |                                +=====================+
    v                                           |
+----------------------+             +---------------------+
| Branch Office hEX    |             | Remote Engineers    |
| RB760iGS (10.10.0.1) |             | Road Warrior Peers  |
+----------------------+             +---------------------+
           |
           v
+----------------------------------------------------------------------------+
|             mikrotik-toolkit Automation & Security Controller              |
|  [REST API / HTTPS] ──────>  • Automated AES Backups & Sanitized Exports   |
|                              • CIS / Hardening Security Audit (0-100)      |
|                              • Open DNS Resolver & WAN Filter Detection    |
|                              • DHCP IP Conflict & Static Binding Engine    |
|                              • WireGuard Peer Telemetry & Stale Purging    |
+----------------------------------------------------------------------------+
```

---

## ✨ Key Features

1. **Automated Encrypted Backup & Safe Export**:
   - Executes AES-256 encrypted `.backup` files via RouterOS system services.
   - Generates `/export hide-sensitive` RSC configuration scripts.
   - Multi-layer defense-in-depth sanitization: automatically strips passwords, private keys, WPA3 passphrases, and SNMP community strings from plaintext archives.

2. **Security Hardening & Posture Auditor**:
   - Comprehensive audit of active IP services (Telnet, FTP, HTTP, plain API vs HTTPS).
   - Winbox port audit (custom port vs default 8291, IP access control lists).
   - Detection of **Open Recursive DNS Resolvers** (`allow-remote-requests=yes` without WAN firewall drop filters).
   - State inspection of `input` and `forward` firewall chains (drop invalid packet states).
   - Generates **1-click executable `.rsc` remediation scripts** to harden vulnerable routers in seconds.

3. **DHCP & Static Lease Manager**:
   - Discovers all dynamic and static DHCP leases.
   - Correlates DHCP leases with the hardware ARP cache to identify IP address collisions and rogue static hosts.
   - Single-command bulk-binding of dynamic leases to static reservations with custom tracking comments.

4. **WireGuard & VPN Interface Monitor**:
   - Real-time tracking of peer handshake intervals, endpoint addresses, and byte counters (RX/TX).
   - Automated detection and safe pruning of stale/dormant peers (e.g. inactive > 30 days).

---

## 🔒 MikroTik RouterOS v7 API Setup Guide

To follow the principle of least privilege, create a dedicated user group and service account rather than using full `admin` credentials.

### Step 1: Connect to your MikroTik via Winbox or SSH and run:

```routeros
# 1. Create a dedicated API user group with constrained policies
/user group add name=toolkit_auditor \
    policy=read,api,test,rest-api,password,sensitive \
    skin=default \
    comment="Constrained group for mikrotik-toolkit automation"

# 2. Add an automation user with a strong random password
/user add name=svc_toolkit \
    group=toolkit_auditor \
    password="REPLACE_WITH_A_VERY_SECURE_PASSWORD" \
    comment="mikrotik-toolkit service account"

# 3. Enable RouterOS v7 REST API (HTTPS service)
/ip service set api-ssl disabled=no port=8729
/ip service set www-ssl disabled=no port=443
```

*(Optional) If you do not have SSL certificates installed yet on your router, you can enable plain HTTP/API for initial setup:*
```routeros
/ip service set www disabled=no port=80
```

---

## 🚀 Quickstart & Installation

### Option A: Local Python Environment

```bash
# Clone the repository
git clone https://github.com/algo2world/mikrotik-toolkit.git
cd mikrotik-toolkit

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Option B: Docker Container

```bash
# Build Docker image
docker build -t mikrotik-toolkit:latest .

# Run with environment variables
docker run --rm \
  -e MIKROTIK_HOST="192.168.88.1" \
  -e MIKROTIK_USER="svc_toolkit" \
  -e MIKROTIK_PASS="YourSecurePassword" \
  -v $(pwd)/backups:/app/backups \
  mikrotik-toolkit:latest audit
```

---

## 💻 CLI Usage Examples

### 1. Environment Configuration (Recommended)
Set environment variables to avoid passing credentials on the command line:

```bash
export MIKROTIK_HOST="192.168.88.1"
export MIKROTIK_PORT="443"
export MIKROTIK_USER="svc_toolkit"
export MIKROTIK_PASS="SuperSecretPass123!"
export USE_SSL="true"
```

### 2. Node Resource & Identity Inspection
```bash
python3 cli.py info
```

### 3. Run Security Audit & Generate Remediation Script
```bash
# Run security audit with rich terminal output
python3 cli.py audit

# Output machine-readable JSON for CI/CD pipelines
python3 cli.py audit --json

# Generate an executable RouterOS fix script for all identified findings
python3 cli.py audit --generate-rsc ./remediation_fix.rsc
```

### 4. Create Encrypted Binary Backup and Sanitized RSC Export
```bash
python3 cli.py backup --enc-pass "BackupAESPass2026!" --out-dir ./backups
```

### 5. DHCP Leases, Collision Detection & Bulk Static Binding
```bash
# Display active leases and IP collision diagnostics
python3 cli.py dhcp

# Bulk-convert all active dynamic DHCP leases to static reservations
python3 cli.py dhcp --bind-all --tag "Office-Fixed-Reservation"
```

### 6. WireGuard Peer Telemetry & Inactive Peer Cleanup
```bash
# View all peer metrics, handshakes, and bandwidth throughput
python3 cli.py wireguard

# Automatically prune dormant peers (>30 days without handshake)
python3 cli.py wireguard --purge-stale
```

---

## ⏰ Automated Cron / Scheduled Execution

### Daily Security Audit & Backup via Linux Crontab

```bash
# Edit crontab
crontab -e

# Run automated backup and security audit every night at 03:00 AM
0 3 * * * cd /opt/mikrotik-toolkit && MIKROTIK_HOST="192.168.88.1" MIKROTIK_USER="svc_toolkit" MIKROTIK_PASS="SecurePass" ./venv/bin/python3 cli.py backup --enc-pass "Secret123" >> /var/log/mikrotik_backup.log 2>&1
30 3 * * * cd /opt/mikrotik-toolkit && MIKROTIK_HOST="192.168.88.1" MIKROTIK_USER="svc_toolkit" MIKROTIK_PASS="SecurePass" ./venv/bin/python3 cli.py audit --generate-rsc /var/backups/daily_fix.rsc >> /var/log/mikrotik_audit.log 2>&1
```

---

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🏢 Developed & Maintained by Algo2World

**Founder & Lead Architect:** Nikil (Algo2World)  
*Enterprise Full-Stack Architecture • Linux Cloud Infrastructure • Network Automation*

- 🌐 **Primary Web:** [https://algo2world.com](https://algo2world.com) | [https://a2w.in](https://a2w.in)
- 📧 **Direct Email:** nikil@algo2world.com
- 💬 **Telegram:** `@AUTO_GPT_BOT`

---

## 🌐 Ind. Sovereign Ecosystem Platforms

The `mikrotik-toolkit` is an open-source utility integrated into the **Ind. Sovereign Ecosystem** of high-resilience web platforms and decentralized tools:

| Platform Domain | Purpose & Focus Area |
|:---|:---|
| **algo2world.com** • **a2w.in** | Enterprise DevOps, Full-Stack Web & Automation Engineering |
| **samvad.chat** • **ind.social** | Sovereign Communications, Instant Messaging & Social Media |
| **ind.network** • **ind.center** | Edge Nodes, Infrastructure Routing & Decentralized Networking |
| **ind.trading** • **ind.report** | Algorithmic Trading Systems, Quantitative Models & Analytics |
| **ind.shiksha** • **ind.quest** | Open Knowledge Graphs, Universal Education & Exploratory Portals |
| **ind.run** • **ind.pet** | Microservices Orchestration, Logistics & Care Management |

---

## 💼 Hire Us & Commercial Engineering Services

Looking to deploy carrier-grade network automation, secure your MikroTik infrastructure, or build custom cloud orchestrators?

**Algo2World** is available for commercial consulting, custom feature development, and contracted engineering:
- **Network Automation & Provisioning**: MikroTik RouterOS v7, Cisco, VyOS, WireGuard, and Tailscale mesh topologies.
- **Infrastructure & Security Hardening**: CIS benchmark auditing, firewall design, edge reverse proxy hardening, and DDoS mitigation.
- **Linux Cloud DevOps**: Kubernetes, Docker, Terraform, CI/CD pipelines, and scale-to-zero serverless backends.
- **Monthly Enterprise SLA Contracts**: 24/7 proactive monitoring, automated backup verification, and priority incident response.

📩 **Inquire for Commercial Engagements:** [nikil@algo2world.com](mailto:nikil@algo2world.com) | [algo2world.com](https://algo2world.com)
