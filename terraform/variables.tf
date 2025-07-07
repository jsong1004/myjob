variable "project_id" {
  description = "The GCP project ID to deploy to."
  type        = string
}

variable "region" {
  description = "The GCP region to deploy to."
  type        = string
  default     = "us-west1"
}

variable "service_name" {
  description = "The name of the Cloud Run service."
  type        = string
  default     = "myjob-app"
}

variable "github_repository_owner" {
  description = "The owner of the GitHub repository (username or organization)."
  type        = string
}

variable "github_repository_name" {
  description = "The name of the GitHub repository."
  type        = string
} 