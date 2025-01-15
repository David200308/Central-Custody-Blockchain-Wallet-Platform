resource "google_compute_network" "vpc_network" {
  project                 = "${var.gcp_project_id}"
  name                    = "default"
  auto_create_subnetworks = true
  routing_mode            = "REGIONAL"
  mtu                     = 1460
}
