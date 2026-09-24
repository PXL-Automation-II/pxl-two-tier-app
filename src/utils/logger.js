function formatTimestamp() {
  return new Date().toISOString();
}

const logger = {
  info: (msg, ...args) => console.log(`[${formatTimestamp()}] [INFO] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[${formatTimestamp()}] [WARN] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[${formatTimestamp()}] [ERROR] ${msg}`, ...args),
  debug: (msg, ...args) => {
    if (process.env.DEBUG === 'true') {
      console.log(`[${formatTimestamp()}] [DEBUG] ${msg}`, ...args);
    }
  }
};

module.exports = logger;
