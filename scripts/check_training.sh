#!/bin/bash
echo "=== Jais Training Status ==="
PID=$(pgrep -f jais_train.py | head -1)
if [ -z "$PID" ]; then
  echo "STOPPED - no training process found"
else
  echo "Running PID=$PID"
  nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader
fi
echo ""
echo "=== Loss values from log ==="
grep "loss" /tmp/jais_train.log | grep -v "FutureWarning\|grad_clip\|gradient" | tail -15
echo ""
echo "=== Last progress line ==="
grep "it/s\|s/it" /tmp/jais_train.log | tail -3
