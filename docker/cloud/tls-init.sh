#!/bin/sh
# Creates a self-signed certificate for the tenant databases unless one is already
# present in /tls. To use a real certificate, put server.crt and server.key (PEM) in
# docker/volumes/cloud-tls before starting; this script then only fixes permissions.
set -eu
cd /tls
if [ ! -f server.crt ] || [ ! -f server.key ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 825 \
    -subj "/CN=${TLS_HOSTNAME:-localhost}" \
    -addext "subjectAltName=DNS:${TLS_HOSTNAME:-localhost},DNS:localhost,IP:127.0.0.1,DNS:tenant-postgres,DNS:tenant-mongodb" \
    -keyout server.key -out server.crt
  echo "[tls] generated self-signed certificate for ${TLS_HOSTNAME:-localhost}"
fi
# A self-signed certificate is its own CA (MongoDB requires a CA file).
[ -f ca.crt ] || cp server.crt ca.crt
cat server.key server.crt > server.pem
# postgres and mongo images both run as uid 999; both require private keys to be private.
chown 999:999 server.key server.crt server.pem
chmod 600 server.key server.pem
chown 999:999 ca.crt
chmod 644 server.crt ca.crt
