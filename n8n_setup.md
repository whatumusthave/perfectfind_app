# n8n Port Routing Configuration

To avoid conflicts between the terminal-exposed port and the internal n8n service port, please follow these routing specifications:

## 1. Port Allocation
- **External API Port**: `5678` (Terminal 1)
- **Internal Service Port**: `88` (Internal n8n)

## 2. Routing Rules
- Traffic arriving at `http://localhost:5678` should be routed to the n8n dashboard/API.
- The game engine in `game.js` is configured to send reports to `http://localhost:88/webhook/perfect-paw-match`.
- Ensure that the n8n instance is listening internally on **Port 88** if the terminal proxy is active on **Port 5678**.

## 3. Conflict Prevention
- **DO NOT** attempt to run both the terminal proxy and the n8n service on the same port.
- Port `5678` is reserved for terminal/external access.
- Port `88` is reserved for internal logic and game reporting.

---
*Note: This configuration is essential for the Cloudflare ALLOWLIST (formerly 얼라인레스트) to function correctly via the API.*
