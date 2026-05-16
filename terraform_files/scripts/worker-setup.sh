#!/bin/bash
set -e
exec > /var/log/user-data.log 2>&1

# ============================================================
# الـ worker بيجيب الـ join command أوتوماتيك من الـ master
# بس محتاج تحط الـ MASTER_PRIVATE_IP الصح
# ============================================================
MASTER_PRIVATE_IP="10.0.1.210"   # ← غير ده لو اتغير
# ============================================================

echo "========== [1/6] System update =========="
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates socat conntrack

echo "========== [2/6] Disable swap =========="
swapoff -a
sed -i '/swap/d' /etc/fstab

echo "========== [3/6] Kernel modules & sysctl =========="
cat > /etc/modules-load.d/k8s.conf <<EOF
overlay
br_netfilter
EOF
modprobe overlay
modprobe br_netfilter

cat > /etc/sysctl.d/k8s.conf <<EOF
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
sysctl --system

echo "========== [4/6] Install Docker (container runtime) =========="
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io

mkdir -p /etc/containerd
containerd config default | tee /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
systemctl restart containerd
systemctl enable containerd
usermod -aG docker ubuntu

echo "========== [5/6] Install kubeadm, kubelet, kubectl =========="
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /" \
  | tee /etc/apt/sources.list.d/kubernetes.list
apt-get update -y
apt-get install -y kubelet kubeadm kubectl
apt-mark hold kubelet kubeadm kubectl
systemctl enable kubelet

echo "========== [FIX] Install Node Exporter =========="
NODE_VERSION="1.7.0"
wget -q https://github.com/prometheus/node_exporter/releases/download/v${NODE_VERSION}/node_exporter-${NODE_VERSION}.linux-amd64.tar.gz -O /tmp/node_exporter.tar.gz
tar -xzf /tmp/node_exporter.tar.gz -C /tmp/
cp /tmp/node_exporter-${NODE_VERSION}.linux-amd64/node_exporter /usr/local/bin/
rm -rf /tmp/node_exporter*

useradd --no-create-home --shell /bin/false node_exporter || true

cat > /etc/systemd/system/node_exporter.service <<'EOF'
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable node_exporter
systemctl start node_exporter

echo "========== [6/6] Join Kubernetes Cluster =========="
# استنى الـ master يبقى ready
echo "Waiting for master to be reachable..."
COUNT=0
until nc -z $MASTER_PRIVATE_IP 6443 2>/dev/null; do
    echo "Master not ready yet... ($COUNT)"
    sleep 10
    COUNT=$((COUNT+1))
    if [ $COUNT -gt 30 ]; then
        echo "Master unreachable, check security groups!"
        break
    fi
done

# جيب الـ join command من الـ master عبر SSM أو من الـ file
# لو الـ master خلّص setup هيبقى في /home/ubuntu/worker-join.sh
# بس هنا بنستخدم الـ token اللي اتعمل أوتوماتيك
echo "Joining cluster..."
JOIN_CMD=$(ssh -o StrictHostKeyChecking=no -i /tmp/key.pem ubuntu@$MASTER_PRIVATE_IP "cat /home/ubuntu/worker-join.sh" 2>/dev/null || echo "")

if [ -n "$JOIN_CMD" ]; then
    eval "$JOIN_CMD"
else
    echo "Could not get join command automatically."
    echo "Run manually: sudo \$(ssh ubuntu@$MASTER_PRIVATE_IP 'cat /home/ubuntu/worker-join.sh')"
fi

echo "========== Worker Setup Complete =========="
echo "Go to master and run: kubectl get nodes"
