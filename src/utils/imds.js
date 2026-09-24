const http = require('http');

let cachedMetadata = null;

function requestWithTimeout(options, postData = null, timeoutMs = 200) {
  return new Promise((resolve, reject) => {
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
          resolve({ statusCode: res.statusCode, body });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('IMDS request timed out'));
    });

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
        host: '169.254.169.254',
        path: '/latest/api/token',
        method: 'PUT',
        headers: {
          'X-aws-ec2-metadata-token-ttl-seconds': '60'
        }
      },
      null,
      200
    );

    if (tokenRes.statusCode === 200 && tokenRes.body) {
      token = tokenRes.body.trim();
    }
  } catch {
    // IMDSv2 token unavailable or timeout
  }

  // Step 2: Query metadata with token (IMDSv2) or directly (IMDSv1 fallback)
  const headers = token ? { 'X-aws-ec2-metadata-token': token } : {};

  try {
    const [azRes, idRes] = await Promise.all([
      requestWithTimeout(
        {
          host: '169.254.169.254',
          path: '/latest/meta-data/placement/availability-zone',
          method: 'GET',
          headers
        },
        null,
        200
      ).catch(() => ({ statusCode: 404, body: '' })),
      requestWithTimeout(
        {
          host: '169.254.169.254',
          path: '/latest/meta-data/instance-id',
          method: 'GET',
          headers
        },
        null,
        200
      ).catch(() => ({ statusCode: 404, body: '' }))
    ]);

    const availabilityZone =
      azRes.statusCode === 200 && azRes.body.trim() ? azRes.body.trim() : 'local-dev';
    const instanceId = idRes.statusCode === 200 && idRes.body.trim() ? idRes.body.trim() : null;

    cachedMetadata = {
      availabilityZone,
      instanceId,
      isAws: availabilityZone !== 'local-dev'
    };
    return cachedMetadata;
  } catch {
    cachedMetadata = {
      availabilityZone: 'local-dev',
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
