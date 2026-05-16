#!/bin/bash
set -e
exec > /var/log/user-data.log 2>&1

echo "========== [1/4] System update =========="
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates

echo "========== [2/4] Install Prometheus =========="
PROM_VERSION="2.51.0"
useradd --no-create-home --shell /bin/false prometheus || true

mkdir -p /etc/prometheus /var/lib/prometheus

wget -q https://github.com/prometheus/prometheus/releases/download/v${PROM_VERSION}/prometheus-${PROM_VERSION}.linux-amd64.tar.gz -O /tmp/prometheus.tar.gz
tar -xzf /tmp/prometheus.tar.gz -C /tmp/
cp /tmp/prometheus-${PROM_VERSION}.linux-amd64/prometheus /usr/local/bin/
cp /tmp/prometheus-${PROM_VERSION}.linux-amd64/promtool   /usr/local/bin/
cp -r /tmp/prometheus-${PROM_VERSION}.linux-amd64/consoles        /etc/prometheus/
cp -r /tmp/prometheus-${PROM_VERSION}.linux-amd64/console_libraries /etc/prometheus/
rm -rf /tmp/prometheus*

chown -R prometheus:prometheus /etc/prometheus /var/lib/prometheus
chmod -R 755 /etc/prometheus

# Prometheus config
cat > /etc/prometheus/prometheus.yml <<EOF
global:
  scrape_interval:     15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: []

rule_files: []

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
EOF

chown prometheus:prometheus /etc/prometheus/prometheus.yml

# Systemd service
cat > /etc/systemd/system/prometheus.service <<EOF
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus/ \
  --web.console.templates=/etc/prometheus/consoles \
  --web.console.libraries=/etc/prometheus/console_libraries \
  --web.listen-address=0.0.0.0:9090
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable prometheus
systemctl start prometheus

echo "========== [3/4] Install Node Exporter =========="
NODE_VERSION="1.7.0"
wget -q https://github.com/prometheus/node_exporter/releases/download/v${NODE_VERSION}/node_exporter-${NODE_VERSION}.linux-amd64.tar.gz -O /tmp/node_exporter.tar.gz
tar -xzf /tmp/node_exporter.tar.gz -C /tmp/
cp /tmp/node_exporter-${NODE_VERSION}.linux-amd64/node_exporter /usr/local/bin/
rm -rf /tmp/node_exporter*

useradd --no-create-home --shell /bin/false node_exporter || true

cat > /etc/systemd/system/node_exporter.service <<EOF
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

echo "========== [4/4] Install Grafana =========="
wget -q -O /usr/share/keyrings/grafana.key https://apt.grafana.com/gpg.key
echo "deb [signed-by=/usr/share/keyrings/grafana.key] https://apt.grafana.com stable main" | tee /etc/apt/sources.list.d/grafana.list
apt-get update -y
apt-get install -y grafana

# Pre-configure Prometheus as datasource
mkdir -p /etc/grafana/provisioning/datasources
cat > /etc/grafana/provisioning/datasources/prometheus.yml <<EOF
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://localhost:9090
    isDefault: true
    editable: true
EOF

systemctl daemon-reload
systemctl enable grafana-server
systemctl start grafana-server

echo "========== Monitoring setup complete =========="
echo "Prometheus : http://<public-ip>:9090"
echo "Grafana    : http://<public-ip>:3000  |  Default: admin / admin"
