#!/bin/bash
# Restore Campfire data to Docker volume

BACKUP_DIR=$(cd $(dirname $0) && pwd)
VOLUME_NAME="once-campfire_campfire_data"

if [ -z "$1" ]; then
  echo "Usage: ./restore_data.sh <backup_file.tar>"
  echo "Available backups in ${BACKUP_DIR}:"
  ls -1 ${BACKUP_DIR}/*.tar 2>/dev/null || echo "  No backup files found."
  exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: Backup file not found at $BACKUP_FILE"
  exit 1
fi

echo "⚠️  WARNING: This will overwrite current data in the ${VOLUME_NAME} volume!"
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore cancelled."
  exit 1
fi

echo "Stopping application..."
cd $(dirname $BACKUP_DIR) && docker compose down

echo "Restoring from ${BACKUP_FILE}..."
# Get the absolute path of the backup file directory and the filename
FILE_DIR=$(dirname $(realpath $BACKUP_FILE))
FILE_NAME=$(basename $BACKUP_FILE)

docker run --rm \
  -v ${VOLUME_NAME}:/volume \
  -v ${FILE_DIR}:/backup \
  ubuntu bash -c "rm -rf /volume/* && tar xvf /backup/${FILE_NAME} -C /volume"

echo ""
echo "✅ Restore completed successfully!"
echo "Starting application..."
cd $(dirname $BACKUP_DIR) && docker compose up -d
