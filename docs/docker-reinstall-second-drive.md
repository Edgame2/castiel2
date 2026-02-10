# Docker Engine reinstall with data on second drive

## Summary
- **Remove:** Snap Docker + any apt Docker/containerd. No data to keep.
- **Second drive:** `/dev/sdb` 500G (empty). Use for Docker data root.
- **Goal:** Docker Engine (CLI + daemon) with data on `/mnt/docker-data`.

---

## Step 1 — Stop and remove Docker (Snap + apt)

```bash
# Stop containers and Docker
sudo snap stop docker
sudo docker stop $(sudo docker ps -aq) 2>/dev/null || true

# Remove Snap Docker
sudo snap remove docker --purge

# Remove Ubuntu Docker packages (if present)
sudo apt-get purge -y docker.io containerd runc 2>/dev/null || true
sudo apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 2>/dev/null || true
sudo apt-get autoremove -y

# Remove old data and config (optional, clean slate)
sudo rm -rf /var/lib/docker /var/lib/containerd /etc/docker ~/.docker
```

---

## Step 2 — Prepare second drive (sdb) and mount

```bash
# Create one partition on sdb (use entire disk)
echo 'type=83' | sudo sfdisk /dev/sdb

# Format as ext4
sudo mkfs.ext4 -L docker-data /dev/sdb1

# Create mount point and mount
sudo mkdir -p /mnt/docker-data
sudo mount /dev/sdb1 /mnt/docker-data

# Add to fstab so it mounts on boot (use UUID for stability)
UUID=$(sudo blkid -s UUID -o value /dev/sdb1)
echo "UUID=$UUID /mnt/docker-data ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab
```

---

## Step 3 — Install Docker Engine (official repo)

```bash
# Add Docker's official GPG key and repo
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME:-$VERSION_ID}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

---

## Step 4 — Point Docker data to second drive

```bash
sudo mkdir -p /etc/docker
echo '{"data-root": "/mnt/docker-data"}' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
sudo systemctl enable docker
```

---

## Step 5 — Verify

```bash
docker info | grep "Docker Root Dir"
# Should show: Docker Root Dir: /mnt/docker-data

docker run --rm hello-world
```

---

## One-liner reference (run steps in order; Step 2 is destructive on sdb)

After Step 2, ensure `/mnt/docker-data` is mounted before Step 4.
