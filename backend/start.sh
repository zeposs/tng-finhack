#!/bin/bash
export PATH="/home/hackgpt/.conda/envs/tng-finhack/bin:$PATH"
cd /home/hackgpt/tng-finhack/backend
exec python app.py >> /tmp/backend.log 2>&1
