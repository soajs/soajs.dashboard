# soajs.dashboard
[![Build Status](https://travis-ci.org/soajs/soajs.dashboard.svg?branch=master)](https://travis-ci.org/soajs/soajs.dashboard)
[![Coverage Status](https://coveralls.io/repos/soajs/soajs.dashboard/badge.png)](https://coveralls.io/r/soajs/soajs.dashboard)
[![Known Vulnerabilities](https://snyk.io/test/github/soajs/soajs.dashboard/badge.svg)](https://snyk.io/test/github/soajs/soajs.dashboard)

SOAJS dashboard is divided to two components: service - User Interface.

The service offers several APIs to manage and configure environments, tenants and products.

The User Interface connects to the service and provides a GUI that facilitates the work.

---

##Installation

```sh
$ npm install soajs.dashboard
$ cd soajs.dashboard/services/
$ node .
```

---

##Testing

```sh
$ cd soajs.dashboard/
$ grunt test
```
* **Note**: Make sure docker (v: 1.12.6+) is installed and up before running the test cases
* **Warning**: Running the test cases will delete all previous docker services and containers

---

##Service Features
* Define Multiple Environments via the Environment APIs.
* Manage all your products, packages and access levels via the Productization APIs.
* Manage all your tenants, applications, keys and their device and geo security via the Multitenancy APIs.

More information on Dashboard Services is available on the website section [Dashboard](https://soajsorg.atlassian.net/wiki/spaces/DSBRD/overview)

###1. Environments
Create and manage environments with different IPs.<br>
Environments are linked to the Registry.<br>
Environments are also used when adding tenant service configuration.

More information on Environments is available on the website section [Registry](https://soajsorg.atlassian.net/wiki/spaces/SOAJ/pages/61354289/Registry)

###2. Productization
Package your services with different permissions and access controls and offer them as commercial products.<br>
Every product contains a list of packages where the default access level of our services' APIs are defined.<br>
Each Package offers a variety of access levels on the services' APIs.<br>
If a service is contained in a package, then this product offers the ability to use this service.<br>
When specifying the access level over a service, you can grant access to the whole service or add restrictions on its APIs.

More information on Productization is available on the website section [Productization](https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/61979857/Productization)

###3. Multitenancy
Create and manage multiple tenants (clients) and assign product packages to them.<br>
To apply the concept of having one service serve several tenants differently, you need to configure the service to use multitenancy, create tenants and assign keys to them then when making requests to that service, provide the tenant key in the request.
Then when making calls to the APIs of that service, specify the key of the tenant in those requests.

Tenants applications contains the tenant keys. These keys are checked when a request is made to a multitenant configured service API to determine if the requested service API is accessible or not using this key value. These keys also have expiry dates and are secured by device and geo location information if needed.

More information on Multitenancy is available on the website section [Multitenancy](https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/61979922/Multitenancy)

More information on Dashboard Services is available on the website section [Dashboard](https://soajsorg.atlassian.net/wiki/spaces/DSBRD/overview)

---

##UI Features
The dashboard offers a UI that can be used to invoke all the service APIs mentioned above.<br>
To get the UI running, you need to install several packages:

1. **nginx**: 3rd Party http server mainly used for virtual host creation [Download Link](http://nginx.org)
2. **soajs.util** main SOAJS utility library containing controller and agent services [Download Link](https://www.npmjs.com/package/soajs.util)
3. **soajs.urac** URAC serviced used to manage users records [Download Link](https://www.npmjs.com/package/soajs.urac)
4. **soajs.examples** SOAJS basic examples and sample Database Data [Download Link](https://www.npmjs.com/package/soajs.examples)
5. **soajs.dashboard** SOAJS dashboard service and GUI [Download Link](https://www.npmjs.com/package/soajs.dashboard)

###Notes:

* The Util contains **nginx** configuration that points to UI dashboard.
* Once you install all required modules, start Nginx, the controller, the URAC and the dashboard service then open [http://dashboard.soajs.org](http://dashboard.soajs.org).
* Load the provisioned data from the **examples** module and login with the test administrator account.
* Once logged in, the UI navigation is straight forward to every section of the dashboard service.

More information on how to set up the Dashboard UI is available on the website section [Dashboard UI](https://soajsorg.atlassian.net/wiki/spaces/EX/pages/61673365/How+to+Install).

For More Information about SOAJS Framework, please visit the [Get Started](http://www.soajs.org/getstarted) section.


### License
*Copyright SOAJS All Rights Reserved.*

Use of this source code is governed by an Apache license that can be found in the LICENSE file at the root of this repository.
