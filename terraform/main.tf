# Enable necessary Google Cloud services
resource "google_project_service" "run" {
  project = var.project_id
  service = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifactregistry" {
  project = var.project_id
  service = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudbuild" {
  project = var.project_id
  service = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

# Create an Artifact Registry repository to store Docker images
resource "google_artifact_registry_repository" "repo" {
  project       = var.project_id
  location      = var.region
  repository_id = "${var.service_name}-repo"
  description   = "Docker repository for ${var.service_name}"
  format        = "DOCKER"

  depends_on = [google_project_service.artifactregistry]
}

# Create a Cloud Run service with a placeholder image
resource "google_cloud_run_v2_service" "default" {
  project  = var.project_id
  name     = var.service_name
  location = var.region

  depends_on = [
    google_artifact_registry_repository.repo,
    google_project_service.run
  ]

  template {
    containers {
      # Use a placeholder hello-world image initially
      # You'll update this after building your actual image
      image = "gcr.io/cloudrun/hello"
    }
  }
}

# Allow unauthenticated access to the Cloud Run service
resource "google_cloud_run_service_iam_member" "noauth" {
  project  = google_cloud_run_v2_service.default.project
  location = google_cloud_run_v2_service.default.location
  service  = google_cloud_run_v2_service.default.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# TODO: Add Cloud Build trigger later after GitHub connection is set up
# resource "google_cloudbuild_trigger" "default" {
#   project  = var.project_id
#   name     = "${var.service_name}-trigger"
#   location = var.region
#
#   github {
#     owner = var.github_repository_owner
#     name  = var.github_repository_name
#     push {
#       branch = "^main$"
#     }
#   }
#
#   # Use the cloudbuild.yaml file from the repository
#   filename = "cloudbuild.yaml"
#
#   # Pass variables to the build
#   substitutions = {
#     _SERVICE_NAME = var.service_name
#     _LOCATION     = var.region
#     _REPO_ID      = google_artifact_registry_repository.repo.repository_id
#   }
#
#   depends_on = [google_project_service.cloudbuild]
# } 