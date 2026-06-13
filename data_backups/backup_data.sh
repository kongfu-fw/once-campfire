#!/bin/bash
# Backup Campfire data from Docker volume
# The backup will be saved with a timestamp in this directory

BACKUP_DIR=$(cd $(dirname $0) && pwd)
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/campfire_backup_${TIMESTAMP}.tar"
VOLUME_NAME="once-campfire_campfire_data"

echo "Starting backup of volume: ${VOLUME_NAME}..."
docker run --rm \
  -v ${VOLUME_NAME}:/volume \
  -v ${BACKUP_DIR}:/backup \
  ubuntu tar cvf /backup/campfire_backup_${TIMESTAMP}.tar -C /volume .

echo ""
echo "✅ Backup completed successfully!"
echo "Backup file saved to: ${BACKUP_FILE}"
