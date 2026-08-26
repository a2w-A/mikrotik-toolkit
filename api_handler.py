"""
mikrotik-toolkit: Enterprise RouterOS API & REST Handler
Developed by Algo2World (https://algo2world.com) • Part of the Ind. Sovereign Ecosystem
Supports RouterOS v7 REST API (HTTPS) and RouterOS API (8728/8729).
"""

import os
import sys
import logging
from typing import Any, Dict, List, Optional, Union
import urllib3
import requests
from requests.auth import HTTPBasicAuth

# Suppress insecure HTTPS request warnings when self-signed certs are used on internal subnets
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger("mikrotik_toolkit.api")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter("[%(levelname)s] %(name)s: %(message)s"))
    logger.addHandler(handler)


class RouterOSAPIError(Exception):
    """Base exception for RouterOS communication failures."""
    pass


class RouterOSClient:
    """
    Unified client supporting RouterOS v7 REST API (Recommended)
    and Classic Socket API (port 8728/8729 via routeros_api).
    """

    def __init__(
        self,
        host: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        port: Optional[int] = None,
        use_ssl: bool = True,
        verify_ssl: bool = False,
        use_rest: bool = True,
        timeout: int = 15,
    ):
        self.host = host or os.getenv("MIKROTIK_HOST", "192.168.88.1")
        self.username = username or os.getenv("MIKROTIK_USER", "admin")
        self.password = password or os.getenv("MIKROTIK_PASS", "")
        
        env_ssl = os.getenv("USE_SSL", "true").lower() in ("true", "1", "yes")
        self.use_ssl = use_ssl if use_ssl is not None else env_ssl
        self.verify_ssl = verify_ssl
        self.timeout = timeout
        self.use_rest = use_rest

        # Determine default port based on protocol
        if port is not None:
            self.port = port
        elif self.use_rest:
            self.port = int(os.getenv("MIKROTIK_PORT", "443" if self.use_ssl else "80"))
        else:
            self.port = int(os.getenv("MIKROTIK_PORT", "8729" if self.use_ssl else "8728"))

        self.session = requests.Session()
        self.session.auth = HTTPBasicAuth(self.username, self.password)
        self.session.verify = self.verify_ssl
        self._socket_api_pool = None

    @property
    def base_rest_url(self) -> str:
        protocol = "https" if self.use_ssl else "http"
        return f"{protocol}://{self.host}:{self.port}/rest"

    # -------------------------------------------------------------------------
    # REST API Engine (RouterOS v7)
    # -------------------------------------------------------------------------

    def rest_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
    ) -> Union[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Executes a REST call against RouterOS v7 `/rest/<endpoint>` endpoint.
        """
        clean_endpoint = endpoint.strip("/")
        url = f"{self.base_rest_url}/{clean_endpoint}"

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        try:
            response = self.session.request(
                method=method.upper(),
                url=url,
                params=params,
                json=json_data,
                headers=headers,
                timeout=self.timeout,
            )

            if response.status_code == 401:
                raise RouterOSAPIError(f"Authentication failed for user '{self.username}' at {self.host}")
            
            if response.status_code == 404:
                raise RouterOSAPIError(f"Endpoint not found: {endpoint} (Check RouterOS v7 path)")

            if not response.ok:
                error_msg = response.text
                try:
                    err_json = response.json()
                    error_msg = err_json.get("detail", err_json.get("error", response.text))
                except Exception as json_err:
                    logger.debug("Failed to decode JSON error body: %s", json_err)
                raise RouterOSAPIError(f"RouterOS API Error [{response.status_code}]: {error_msg}")

            if not response.content or response.status_code == 204:
                return {}

            return response.json()

        except requests.exceptions.SSLError as e:
            raise RouterOSAPIError(
                f"SSL verification error connecting to {self.host}. Use --no-verify-ssl if using self-signed certs: {e}"
            )
        except requests.exceptions.ConnectionError as e:
            raise RouterOSAPIError(f"Connection refused connecting to {self.host}:{self.port}: {e}")
        except requests.exceptions.Timeout:
            raise RouterOSAPIError(f"Connection timeout ({self.timeout}s) connecting to {self.host}:{self.port}")

    def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Any:
        """Execute a GET request against RouterOS REST endpoint."""
        return self.rest_request("GET", endpoint, params=params)

    def post(self, endpoint: str, data: Optional[Dict[str, Any]] = None) -> Any:
        """Execute a POST request against RouterOS REST endpoint."""
        return self.rest_request("POST", endpoint, json_data=data)

    def patch(self, endpoint: str, item_id: str, data: Dict[str, Any]) -> Any:
        """Execute a PATCH request to modify a specific RouterOS record."""
        return self.rest_request("PATCH", f"{endpoint}/{item_id}", json_data=data)

    def delete(self, endpoint: str, item_id: str) -> Any:
        """Execute a DELETE request to remove a specific RouterOS record."""
        return self.rest_request("DELETE", f"{endpoint}/{item_id}")

    def put(self, endpoint: str, data: Dict[str, Any]) -> Any:
        """Execute a PUT request against RouterOS REST endpoint."""
        return self.rest_request("PUT", endpoint, json_data=data)

    # -------------------------------------------------------------------------
    # Diagnostic & Metadata helpers
    # -------------------------------------------------------------------------

    def get_system_resource(self) -> Dict[str, Any]:
        """Fetch router hardware, architecture, ROS version, CPU load, and uptime."""
        res = self.get("system/resource")
        return res[0] if isinstance(res, list) and res else res

    def get_system_identity(self) -> str:
        """Fetch router identity name."""
        identity = self.get("system/identity")
        if isinstance(identity, dict):
            return identity.get("name", "MikroTik")
        elif isinstance(identity, list) and identity:
            return identity[0].get("name", "MikroTik")
        return "MikroTik"

    def execute_script(self, script_source: str) -> Dict[str, Any]:
        """Execute a dynamic RouterOS script block."""
        return self.post("system/script/run", {"source": script_source})

    def close(self):
        """Close open sessions and sockets cleanly."""
        self.session.close()
        if self._socket_api_pool:
            try:
                self._socket_api_pool.disconnect()
            except Exception as e:
                logger.debug("Socket disconnect exception: %s", e)

