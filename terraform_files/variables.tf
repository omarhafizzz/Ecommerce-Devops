variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-central-1"
}

variable "project" {
  description = "Project name prefix for all resources"
  type        = string
  default     = "ecommerce"
}

# Ubuntu 22.04 LTS in eu-central-1
variable "ami_id" {
  description = "AMI ID (Ubuntu 22.04 LTS eu-central-1)"
  type        = string
  default     = "ami-0faab6bdbac9486fb"
}

variable "key_pair_name" {
  description = "Existing AWS key pair name"
  type        = string
  default     = "My_Key"
}

# عدد الـ worker nodes (default 2)
variable "worker_count" {
  description = "Number of Kubernetes worker nodes"
  type        = number
  default     = 2
}
