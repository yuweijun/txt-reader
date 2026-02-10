#!/bin/bash
# Start script for txt-reader pure HTML/JS application

echo "Starting txt-reader server..."
echo "Access the application at: http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

# Change to views directory and start Python HTTP server
cd views && python -m http.server 8000