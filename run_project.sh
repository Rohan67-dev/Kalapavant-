#!/bin/bash

# Terminate all child processes on Ctrl+C or script termination
trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT

echo "=========================================================="
echo "          Kalapavant Platform Unified Launcher           "
echo "=========================================================="

# 1. Locate and Export JAVA_HOME
if [ ! -z "$JAVA_HOME" ] && [ ! -d "$JAVA_HOME" ]; then
    echo "Warning: JAVA_HOME is set to '$JAVA_HOME' but it is not a valid directory. Clearing it to auto-detect."
    unset JAVA_HOME
fi

if [ -z "$JAVA_HOME" ]; then
    if [ -d "/usr/lib/jvm/jdk-25.0.2-oracle-x64" ]; then
        export JAVA_HOME="/usr/lib/jvm/jdk-25.0.2-oracle-x64"
    else
        JAVA_PATH=$(readlink -f $(which java) 2>/dev/null)
        if [ ! -z "$JAVA_PATH" ]; then
            export JAVA_HOME=$(dirname $(dirname "$JAVA_PATH"))
        fi
    fi
fi

if [ -z "$JAVA_HOME" ]; then
    echo "WARNING: JAVA_HOME could not be set automatically. Maven build might fail."
else
    echo "Using JAVA_HOME: $JAVA_HOME"
fi

# 2. Setup and run Python AI Service
echo "Starting AI Service setup..."
cd ai-service
if [ ! -d "venv" ]; then
    echo "Creating python virtual environment..."
    python3 -m venv venv
fi

echo "Installing Python dependencies..."
./venv/bin/pip install -r requirements.txt

echo "Starting AI Service in the background..."
./venv/bin/python main.py &
cd ..

# 3. Start Spring Boot Backend
echo "Starting Spring Boot Backend..."
cd backend
chmod +x mvnw

# Automatically kill any process running on port 8080
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "Port 8080 is already in use. Killing the existing backend process..."
    kill -9 $(lsof -t -i:8080) 2>/dev/null
    sleep 1
fi

./mvnw spring-boot:run
