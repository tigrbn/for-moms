#!/bin/bash
# Обновление фронта на сервере. Запускать из корня репозитория: bash scripts/update-frontend.sh
# Перед этим сделайте git pull на сервере.
set -e
cd "$(dirname "$0")/../web"
echo "Устанавливаю зависимости..."
npm ci
echo "Собираю фронт..."
npm run build
echo "Готово. Фронт собран в web/dist."
echo ""
echo "Если nginx раздаёт из /var/www/formoms, выполните:"
echo "  sudo cp -r /root/formoms/web/dist/* /var/www/formoms/"
echo "  sudo systemctl reload nginx"
