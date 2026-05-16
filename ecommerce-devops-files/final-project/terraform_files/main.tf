########################################################
#  Ecommerce – Infrastructure
#  Region : eu-central-1
#  Servers: Jenkins | SonarQube | K8s Master | K8s Workers x2 | Monitoring
########################################################

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.3.0"
}

provider "aws" {
  region = var.aws_region
}

# ── VPC ────────────────────────────────────────────────────────────────────
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "${var.project}-vpc" }
}

# ── Internet Gateway ───────────────────────────────────────────────────────
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.project}-igw" }
}

# ── Public Subnet ──────────────────────────────────────────────────────────
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true
  tags = { Name = "${var.project}-public-subnet" }
}

# ── Route Table ────────────────────────────────────────────────────────────
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "${var.project}-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# ══════════════════════════════════════════════════════════════════════════
#  SECURITY GROUPS
# ══════════════════════════════════════════════════════════════════════════

# ── Jenkins SG ─────────────────────────────────────────────────────────────
resource "aws_security_group" "jenkins" {
  name        = "${var.project}-jenkins-sg"
  description = "Jenkins Server"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "Jenkins UI"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.project}-jenkins-sg" }
}

# ── SonarQube SG ───────────────────────────────────────────────────────────
resource "aws_security_group" "sonarqube" {
  name        = "${var.project}-sonarqube-sg"
  description = "SonarQube Server"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "SonarQube UI"
    from_port   = 9000
    to_port     = 9000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.project}-sonarqube-sg" }
}

# ── Kubernetes SG ──────────────────────────────────────────────────────────
# نفس الـ SG بيتطبق على المaster والـ workers
resource "aws_security_group" "kubernetes" {
  name        = "${var.project}-kubernetes-sg"
  description = "Kubernetes Multi-Node Cluster"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "K8s API Server"
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "Kubelet"
    from_port   = 10250
    to_port     = 10250
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "NodePort Services"
    from_port   = 30000
    to_port     = 32767
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  # HTTP/HTTPS للـ Ingress Controller
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  # Internal cluster traffic (بين الـ master والـ workers)
  ingress {
    description = "Internal cluster traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.project}-kubernetes-sg" }
}

# ── Monitoring SG ──────────────────────────────────────────────────────────
resource "aws_security_group" "monitoring" {
  name        = "${var.project}-monitoring-sg"
  description = "Prometheus + Grafana"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "Prometheus"
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "Blackbox Exporter"
    from_port   = 9115
    to_port     = 9115
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "Grafana"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.project}-monitoring-sg" }
}

# ══════════════════════════════════════════════════════════════════════════
#  EC2 INSTANCES
# ══════════════════════════════════════════════════════════════════════════

# ── Jenkins ────────────────────────────────────────────────────────────────
resource "aws_instance" "jenkins" {
  ami                    = var.ami_id
  instance_type          = "c7i-flex.large"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.jenkins.id]
  key_name               = var.key_pair_name

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  user_data = file("${path.module}/scripts/jenkins.sh")

  tags = { Name = "${var.project}-jenkins" }
}

# ── SonarQube ──────────────────────────────────────────────────────────────
resource "aws_instance" "sonarqube" {
  ami                    = var.ami_id
  instance_type          = "c7i-flex.large"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.sonarqube.id]
  key_name               = var.key_pair_name

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  user_data = file("${path.module}/scripts/sonarqube.sh")

  tags = { Name = "${var.project}-sonarqube" }
}

# ── Kubernetes Master ──────────────────────────────────────────────────────
resource "aws_instance" "k8s_master" {
  ami                    = var.ami_id
  instance_type          = "t3.medium"   # محتاج medium للـ master
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.kubernetes.id]
  key_name               = var.key_pair_name

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  user_data = file("${path.module}/scripts/master-setup.sh")

  tags = { Name = "${var.project}-k8s-master" }
}

# ── Kubernetes Workers ─────────────────────────────────────────────────────
resource "aws_instance" "k8s_worker" {
  count                  = var.worker_count
  ami                    = var.ami_id
  instance_type          = "t3.medium"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.kubernetes.id]
  key_name               = var.key_pair_name

  root_block_device {
    volume_size = 25
    volume_type = "gp3"
  }

  user_data = file("${path.module}/scripts/worker-setup.sh")

  tags = { Name = "${var.project}-k8s-worker-${count.index + 1}" }
}

# ── Monitoring ─────────────────────────────────────────────────────────────
resource "aws_instance" "monitoring" {
  ami                    = var.ami_id
  instance_type          = "t3.small"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.monitoring.id]
  key_name               = var.key_pair_name

  root_block_device {
    volume_size = 15
    volume_type = "gp3"
  }

  user_data = file("${path.module}/scripts/monitoring.sh")

  tags = { Name = "${var.project}-monitoring" }
}
