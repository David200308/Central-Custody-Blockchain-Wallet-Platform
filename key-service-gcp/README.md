# Key Service README

## Tech Stack

- Go Language (Version 1.22.4)
- SQLite

## GCP KMS Setup

```
Key Location: <YOUR_GCP_PROJECT_LOCATION>
Key Purpose: Asymmetric decrypt
Key Algo: 3072 bit RSA key OAEP Padding - SHA256 Digest
```

## Code Usage & Deployment

```bash
sudo apt install gcc
mkdir key-service

wget https://go.dev/dl/go1.22.4.linux-amd64.tar.gz
tar -xzf go1.22.4.linux-amd64.tar.gz
rm go1.22.4.linux-amd64.tar.gz

cd key-service/
../go/bin/go mod tidy
CGO_ENABLED=1 ../go/bin/go build .
```

- Linux Systemctl Service (Create under root user)

```
[Unit]
Description=SaaS Wallet Key Service

[Service]
User=root
ExecStart=/home/<USER_NAME>/key-service/key-service
Restart=always

[Install]
WantedBy=multi-user.target
```
