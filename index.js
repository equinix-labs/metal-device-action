const https = require('https');
const {URL} = require('url');
const core = require('@actions/core');

const userAgent = 'gh-action-device';

// GitHub Actions Inputs
const authToken = core.getInput('metal_auth_token', {required: true});
const projectId = core.getInput('metal_project_id', {required: true});
const metro = core.getInput('metro', {required: true});
const plan = core.getInput('plan', {required: true});
const os = core.getInput('os', {required: true});
const userData = core.getInput('user_data');
const provisioning_timeout = core.getInput('provisioning_timeout');

// Provision Server
async function createServer() {
  const data = JSON.stringify({
    metro,
    operating_system: os,
    plan,
    user_data: userData
  });

  core.info(
    `Provisioning server...
        project: ${projectId}
        metro: ${metro}
        plan: ${plan}
        OS: ${os}`
  );

  // Create Equinix Metal Device
  try {
    const url = new URL(
      `https://api.equinix.com/metal/v1/projects/${projectId}/devices`
    );
    const options = {
      body: data,
      headers: {
        'Content-Length': data.length,
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        'X-Auth-Token': authToken
      },
      method: 'POST'
    };

    const serverId = await new Promise((resolve, reject) => {
      const req = https.request(url, options, res => {
        let response = '';

        res.on('data', chunk => {
          response += chunk;
        });

        res.on('end', error => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const id = JSON.parse(response).id;
            resolve(id);
          } else {
            error = new Error('Request Failed.\n' + `Response: ${response}`);
            reject(error);
          }
        });
      });

      req.on('error', error => {
        reject(error);
      });

      req.write(data);
      req.end();
    });

    return serverId;
  } catch (error) {
    core.error(`Server provisioning failed: ${error.message}`);
    throw error;
  }
}

async function getStatus(serverId) {
  try {
    const serverStatus = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.equinix.com',
        path: `/metal/v1/devices/${serverId}`,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': userAgent,
          'X-Auth-Token': authToken
        },
        method: 'GET'
      };

      const req = https.request(options, res => {
        let response = '';

        res.on('data', chunk => {
          response += chunk;
        });

        res.on('end', error => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const state = JSON.parse(response).state;
            if (
              state == 'failed' ||
              state == 'deprovisioning' ||
              state == 'deleted'
            ) {
              error = new Error(
                'Server provisioning failed' + `State: ${state}`
              );
              reject(error);
            }
            resolve(state);
          } else {
            error = new Error('Request Failed.\n' + `Response: ${response}`);
            reject(error);
          }
        });
      });

      // Handle Error
      req.on('error', error => {
        error = new Error(`Got error: ${error.message}`);
        reject(error);
      });
      req.end();
    });

    return serverStatus;
  } catch (error) {
    core.error(`Server provisioning failed: ${error.message}`);
    throw error;
  }
}

async function getIPAddress(serverId) {
  try {
    const ipAddress = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.equinix.com',
        path: `/metal/v1/devices/${serverId}`,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': userAgent,
          'X-Auth-Token': authToken
        },
        method: 'GET'
      };

      const req = https.request(options, res => {
        let response = '';

        res.on('data', chunk => {
          response += chunk;
        });

        res.on('end', error => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const ipAddress = JSON.parse(response).ip_addresses[0].address;
            resolve(ipAddress);
          } else {
            error = new Error('Request Failed.\n' + `Response: ${response}`);
            reject(error);
          }
        });
      });

      // Handle Error
      req.on('error', error => {
        error = new Error(`Got error: ${error.message}`);
        reject(error);
      });
      req.end();
    });

    return ipAddress;
  } catch (error) {
    core.error(`Failed to get IP Address: ${error.message}`);
    throw error;
  }
}

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  try {
    // Create Equinix Metal server
    const serverId = await createServer();

    // Wait for server to become active
    let serverStatus = '';
    const timeoutInMillis = provisioning_timeout * 60 * 1000;
    const timeoutID = setTimeout(function () {
      throw new Error(
        `Device did not become active within ${provisioning_timeout} minutes.`
      );
    }, timeoutInMillis);
    while (serverStatus != 'active') {
      serverStatus = await getStatus(serverId);
      if (serverStatus != 'active') {
        core.info(`Server status: ${serverStatus}...`);
        await sleep(5000);
      }
    }
    // Server is active, cancel timeout
    clearTimeout(timeoutID);

    // Get server IP Address
    const ipAddress = await getIPAddress(serverId);

    // Set Github Action outputs
    core.setOutput('serverid', serverId);
    core.setOutput('ipaddress', ipAddress);

    // Print server info
    core.info(
      `Equinix Server Provisioned!
      Device UUID: ${serverId}
      IP Address: ${ipAddress}`
    );
  } catch (error) {
    core.setFailed(`Failed to create server: ${error.message}`);
  }
}

run();
