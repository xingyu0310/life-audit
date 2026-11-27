#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
  python3 launch.py
else
  echo 'Python 3 is required to start Life Audit.'
  read -r '?Press Enter to close.'
fi
