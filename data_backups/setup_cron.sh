#!/bin/bash
# Setup a cron job for daily Campfire backups

SCRIPT_DIR=$(cd $(dirname $0) && pwd)
BACKUP_SCRIPT="${SCRIPT_DIR}/backup_data.sh"

# Define the cron schedule (Every day at 2:00 AM)
CRON_SCHEDULE="0 2 * * *"
# The command uses bash to execute the backup script and logs output to cron_backup.log
CRON_COMMAND="bash $BACKUP_SCRIPT >> ${SCRIPT_DIR}/cron_backup.log 2>&1"
CRON_JOB="$CRON_SCHEDULE $CRON_COMMAND"

echo "Checking for existing backup cron jobs..."

# Check if the cron job already exists by searching for the script path
if crontab -l 2>/dev/null | grep -Fq "$BACKUP_SCRIPT"; then
  echo "✅ A cron job for Campfire backups already exists!"
  echo "Current crontab entry:"
  crontab -l | grep -F "$BACKUP_SCRIPT"
  exit 0
fi

# Add the new cron job
echo "No existing cron job found. Adding new cron job..."
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Cron job successfully added!"
echo "Backups will run automatically according to the schedule: $CRON_SCHEDULE (Every day at 2:00 AM)"
echo "Logs will be saved to: ${SCRIPT_DIR}/cron_backup.log"
