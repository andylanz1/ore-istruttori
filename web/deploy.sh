#!/bin/bash
# Deploy script per ore-istruttori sulla VPS
# Eseguire dalla directory web/ del repo sulla VPS

set -e

# Genera AUTH_SECRET se non esiste il file di configurazione
if [ ! -f .env ]; then
  SECRET=$(openssl rand -base64 32)
  echo "AUTH_SECRET=$SECRET" > .env
  echo "Generato nuovo AUTH_SECRET"
fi

# Build e avvio
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "Deploy completato!"
echo "Attendere ~30s per il primo avvio (migration + build cache)"
echo "URL: https://istruttori.olisticzone.it"
