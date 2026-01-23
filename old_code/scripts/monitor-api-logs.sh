#!/bin/bash

echo "=== Monitoring API Server (PID 33136) ==="
echo "Press Ctrl+C to stop"
echo ""

# Monitor the running process output
# Since it's running under tsx watch, we need to follow its output
strace -p 33136 -e trace=network,read,write -s 1000 2>&1 | while read line; do
    timestamp=$(date '+%H:%M:%S.%3N')
    echo "[$timestamp] $line"
done
