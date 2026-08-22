# Dockerfile — Central Bank Policy Rates Comparison (TradingIndex)
# server.js uses Node.js built-ins (http, fs, path, child_process) and global fetch
# No npm install required for running the production server.
FROM node:20-alpine
WORKDIR /app
COPY . .
ENV PORT=7860
EXPOSE 7860
CMD ["node", "server.js"]
