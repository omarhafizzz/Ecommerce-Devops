#!/bin/bash
set -e
exec > /var/log/user-data.log 2>&1

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

echo "========== [6/6] Initialize Kubernetes Master =========="
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
PRIVATE_IP=$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4)

kubeadm init \
  --apiserver-advertise-address=$PRIVATE_IP \
  --apiserver-cert-extra-sans=$PUBLIC_IP \
  --pod-network-cidr=192.168.0.0/16 \
  --ignore-preflight-errors=all

mkdir -p /home/ubuntu/.kube
cp /etc/kubernetes/admin.conf /home/ubuntu/.kube/config
chown ubuntu:ubuntu /home/ubuntu/.kube/config
export KUBECONFIG=/etc/kubernetes/admin.conf

echo "========== Install Calico CNI =========="
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml

echo "========== Install NGINX Ingress Controller =========="
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml

echo "========== Install Metrics Server =========="
kubectl apply -f https://github.com/kubernetes-metrics-server/metrics-server/releases/latest/download/components.yaml

echo "========== Wait for Master & CNI to be Ready =========="
sleep 60
kubectl get nodes

# ============================================================
# FIX 1: Create PersistentVolume for Postgres
# ============================================================
echo "========== [FIX 1] Create PersistentVolume for Postgres =========="
mkdir -p /mnt/postgres-data
chown -R 999:999 /mnt/postgres-data

kubectl apply -f - <<'YAML'
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: postgres-pv
spec:
  capacity:
    storage: 5Gi
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  hostPath:
    path: /mnt/postgres-data
  persistentVolumeReclaimPolicy: Retain
YAML

# ============================================================
# FIX 2: Deploy Ecommerce App from GitHub
# ============================================================
echo "========== [FIX 2] Deploy Ecommerce App =========="
REPO_RAW="https://raw.githubusercontent.com/omarhafizzz/Ecommerce-Devops/main/k8s"

kubectl apply -f $REPO_RAW/00-namespace.yaml
kubectl apply -f $REPO_RAW/01-secrets.yaml
kubectl apply -f $REPO_RAW/02-postgres-pvc.yaml
kubectl apply -f $REPO_RAW/03-postgres-configmap.yaml
kubectl apply -f $REPO_RAW/04-postgres-deployment.yaml
kubectl apply -f $REPO_RAW/05-backend-deployment.yaml
kubectl apply -f $REPO_RAW/06-frontend-deployment.yaml

echo "Waiting for Postgres to be ready..."
kubectl wait --for=condition=ready pod -l app=postgresdb -n ecommerce --timeout=180s || true
sleep 10
kubectl apply -f $REPO_RAW/08-db-seed-job.yaml

# ============================================================
# FIX 3: Apply correct Ingress
# ============================================================
echo "========== [FIX 3] Apply Correct Ingress =========="
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=controller -n ingress-nginx --timeout=120s || true

kubectl apply -f - <<'YAML'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ecommerce-ingress
  namespace: ecommerce
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: 10m
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/rewrite-target: /api/$2
spec:
  ingressClassName: nginx
  rules:
  - http:
      paths:
      - path: /api(/|$)(.*)
        pathType: ImplementationSpecific
        backend:
          service:
            name: backend-service
            port:
              number: 5000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
YAML

# ============================================================
# FIX 4: Install node-exporter as systemd service
# ============================================================
echo "========== [FIX 4] Install Node Exporter =========="
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

# ============================================================
# FIX 5: Save worker join command
# ============================================================
echo "========== [FIX 5] Save Worker Join Command =========="
sleep 10
JOIN_CMD=$(kubeadm token create --print-join-command)
echo "#!/bin/bash" > /home/ubuntu/worker-join.sh
echo "sudo $JOIN_CMD" >> /home/ubuntu/worker-join.sh
chmod +x /home/ubuntu/worker-join.sh
chown ubuntu:ubuntu /home/ubuntu/worker-join.sh

# ============================================================
# Summary
# ============================================================
echo ""
echo "======================================================"
echo "  SETUP COMPLETE!"
echo "  APP URL:   http://$PUBLIC_IP:32754"
echo "  JOIN CMD:  cat /home/ubuntu/worker-join.sh"
echo "======================================================"
kubectl get nodes
kubectl get pods -n ecommerce
