#!/bin/bash
cd /home/kavia/workspace/code-generation/reactfasttictactoe-114000-6e0d846a/tic_tac_toe_frontend_workspace/tic_tac_toe_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

