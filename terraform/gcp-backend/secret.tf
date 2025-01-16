resource "google_secret_manager_secret" "db_url" {
  secret_id = "DB_URL"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_url_initial" {
  secret      = google_secret_manager_secret.db_url.id
  secret_data = var.secret_db_url
}

resource "google_secret_manager_secret" "jwt_private_key" {
  secret_id = "JWT_PRIVATE_KEY"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "jwt_private_key_initial" {
  secret      = google_secret_manager_secret.jwt_private_key.id
  secret_data = var.secret_jwt_private_key
}

resource "google_secret_manager_secret" "jwt_public_key" {
  secret_id = "JWT_PUBLIC_KEY"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "jwt_public_key_initial" {
  secret      = google_secret_manager_secret.jwt_public_key.id
  secret_data = var.secret_jwt_public_key
}

resource "google_secret_manager_secret" "docs_user" {
  secret_id = "DOCS_USER"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "docs_user_initial" {
  secret      = google_secret_manager_secret.docs_user.id
  secret_data = var.secret_docs_user
}

resource "google_secret_manager_secret" "docs_password" {
  secret_id = "DOCS_PASSWORD"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "docs_password_initial" {
  secret      = google_secret_manager_secret.docs_password.id
  secret_data = var.secret_docs_password
}

resource "google_secret_manager_secret" "passkey_rpname" {
  secret_id = "PASSKEY_RPNAME"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "passkey_rpname_initial" {
  secret      = google_secret_manager_secret.passkey_rpname.id
  secret_data = var.secret_passkey_rpname
}

resource "google_secret_manager_secret" "passkey_rpid" {
  secret_id = "PASSKEY_RPID"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "passkey_rpid_initial" {
  secret      = google_secret_manager_secret.passkey_rpid.id
  secret_data = var.secret_passkey_rpid
}

resource "google_secret_manager_secret" "passkey_origin" {
  secret_id = "PASSKEY_ORIGIN"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "passkey_origin_initial" {
  secret      = google_secret_manager_secret.passkey_origin.id
  secret_data = var.secret_passkey_origin
}

resource "google_secret_manager_secret" "aes_key" {
  secret_id = "AES_KEY"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "aes_key_initial" {
  secret      = google_secret_manager_secret.aes_key.id
  secret_data = var.secret_aes_key
}

resource "google_secret_manager_secret" "sentry_dsn" {
  secret_id = "SENTRY_DSN"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "sentry_dsn_initial" {
  secret      = google_secret_manager_secret.sentry_dsn.id
  secret_data = var.secret_sentry_dsn
}

resource "google_secret_manager_secret" "infura_api_key" {
  secret_id = "INFURA_API_KEY"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "infura_api_key_initial" {
  secret      = google_secret_manager_secret.infura_api_key.id
  secret_data = var.secret_infura_api_key
}
