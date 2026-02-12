#!/bin/bash
# Start script for txt-reader pure HTML/JS application

echo "Starting txt-reader server..."
echo "Access the application at: http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

# Change to reader directory and start Python HTTP server
cd reader && python -m http.server 8000