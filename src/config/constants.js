const CONSTANTS = {
  SERVER: {
    DEFAULT_PORT: 3000,
    HOST: '0.0.0.0',
    SHUTDOWN_TIMEOUT_MS: 10000,
    DEFAULT_CORS_ORIGIN: '*',
    JSON_BODY_LIMIT: '100kb',
    DEFAULT_REQUESTS_COUNT: 1
  },
  DATABASE: {
    DEFAULT_HOST: '127.0.0.1',
    DEFAULT_PORT: 3306,
    DEFAULT_USER: 'pxluser',
    DEFAULT_NAME: 'pxldb',
    DEFAULT_CONNECT_TIMEOUT_MS: 5000,
    DEFAULT_HEALTH_CHECK_INTERVAL_MS: 10000,
    DEFAULT_PING_TIMEOUT_MS: 2000,
    POOL: {
      CONNECTION_LIMIT: 10,
      MAX_IDLE: 10,
      IDLE_TIMEOUT_MS: 60000,
      QUEUE_LIMIT: 0,
      KEEP_ALIVE_INITIAL_DELAY_MS: 10000
    }
  },
  IMDS: {
    ENDPOINT: '169.254.169.254',
    TOKEN_PATH: '/latest/api/token',
    TOKEN_TTL_HEADER: 'X-aws-ec2-metadata-token-ttl-seconds',
    TOKEN_TTL_SECONDS: '60',
    TOKEN_HEADER: 'X-aws-ec2-metadata-token',
    AZ_PATH: '/latest/meta-data/placement/availability-zone',
    INSTANCE_ID_PATH: '/latest/meta-data/instance-id',
    TIMEOUT_MS: 200,
    FALLBACK_AZ: 'local-dev'
  },
  CONTACTS: {
    DEFAULT_DEPARTMENT: 'General',
    MAX_NAME_LENGTH: 100,
    MAX_EMAIL_LENGTH: 100,
    MAX_DEPARTMENT_LENGTH: 100
  },
  SYSTEM: {
    BYTES_PER_MB: 1024 * 1024,
    DEFAULT_LOOPBACK_IP: '127.0.0.1'
  }
};

module.exports = CONSTANTS;
