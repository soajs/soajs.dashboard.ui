# soajs.dashboard.ui

The SOAJS Dashboard UI runs in the dashboard environment and offers an interface built using Angular JS that communicates with the microservices deployed in the dashboard environment: [URAC](https://soajsorg.atlassian.net/wiki/spaces/URAC) - [oAuth](https://soajsorg.atlassian.net/wiki/spaces/OAUT/overview) - [DASHBOARD](https://soajsorg.atlassian.net/wiki/spaces/DSBRD/overview)

---
## Installation
The dashboard UI is a simple angular js application consisting of HTML, CSS & Javascript and is installed once you deploy the soajs pipeline as shown in the [SOAJS installer](https://soajsorg.atlassian.net/wiki/spaces/IN).
Once the dashboard environment is deployed, you can access this interface via your browser by opening the domain you have entered for your project.
---
More information is available in the SOAJS Documentation Space [Reference Link](https://soajsorg.atlassian.net/wiki/spaces/DSBRD/overview)

### The needed environments variable examples
Check out soajs.deployer for more information

export SOAJS_GATEWAY_CONFIG='{"domain":"api.soajs.org","port":"4000","ip":"127.0.0.1","domainPrefix":"api"}'

export SOAJS_SITES_CONFIG='[{"conf":{"domains":["console.soajs.org", "soajs.org"],"folder":"/console/"}}]'

export SOAJS_ENV='DASHBOARD'

export SOAJS_EXTKEY='888888888'

export SOAJS_SSL_CONFIG='{"email":"me@ddd.com"}'


### License
*Copyright SOAJS All Rights Reserved.*

Use of this source code is governed by an Apache license that can be found in the LICENSE file at the root of this repository.
