const https = require('https');
const {URL} = require('url');
const core = require('@actions/core');

// GitHub Actions Inputs
const authToken = core.getInput('metal_auth_token', {required: true});
const projectId = core.getInput('metal_project_id', {required: true});
const metro = core.getInput('metro', {required: true});
const plan = core.getInput('plan', {required: true});
const os = core.getInput('os', {required: true});
const userData = core.getInput('user_data');

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
        'User-Agent': 'metal-github-runner-action',
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
            error = `Provisioning Failed. HTTP Response: ${response}`;
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
    core.setFailed(`Server provisioning failed: ${error.message}`);
  }
}

async function checkStatus(serverId) {
  try {
    const serverStatus = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.equinix.com',
        path: `/metal/v1/devices/${serverId}`,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'metal-github-runner-action',
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
    core.setFailed(`Server provisioning failed: ${error.message}`);
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
          'User-Agent': 'metal-github-runner-action',
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
    core.setFailed(`Failed to get IP Address: ${error.message}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  try {
    const serverId = await createServer();
    let serverStatus = '';
    while (serverStatus !== 'active') {
      serverStatus = await checkStatus(serverId);
      core.info(`Server Status: ${serverStatus}...`);
      await sleep(5000);
    }
    const ipAddress = await getIPAddress(serverId);
    core.info(
      `Equinix Server Provisioned!
      Device UUID: ${serverId}
      Status: ${serverStatus}
      IP Address: ${ipAddress}`
    );
  } catch (error) {
    core.setFailed(`Failed to create server: ${error.message}`);
  }
}

run();
