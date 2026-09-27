const http = require('http');
const CONSTANTS = require('../config/constants');

let cachedMetadata = null;

function requestWithTimeout(options, postData = null, timeoutMs = CONSTANTS.IMDS.TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let timer = null;
    const req = http.request(
      {
        ...options,
        timeout: timeoutMs
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (timer) clearTimeout(timer);
          resolve({ statusCode: res.statusCode, body });
        });
      }
    );

    req.on('error', (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });

    timer = setTimeout(() => {
      req.destroy();
      reject(new Error('IMDS request timed out'));
    }, timeoutMs);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function resolveAwsMetadata() {
  if (cachedMetadata) {
    return cachedMetadata;
  }

  let token = null;

  // Step 1: Request IMDSv2 session token
  try {
    const tokenRes = await requestWithTimeout(
      {
        host: CONSTANTS.IMDS.ENDPOINT,
        path: CONSTANTS.IMDS.TOKEN_PATH,
        method: 'PUT',
        headers: {
          [CONSTANTS.IMDS.TOKEN_TTL_HEADER]: CONSTANTS.IMDS.TOKEN_TTL_SECONDS
        }
      },
      null,
      CONSTANTS.IMDS.TIMEOUT_MS
    );

    if (tokenRes.statusCode === 200 && tokenRes.body) {
      token = tokenRes.body.trim();
    }
  } catch {
    // IMDSv2 token unavailable or timeout
  }

  // Step 2: Query metadata with token (IMDSv2) or directly (IMDSv1 fallback)
  const headers = token ? { [CONSTANTS.IMDS.TOKEN_HEADER]: token } : {};

  try {
    const [azRes, idRes] = await Promise.all([
      requestWithTimeout(
        {
          host: CONSTANTS.IMDS.ENDPOINT,
          path: CONSTANTS.IMDS.AZ_PATH,
          method: 'GET',
          headers
        },
        null,
        CONSTANTS.IMDS.TIMEOUT_MS
      ).catch(() => ({ statusCode: 404, body: '' })),
      requestWithTimeout(
        {
          host: CONSTANTS.IMDS.ENDPOINT,
          path: CONSTANTS.IMDS.INSTANCE_ID_PATH,
          method: 'GET',
          headers
        },
        null,
        CONSTANTS.IMDS.TIMEOUT_MS
      ).catch(() => ({ statusCode: 404, body: '' }))
    ]);

    const availabilityZone =
      azRes.statusCode === 200 && azRes.body.trim()
        ? azRes.body.trim()
        : CONSTANTS.IMDS.FALLBACK_AZ;
    const instanceId = idRes.statusCode === 200 && idRes.body.trim() ? idRes.body.trim() : null;

    cachedMetadata = {
      availabilityZone,
      instanceId,
      isAws: availabilityZone !== CONSTANTS.IMDS.FALLBACK_AZ
    };
    return cachedMetadata;
  } catch {
    cachedMetadata = {
      availabilityZone: CONSTANTS.IMDS.FALLBACK_AZ,
      instanceId: null,
      isAws: false
    };
    return cachedMetadata;
  }
}

function getCachedAwsMetadata() {
  return (
    cachedMetadata || {
      availabilityZone: 'local-dev',
      instanceId: null,
      isAws: false
    }
  );
}

module.exports = {
  resolveAwsMetadata,
  getCachedAwsMetadata
};
