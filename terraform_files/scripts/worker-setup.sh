#!/bin/bash
set -e
exec > /var/log/user-data.log 2>&1

# ============================================================
# !! مهم !! قبل ما تشغل السكريبت ده على الـ worker
# روح على الـ master وشغّل:
#   kubeadm token create --print-join-command
# والصق الـ output في المتغير ده تحت:
# ============================================================
JOIN_COMMAND="kubeadm join <MASTER_PRIVATE_IP>:6443 --token <TOKEN> --discovery-token-ca-cert-hash sha256:<HASH>"
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

# Configure containerd for Kubernetes
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

echo "========== [6/6] Join Kubernetes Cluster =========="
eval $JOIN_COMMAND

echo "========== Worker Setup Complete =========="
echo "Go to master and run: kubectl get nodes"
