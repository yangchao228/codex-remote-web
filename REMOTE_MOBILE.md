# Mobile Data Remote Access

This project can be reached from a phone on mobile data by putting the local service behind a private network or a protected tunnel. The computer still runs Codex locally; the phone remains only a browser control panel.

## Recommended Shape

Use one of these network layers:

1. Private device network, such as Tailscale, where the phone and computer are both trusted devices.
2. Cloudflare Tunnel with an access policy in front of this service.
3. Temporary Cloudflare quick tunnel for a short manual demo only.

Do not port-forward this service from your home router to the public internet.

## Start The Local Service

Build and start the remote-hardened local server:

```bash
npm run dev:remote
```

This keeps the service bound to `127.0.0.1`, uses a 12-digit pairing code, shortens the pairing-code lifetime to 5 minutes, shortens phone session tokens to 30 minutes, and rate-limits invalid pairing attempts.

Keep the terminal open. The pairing code printed there is the only bootstrap credential for the phone.

## Cloudflare Tunnel Demo

In a second terminal, expose the local server through Cloudflare Tunnel:

```bash
cloudflared tunnel --url http://127.0.0.1:4317
```

Open the printed `https://...trycloudflare.com` URL from the phone with Wi-Fi disabled. Enter the 12-digit pairing code from the computer terminal.

For regular use, put Cloudflare Access in front of the tunnel. The quick tunnel URL is suitable for a short manual demo, not a permanent always-on endpoint.

## Tailscale Or Private VPN

If both the phone and computer are on the same private device network, start LAN mode:

```bash
npm run dev:lan
```

Open the computer's private network IP and port from the phone. Keep this limited to trusted private networks.

## Verification Checklist

- Phone Wi-Fi is off and the browser uses mobile data.
- The URL loads from the phone.
- Pairing uses the current code printed in the computer terminal.
- The phone can create a Codex task in an allowlisted workspace.
- Output streams back to the phone.
- Stop works for a running task.
- Logs remain in the computer's local `data/` directory.
- `npm run smoke:codex` or `npm run smoke:local` still passes locally.

For an automated check against a tunnel URL, pass the pairing code explicitly:

```bash
SMOKE_BASE_URL=https://example.trycloudflare.com PAIRING_CODE=123456789012 npm run smoke:codex
```

Use the real URL and current pairing code from your terminal.
