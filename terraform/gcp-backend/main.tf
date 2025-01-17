# google_cloud_run_v2_service
# location: us-west1

resource "google_cloud_run_v2_service" "backend_cloud_run" {
  name     = "wallet-platform-backend"
  location = var.gcp_region

  lifecycle {
    ignore_changes = [client, client_version, template[0].containers[0].image, template[0].revision]
  }
  template {
    vpc_access {
      network_interfaces {
        network = google_compute_network.vpc_network.id
        tags    = ["backend"]
      }
      egress = "PRIVATE_RANGES_ONLY"
    }
    containers {
      image = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project_id}/backend/wallet-platform:latest"
      ports {
        container_port = 3001
      }
      env {
        name = "DB_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "JWT_PRIVATE_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_private_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "JWT_PUBLIC_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_public_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "DOCS_USER"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.docs_user.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "DOCS_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.docs_password.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "PASSKEY_RPNAME"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.passkey_rpname.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "PASSKEY_RPID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.passkey_rpid.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "PASSKEY_ORIGIN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.passkey_origin.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "AES_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.aes_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SENTRY_DSN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.sentry_dsn.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "INFURA_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.infura_api_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "HEALTH_CHECK_TOKEN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.health_check_token.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  traffic {
    percent = 100
  }

  depends_on = [
    google_secret_manager_secret.db_url,
    google_secret_manager_secret.jwt_private_key,
    google_secret_manager_secret.jwt_public_key,
    google_secret_manager_secret.docs_user,
    google_secret_manager_secret.docs_password,
    google_secret_manager_secret.passkey_rpname,
    google_secret_manager_secret.passkey_rpid,
    google_secret_manager_secret.passkey_origin,
    google_secret_manager_secret.aes_key,
    google_secret_manager_secret.sentry_dsn,
    google_secret_manager_secret.infura_api_key,
    google_secret_manager_secret.health-check-token
  ]
}

output "backend_cloud_run_output" {
  value = {
    uri = google_cloud_run_v2_service.backend_cloud_run.uri
  }
}
