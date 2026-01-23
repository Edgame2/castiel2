# Docker DNS Resolution Fix

## Problem
Docker build fails with DNS resolution error:
```
failed to resolve source metadata for docker.io/library/node:20-alpine
dial tcp: lookup registry-1.docker.io on 127.0.0.53:53: server misbehaving
```

## Solutions

### Solution 1: Configure Docker Daemon DNS (Recommended - Requires sudo)

1. Create or edit `/etc/docker/daemon.json`:
```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json << EOF
{
  "dns": ["8.8.8.8", "8.8.4.4", "1.1.1.1"]
}
EOF
```

2. Restart Docker:
```bash
sudo systemctl restart docker
# OR
sudo service docker restart
```

3. Verify Docker is running:
```bash
docker info | grep -i dns
```

### Solution 2: Use Docker BuildKit with Host Network (Temporary Workaround)

Try building with BuildKit and host network mode:
```bash
DOCKER_BUILDKIT=1 docker build --network=host -t test-build ./server
```

### Solution 3: Pre-pull the Base Image

Try pulling the image manually first:
```bash
docker pull node:20-alpine
```

If that works, then try the build again:
```bash
docker compose build --no-cache
```

### Solution 4: Check Docker Desktop Settings (If using Docker Desktop)

If you're using Docker Desktop:
1. Open Docker Desktop
2. Go to Settings → Resources → Network
3. Check DNS settings
4. Try restarting Docker Desktop

### Solution 5: Use Alternative DNS Servers

If your router DNS (192.168.1.1) is having issues, configure Docker to use:
- Google DNS: 8.8.8.8, 8.8.4.4
- Cloudflare DNS: 1.1.1.1, 1.0.0.1
- Quad9: 9.9.9.9

### Solution 6: Check Network Connectivity

Test if you can reach Docker registry:
```bash
curl -I https://registry-1.docker.io/v2/
ping registry-1.docker.io
```

### Solution 7: Configure systemd-resolved (If using systemd)

If systemd-resolved is causing issues:
```bash
# Check status
resolvectl status

# Try flushing DNS cache
sudo systemd-resolve --flush-caches
# OR
sudo resolvectl flush-caches
```

## Quick Test

After applying Solution 1, test with:
```bash
docker pull node:20-alpine
docker compose build --no-cache
```
