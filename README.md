# metal-device-action

This Experimental GitHub Action sets up an Equinix Metal server that can be used to run code in your workflows.

> :bulb: See also:
> - [equinix-metal-project](https://github.com/equinix-labs/metal-project-action) action
> - [equinix-metal-sweeper](https://github.com/equinix-labs/metal-sweeper-action) action
> - WIP [equinix-metal-github-action-runner](https://github.com/cprivitere/github-action-metal-runner) action
> - WIP [equinix-metal-github-actions-examples](https://github.com/equinix-labs/metal-actions-example) examples

## Inputs

| Name                  | Description                            | Required | Default |
|-----------------------|----------------------------------------|----------|---------|
| `metal_auth_token`    | API Key for Equinix Metal               | Yes      | -       |
| `metal_project_id`    | Project ID for Equinix Metal            | Yes      | -       |
| `metro`               | Metro for Equinix Metal                 | Yes      | -       |
| `plan`                | Plan for Equinix Metal                  | Yes      | -       |
| `os`                  | OS for Equinix Metal                    | Yes      | -       |
| `user_data`           | User data for Equinix Metal             | No       | ''      |
| `provisioning_timeout`| How long to wait for provisioning (min) | No       | 30      |

## Outputs

| Name          | Description             |
|---------------|-------------------------|
| `serverid`    | UUID of the server      |
| `ipaddress`   | IP address of the server|

## Usage

```yaml
name: Deploy to Equinix Metal

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v2

      - name: Set up Equinix Metal server
        uses: equinix-labs/equinix-metal-action@v1
        with:
          metal_auth_token: ${{ secrets.METAL_AUTH_TOKEN }}
          metal_project_id: ${{ secrets.METAL_PROJECT_ID }}
          metro: 'SV'
          plan: 'c3.medium.x86'
          os: 'ubuntu_22_04'
          user_data: |
            #!/bin/bash
            echo 'Hello, Equinix Metal!'
```
