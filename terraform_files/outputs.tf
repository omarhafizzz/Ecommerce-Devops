# ══════════════════════════════════════════════════════════════════════════
#  OUTPUTS
# ══════════════════════════════════════════════════════════════════════════

# ── Jenkins ────────────────────────────────────────────────────────────────
output "jenkins_ip" {
  description = "Jenkins EC2 Public IP"
  value       = aws_instance.jenkins.public_ip
}
output "jenkins_url" {
  description = "Jenkins UI (~5 min after launch)"
  value       = "http://${aws_instance.jenkins.public_ip}:8080"
}
output "ssh_jenkins" {
  description = "SSH into Jenkins"
  value       = "ssh -i My_Key.pem ubuntu@${aws_instance.jenkins.public_ip}"
}
output "check_jenkins" {
  description = "Watch Jenkins installation live"
  value       = "ssh -i My_Key.pem ubuntu@${aws_instance.jenkins.public_ip} 'sudo tail -f /var/log/user-data.log'"
}

# ── SonarQube ──────────────────────────────────────────────────────────────
output "sonarqube_ip" {
  description = "SonarQube EC2 Public IP"
  value       = aws_instance.sonarqube.public_ip
}
output "sonarqube_url" {
  description = "SonarQube UI (~10 min after launch)"
  value       = "http://${aws_instance.sonarqube.public_ip}:9000"
}
output "ssh_sonarqube" {
  description = "SSH into SonarQube"
  value       = "ssh -i My_Key.pem ubuntu@${aws_instance.sonarqube.public_ip}"
}
output "check_sonarqube" {
  description = "Watch SonarQube installation live"
  value       = "ssh -i My_Key.pem ubuntu@${aws_instance.sonarqube.public_ip} 'sudo tail -f /var/log/user-data.log'"
}

# ── Kubernetes Master ──────────────────────────────────────────────────────
output "k8s_master_ip" {
  description = "Kubernetes Master Public IP"
  value       = aws_instance.k8s_master.public_ip
}
output "k8s_master_private_ip" {
  description = "Kubernetes Master Private IP (للـ worker join command)"
  value       = aws_instance.k8s_master.private_ip
}
output "kubernetes_api" {
  description = "Kubernetes API (~15 min after launch)"
  value       = "https://${aws_instance.k8s_master.public_ip}:6443"
}
output "ssh_k8s_master" {
  description = "SSH into K8s Master"
  value       = "ssh -i My_Key.pem ubuntu@${aws_instance.k8s_master.public_ip}"
}
output "check_k8s_master" {
  description = "Watch K8s Master installation live"
  value       = "ssh -i My_Key.pem ubuntu@${aws_instance.k8s_master.public_ip} 'sudo tail -f /var/log/user-data.log'"
}

# ── Kubernetes Workers ─────────────────────────────────────────────────────
output "k8s_worker_ips" {
  description = "Kubernetes Workers Public IPs"
  value       = aws_instance.k8s_worker[*].public_ip
}
output "ssh_k8s_workers" {
  description = "SSH commands for each worker"
  value       = [for w in aws_instance.k8s_worker : "ssh -i My_Key.pem ubuntu@${w.public_ip}"]
}
output "check_k8s_workers" {
  description = "Watch workers installation live"
  value       = [for w in aws_instance.k8s_worker : "ssh -i My_Key.pem ubuntu@${w.public_ip} 'sudo tail -f /var/log/user-data.log'"]
}

# ── Monitoring ─────────────────────────────────────────────────────────────
output "prometheus_url" {
  description = "Prometheus UI"
  value       = "http://${aws_instance.monitoring.public_ip}:9090"
}
output "grafana_url" {
  description = "Grafana UI"
  value       = "http://${aws_instance.monitoring.public_ip}:3000"
}
output "ssh_monitoring" {
  description = "SSH into Monitoring"
  value       = "ssh -i My_Key.pem ubuntu@${aws_instance.monitoring.public_ip}"
}

# ── ملخص سريع ─────────────────────────────────────────────────────────────
output "cluster_summary" {
  description = "Kubernetes Cluster Summary"
  value = {
    master  = aws_instance.k8s_master.public_ip
    workers = aws_instance.k8s_worker[*].public_ip
  }
}
