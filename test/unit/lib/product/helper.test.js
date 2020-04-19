"use strict";
let assert = require("assert");
let helper = require("../../../helper.js");
let lib = helper.requireModule('./lib/product/helper.js');

describe("testing product helper.js", function () {
	let service =[
		{
			"_id": "5e589c57c483986bc5e74e95",
			"name": "dashboard",
			"group": "SOAJS Core Services",
			"maintenance": {
				"readiness": "/heartbeat",
				"port": {
					"type": "maintenance"
				},
				"commands": [
					{
						"label": "Reload Registry",
						"path": "/reloadRegistry",
						"icon": "fas fa-undo"
					},
					{
						"label": "Resource Info",
						"path": "/resourceInfo",
						"icon": "fas fa-info"
					},
					{
						"label": "Releoad Registry",
						"path": "/reloadRegistry",
						"icon": "fas fa-undo"
					},
					{
						"label": "Resource Info",
						"path": "/resourceInfo",
						"icon": "fas fa-info"
					}
				]
			},
			"port": 4003,
			"program": [
				"soajs"
			],
			"requestTimeout": 60,
			"requestTimeoutRenewal": 5,
			"src": {
				"provider": "github",
				"owner": "soajs",
				"repo": "soajs.dashboard"
			},
			"swagger": false,
			"versions": {
				"1": {
					"apis": [
						{
							"l": "Lists the ledgers of a specific environment",
							"v": "/cd/ledger",
							"m": "get",
							"group": "Continuous Delivery"
						},
						{
							"l": "Get Environment",
							"v": "/environment",
							"m": "get",
							"group": "Environment"
						},
						{
							"l": "Get Templates",
							"v": "/templates",
							"m": "get",
							"group": "Templates"
						},
						{
							"l": "Upgrade Old Templates",
							"v": "/templates/upgrade",
							"m": "get",
							"group": "Templates"
						},
						{
							"l": "Get/Set Environment Deployment Status",
							"v": "/environment/status",
							"m": "get",
							"group": "Environment"
						},
						{
							"l": "List Environments",
							"v": "/environment/list",
							"m": "get",
							"group": "Environment",
							"groupMain": true
						},
						{
							"l": "Get Profile",
							"v": "/environment/profile",
							"m": "get",
							"group": "Environment"
						},
						{
							"l": "List Environment Databases",
							"v": "/environment/dbs/list",
							"m": "get",
							"group": "Environment Databases"
						},
						{
							"l": "List Available Resources",
							"v": "/resources",
							"m": "get",
							"group": "Resources",
							"groupMain": true
						},
						{
							"l": "Get One Resource",
							"v": "/resources/get",
							"m": "get",
							"group": "Resources"
						},
						{
							"l": "Upgrade Resources to latest version",
							"v": "/resources/upgrade",
							"m": "get",
							"group": "Resources",
							"groupMain": true
						},
						{
							"l": "Get Resources Deploy Configuration",
							"v": "/resources/config",
							"m": "get",
							"group": "Resources"
						},
						{
							"l": "List Custom Registry Entries",
							"v": "/customRegistry/list",
							"m": "get",
							"group": "Custom Registry",
							"groupMain": true
						},
						{
							"l": "Get Custom Registry Entry",
							"v": "/customRegistry/get",
							"m": "get",
							"group": "Custom Registry"
						},
						{
							"l": "List Environment Platforms",
							"v": "/environment/platforms/list",
							"m": "get",
							"group": "Environment Platforms"
						},
						{
							"l": "List Products",
							"v": "/product/list",
							"m": "get",
							"group": "Product",
							"groupMain": true
						},
						{
							"l": "List Console Products",
							"v": "/console/product/list",
							"m": "get",
							"group": "Console Product"
						},
						{
							"l": "Get Product",
							"v": "/product/get",
							"m": "get",
							"group": "Product"
						},
						{
							"l": "Purge Product",
							"v": "/product/purge",
							"m": "get",
							"group": "Product"
						},
						{
							"l": "List Product Packages",
							"v": "/product/packages/list",
							"m": "get",
							"group": "Product"
						},
						{
							"l": "Get Product Package",
							"v": "/product/packages/get",
							"m": "get",
							"group": "Product"
						},
						{
							"l": "Get Compact Product Package",
							"v": "/product/packages/aclPreview/service",
							"m": "get",
							"group": "Product"
						},
						{
							"l": "Get Compact Product Package",
							"v": "/product/packages/aclPreview/api",
							"m": "get",
							"group": "Product"
						},
						{
							"l": "List Tenants",
							"v": "/tenant/list",
							"m": "get",
							"group": "Tenant"
						},
						{
							"l": "List Console Tenants",
							"v": "/console/tenant/list",
							"m": "get",
							"group": "Console Tenant"
						},
						{
							"l": "Get Tenant",
							"v": "/tenant/get",
							"m": "get",
							"group": "Tenant"
						},
						{
							"l": "Get Tenant oAuth Configuration",
							"v": "/tenant/oauth/list",
							"m": "get",
							"group": "Tenant oAuth"
						},
						{
							"l": "List Tenant oAuth Users",
							"v": "/tenant/oauth/users/list",
							"m": "get",
							"group": "Tenant oAuth"
						},
						{
							"l": "List Tenant Applications",
							"v": "/tenant/application/list",
							"m": "get",
							"group": "Tenant Application"
						},
						{
							"l": "List Tenant Application Keys",
							"v": "/tenant/application/key/list",
							"m": "get",
							"group": "Tenant Application"
						},
						{
							"l": "List Tenant Application External Keys",
							"v": "/tenant/application/key/ext/list",
							"m": "get",
							"group": "Tenant Application"
						},
						{
							"l": "List Tenant Application Key Configuration",
							"v": "/tenant/application/key/config/list",
							"m": "get",
							"group": "Tenant Application"
						},
						{
							"l": "List Dashboard Tenant Keys",
							"v": "/tenant/db/keys/list",
							"m": "get",
							"group": "Dashboard Tenants"
						},
						{
							"l": "Get Tenant",
							"v": "/settings/tenant/get",
							"m": "get",
							"group": "Tenant Settings"
						},
						{
							"l": "Get Tenant oAuth Configuration",
							"v": "/settings/tenant/oauth/list",
							"m": "get",
							"group": "Tenant Settings"
						},
						{
							"l": "List Tenant oAuth Users",
							"v": "/settings/tenant/oauth/users/list",
							"m": "get",
							"group": "Tenant Settings"
						},
						{
							"l": "List Tenant Applications",
							"v": "/settings/tenant/application/list",
							"m": "get",
							"group": "Tenant Settings"
						},
						{
							"l": "List Tenant Application Keys",
							"v": "/settings/tenant/application/key/list",
							"m": "get",
							"group": "Tenant Settings"
						},
						{
							"l": "List Tenant Application External Keys",
							"v": "/settings/tenant/application/key/ext/list",
							"m": "get",
							"group": "Tenant Settings"
						},
						{
							"l": "List Tenant Application Key Configuration",
							"v": "/settings/tenant/application/key/config/list",
							"m": "get",
							"group": "Tenant Settings"
						},
						{
							"l": "List The Environment Where A Service Is Deployed",
							"v": "/services/env/list",
							"m": "get",
							"group": "Services"
						},
						{
							"l": "List Favorites",
							"v": "/favorite",
							"m": "get",
							"group": "Services"
						},
						{
							"l": "List Service Configuration",
							"v": "/daemons/groupConfig/serviceConfig/list",
							"m": "get",
							"group": "Daemons"
						},
						{
							"l": "List Job's External Keys",
							"v": "/daemons/groupConfig/tenantExtKeys/list",
							"m": "get",
							"group": "Daemons"
						},
						{
							"l": "List Hosts",
							"v": "/hosts/list",
							"m": "get",
							"group": "Hosts",
							"groupMain": true
						},
						{
							"l": "Get Controller Hosts",
							"v": "/hosts/awareness",
							"m": "get",
							"group": "Hosts"
						},
						{
							"l": "Execute Maintenance Operation on Hosts",
							"v": "/hosts/maintenance",
							"m": "get",
							"group": "Hosts"
						},
						{
							"l": "List Cloud Services",
							"v": "/cloud/services/list",
							"m": "get",
							"group": "HA Cloud"
						},
						{
							"l": "List HA Cloud Nodes",
							"v": "/cloud/nodes/list",
							"m": "get",
							"group": "HA Cloud"
						},
						{
							"l": "Get Service Container Logs",
							"v": "/cloud/services/instances/logs",
							"m": "get",
							"group": "HA Cloud"
						},
						{
							"l": "List Available Namespaces",
							"v": "/cloud/namespaces/list",
							"m": "get",
							"group": "HA Cloud"
						},
						{
							"l": "Check if resource is Deployed",
							"v": "/cloud/resource",
							"m": "get",
							"group": "HA Cloud"
						},
						{
							"l": "List Cloud Virtual Machines",
							"v": "/cloud/vm/list",
							"m": "get",
							"group": "Services"
						},
						{
							"l": "List Cloud Virtual Machines",
							"v": "/cloud/vm/layer/status",
							"m": "get",
							"group": "Services"
						},
						{
							"l": "List Services Metrics",
							"v": "/cloud/metrics/services",
							"m": "get",
							"group": "HA Cloud"
						},
						{
							"l": "List Nodes Metrics",
							"v": "/cloud/metrics/nodes",
							"m": "get",
							"group": "HA Cloud"
						},
						{
							"l": "List Catalog Recipes",
							"v": "/catalog/recipes/list",
							"m": "get",
							"group": "Catalog"
						},
						{
							"l": "Get a Catalog",
							"v": "/catalog/recipes/get",
							"m": "get",
							"group": "Catalog"
						},
						{
							"l": "Upgrade Catalog Recipes to latest Version",
							"v": "/catalog/recipes/upgrade",
							"m": "get",
							"group": "Catalog"
						},
						{
							"l": "Get CD Configuration",
							"v": "/cd",
							"m": "get",
							"group": "Continuous Delivery"
						},
						{
							"l": "Get Update Notification Ledger",
							"v": "/cd/updates",
							"m": "get",
							"group": "Continuous Delivery"
						},
						{
							"l": "Get CI Accounts",
							"v": "/ci",
							"m": "get",
							"group": "Continuous Integration"
						},
						{
							"l": "Get CI Providers",
							"v": "/ci/providers",
							"m": "get",
							"group": "Continuous Integration"
						},
						{
							"l": "Download CI Recipe",
							"v": "/ci/recipe/download",
							"m": "get",
							"group": "Continuous Integration"
						},
						{
							"l": "Download CI Script",
							"v": "/ci/script/download",
							"m": "get",
							"group": "Continuous Integration"
						},
						{
							"l": "Turn On/Off Repository CI",
							"v": "/ci/status",
							"m": "get",
							"group": "Continuous Integration"
						},
						{
							"l": "Get CI Repository Settings & Environment Variables",
							"v": "/ci/settings",
							"m": "get",
							"group": "Continuous Integration"
						},
						{
							"l": "Get the CI configuration file of the repository from provider",
							"v": "/ci/repo/remote/config",
							"m": "get",
							"group": "Continuous Integration"
						},
						{
							"l": "Get the CI Latest Repository Build Per Branch",
							"v": "/ci/repo/builds",
							"m": "get",
							"group": "Continuous Integration"
						},
						{
							"l": "List Git Accounts",
							"v": "/gitAccounts/accounts/list",
							"m": "get",
							"group": "Git Accounts"
						},
						{
							"l": "Get Repositories",
							"v": "/gitAccounts/getRepos",
							"m": "get",
							"group": "Git Accounts"
						},
						{
							"l": "Get Repository Branches",
							"v": "/gitAccounts/getBranches",
							"m": "get",
							"group": "Git Accounts"
						},
						{
							"l": "Get Yaml file",
							"v": "/gitAccounts/getYaml",
							"m": "get",
							"group": "Git Accounts"
						},
						{
							"l": "Get Any file",
							"v": "/gitAccounts/getAnyFile",
							"m": "get",
							"group": "Git Accounts"
						},
						{
							"l": "List Endpoints",
							"v": "/apiBuilder/list",
							"m": "get",
							"group": "API Builder"
						},
						{
							"l": "Get Endpoint",
							"v": "/apiBuilder/get",
							"m": "get",
							"group": "API Builder"
						},
						{
							"l": "Publish endpoint apis",
							"v": "/apiBuilder/publish",
							"m": "get",
							"group": "API Builder"
						},
						{
							"l": "Get Resources",
							"v": "/apiBuilder/getResources",
							"m": "get",
							"group": "API Builder"
						},
						{
							"l": "List Available Secrets",
							"v": "/secrets/list",
							"m": "get",
							"group": "Secrets"
						},
						{
							"l": "Get One Secret",
							"v": "/secrets/get",
							"m": "get",
							"group": "Secrets"
						},
						{
							"l": "Get Infra Provider",
							"v": "/infra",
							"m": "get",
							"group": "Infra Providers"
						},
						{
							"l": "Get Cluster From Infra Provider",
							"v": "/infra/cluster",
							"m": "get",
							"group": "Infra Providers"
						},
						{
							"l": "Download Infra as Code Template",
							"v": "/infra/template/download",
							"m": "get",
							"group": "Infra Providers"
						},
						{
							"l": "Get Extra Compnents From An Infra Provider",
							"v": "/infra/extras",
							"m": "get",
							"group": "Infra Providers"
						},
						{
							"l": "Get Console Version",
							"v": "/version",
							"m": "get",
							"group": "Console Version"
						},
						{
							"l": "Check Console Version",
							"v": "/version/check",
							"m": "get",
							"group": "Console Version"
						},
						{
							"l": "List Persistent Volume Claim",
							"v": "/volume/claims",
							"m": "get",
							"group": "Persistent Volume Claim"
						},
						{
							"l": "Get one  Persistent Volume Claim",
							"v": "/volume/claim",
							"m": "get",
							"group": "Persistent Volume Claim"
						},
						{
							"l": "Start Service Hosts",
							"v": "/hosts/start",
							"m": "post",
							"group": "Hosts"
						},
						{
							"l": "Stop Service Hosts",
							"v": "/hosts/stop",
							"m": "post",
							"group": "Hosts"
						},
						{
							"l": "Import Templates",
							"v": "/templates/import",
							"m": "post",
							"group": "Templates"
						},
						{
							"l": "Export Templates",
							"v": "/templates/export",
							"m": "post",
							"group": "Templates"
						},
						{
							"l": "List Services",
							"v": "/services/list",
							"m": "post",
							"group": "Services"
						},
						{
							"l": "Add Environment",
							"v": "/environment/add",
							"m": "post",
							"group": "Environment"
						},
						{
							"l": "Add Environment Database",
							"v": "/environment/dbs/add",
							"m": "post",
							"group": "Environment Databases"
						},
						{
							"l": "Attach Container Technology",
							"v": "/environment/platforms/attach",
							"m": "post",
							"group": "Environment Platforms"
						},
						{
							"l": "Lock an environment to a Cloud Provider",
							"v": "/environment/infra/lock",
							"m": "post",
							"group": "Environment"
						},
						{
							"l": "Add / Edit Resource",
							"v": "/resources",
							"m": "post",
							"group": "Resources"
						},
						{
							"l": "Add New Custom Registry Entry",
							"v": "/customRegistry/add",
							"m": "post",
							"group": "Custom Registry"
						},
						{
							"l": "Add Product",
							"v": "/product/add",
							"m": "post",
							"group": "Product"
						},
						{
							"l": "Add Product Package",
							"v": "/product/packages/add",
							"m": "post",
							"group": "Product"
						},
						{
							"l": "Add Tenant",
							"v": "/tenant/add",
							"m": "post",
							"group": "Tenant"
						},
						{
							"l": "Add Tenant oAuth Configuration",
							"v": "/tenant/oauth/add",
							"m": "post",
							"group": "Tenant oAuth"
						},
						{
							"l": "Add Tenant oAuth User",
							"v": "/tenant/oauth/users/add",
							"m": "post",
							"group": "Tenant oAuth"
						},
						{
							"l": "Add Tenant Application",
							"v": "/tenant/application/add",
							"m": "post",
							"group": "Tenant Application"
						},
						{
							"l": "Add Tenant Application Key",
							"v": "/tenant/application/key/add",
							"m": "post",
							"group": "Tenant Application"
						},
						{
							"l": "Add Tenant Application External Key",
							"v": "/tenant/application/key/ext/add",
							"m": "post",
							"group": "Tenant Application"
						},
						{
							"l": "Delete Tenant Application External Key",
							"v": "/tenant/application/key/ext/delete",
							"m": "post",
							"group": "Tenant Application"
						},
						{
							"l": "Get Current Tenant Access Level",
							"v": "/tenant/acl/get",
							"m": "post",
							"group": "Private Tenant ACL"
						},
						{
							"l": "Add Tenant oAuth Configuration",
							"v": "/settings/tenant/oauth/add",
							"m": "post",
							"group": "Tenant Settings"
						},
						{
							"l": "Add Tenant oAuth User",
							"v": "/settings/tenant/oauth/users/add",
							"m": "post",
							"group": "Tenant Settings"
						},
						{
							"l": "Add Tenant Application Key",
							"v": "/settings/tenant/application/key/add",
							"m": "post",
							"group": "Tenant Settings"
						},
						{
							"l": "Add Tenant Application External Key",
							"v": "/settings/tenant/application/key/ext/add",
							"m": "post",
							"group": "Tenant Settings"
						},
						{
							"l": "Delete Tenant Application External Key",
							"v": "/settings/tenant/application/key/ext/delete",
							"m": "post",
							"group": "Tenant Settings"
						},
						{
							"l": "List Daemon Group Configuration",
							"v": "/daemons/groupConfig/list",
							"m": "post",
							"group": "Daemons"
						},
						{
							"l": "Add Daemon Group Configuration",
							"v": "/daemons/groupConfig/add",
							"m": "post",
							"group": "Daemons"
						},
						{
							"l": "List Daemons",
							"v": "/daemons/list",
							"m": "post",
							"group": "Daemons"
						},
						{
							"l": "Deploy A New SOAJS Service",
							"v": "/cloud/services/soajs/deploy",
							"m": "post",
							"group": "HA Cloud"
						},
						{
							"l": "Deploy A Custom Resource",
							"v": "/cloud/plugins/deploy",
							"m": "post",
							"group": "HA Cloud"
						},
						{
							"l": "Add HA Cloud Node",
							"v": "/cloud/nodes/add",
							"m": "post",
							"group": "HA Cloud"
						},
						{
							"l": "Perform A Maintenance Operation on a Deployed Service",
							"v": "/cloud/services/maintenance",
							"m": "post",
							"group": "HA Cloud"
						},
						{
							"l": "Perform A Maintenance Operation on a Virtual Machine",
							"v": "/cloud/vm/maintenance",
							"m": "post",
							"group": "HA Cloud"
						},
						{
							"l": "Add Virtual Machine Layer",
							"v": "/cloud/vm",
							"m": "post",
							"group": "HA Cloud"
						},
						{
							"l": "On-board Virtual Machine Layer",
							"v": "/cloud/vm/onboard",
							"m": "post",
							"group": "HA Cloud"
						},
						{
							"l": "Get Service Container Logs",
							"v": "/cloud/vm/logs",
							"m": "post",
							"group": "HA Cloud"
						},
						{
							"l": "Add New Catalog",
							"v": "/catalog/recipes/add",
							"m": "post",
							"group": "Catalog"
						},
						{
							"l": "Activate CI Provider",
							"v": "/ci/provider",
							"m": "post",
							"group": "Continuous Integration"
						},
						{
							"l": "Add New CI Recipe",
							"v": "/ci/recipe",
							"m": "post",
							"group": "Continuous Integration"
						},
						{
							"l": "Save CD Configuration for a specific Service",
							"v": "/cd",
							"m": "post",
							"group": "Continuous Delivery"
						},
						{
							"l": "Pause CD Configuration",
							"v": "/cd/pause",
							"m": "post",
							"group": "Continuous Delivery"
						},
						{
							"l": "Trigger CD Deployment",
							"v": "/cd/deploy",
							"m": "post",
							"group": "Continuous Delivery Deployment"
						},
						{
							"l": "Github Login",
							"v": "/gitAccounts/login",
							"m": "post",
							"group": "Git Accounts"
						},
						{
							"l": "Activate Repository",
							"v": "/gitAccounts/repo/activate",
							"m": "post",
							"group": "Git Accounts"
						},
						{
							"l": "Api simulation service",
							"v": "/swagger/simulate",
							"m": "post",
							"group": "Simulate",
							"groupMain": true
						},
						{
							"l": "Generate Service via Swagger",
							"v": "/swagger/generate",
							"m": "post",
							"group": "swagger",
							"groupMain": true
						},
						{
							"l": "Regenerate Service via Swagger",
							"v": "/swagger/generateExistingService",
							"m": "post",
							"group": "swagger",
							"groupMain": true
						},
						{
							"l": "Add Endpoint",
							"v": "/apiBuilder/add",
							"m": "post",
							"group": "API Builder"
						},
						{
							"l": "Update Route Authentication Method",
							"v": "/apiBuilder/authentication/update",
							"m": "post",
							"group": "API Builder"
						},
						{
							"l": "Convert Swagger String To an IMFV Soajs Object",
							"v": "/apiBuilder/convertSwaggerToImfv",
							"m": "post",
							"group": "API Builder"
						},
						{
							"l": "Convert IMFV Soajs Object to a Swagger String",
							"v": "/apiBuilder/convertImfvToSwagger",
							"m": "post",
							"group": "API Builder"
						},
						{
							"l": "Add Secret",
							"v": "/secrets/add",
							"m": "post",
							"group": "Secrets"
						},
						{
							"l": "Add Persistent Volume Claim",
							"v": "/volume/claim",
							"m": "post",
							"group": "Persistent Volume Claim"
						},
						{
							"l": "Connect Infra Providers",
							"v": "/infra",
							"m": "post",
							"group": "Infra Providers"
						},
						{
							"l": "Add Infra as Code Template",
							"v": "/infra/template",
							"m": "post",
							"group": "Infra Providers"
						},
						{
							"l": "Update Infra as Code Template",
							"v": "/infra/template/upload",
							"m": "post",
							"group": "Infra Providers"
						},
						{
							"l": "Scale Cluster at Infra Provider",
							"v": "/infra/cluster/scale",
							"m": "post",
							"group": "Infra Providers"
						},
						{
							"l": "Create Infra component",
							"v": "/infra/extras",
							"m": "post",
							"group": "HA Cloud"
						},
						{
							"l": "List Analytic Services",
							"v": "/services/dashboard/services",
							"m": "post",
							"group": "Services"
						},
						{
							"l": "List Analytic Services",
							"v": "/services/dashboard/apiRoutes",
							"m": "post",
							"group": "Services"
						},
						{
							"l": "Add to Favorites",
							"v": "/favorite",
							"m": "post",
							"group": "Services"
						},
						{
							"l": "Updates Service Settings",
							"v": "/services/settings/update",
							"m": "put",
							"group": "Services"
						},
						{
							"l": "Mark as read",
							"v": "/cd/ledger/read",
							"m": "put",
							"group": "Continuous Delivery"
						},
						{
							"l": "Take Action",
							"v": "/cd/action",
							"m": "put",
							"group": "Continuous Delivery"
						},
						{
							"l": "Update Environment",
							"v": "/environment/update",
							"m": "put",
							"group": "Environment"
						},
						{
							"l": "Update Environment Tenant Key Security",
							"v": "/environment/key/update",
							"m": "put",
							"group": "Environment"
						},
						{
							"l": "Update Environment Database",
							"v": "/environment/dbs/update",
							"m": "put",
							"group": "Environment Databases"
						},
						{
							"l": "Update Environment Databases Prefix",
							"v": "/environment/dbs/updatePrefix",
							"m": "put",
							"group": "Environment Databases"
						},
						{
							"l": "Update Resource",
							"v": "/resources/update",
							"m": "put",
							"group": "Resources"
						},
						{
							"l": "Set Resource Deploy Configuration",
							"v": "/resources/config/update",
							"m": "put",
							"group": "Resources"
						},
						{
							"l": "Update Custom Registry Entry",
							"v": "/customRegistry/update",
							"m": "put",
							"group": "Custom Registry"
						},
						{
							"l": "Upgrade To New Custom Registry",
							"v": "/customRegistry/upgrade",
							"m": "put",
							"group": "Custom Registry"
						},
						{
							"l": "Change Deployer Type",
							"v": "/environment/platforms/deployer/update",
							"m": "put",
							"group": "Environment Platforms"
						},
						{
							"l": "Update Product",
							"v": "/product/update",
							"m": "put",
							"group": "Product"
						},
						{
							"l": "Update Product Package",
							"v": "/product/packages/update",
							"m": "put",
							"group": "Product"
						},
						{
							"l": "Update Product Package Acl By Env",
							"v": "/product/packages/acl/env",
							"m": "put",
							"group": "Product"
						},
						{
							"l": "Update Product Scope",
							"v": "/product/scope/update",
							"m": "put",
							"group": "Product"
						},
						{
							"l": "Update Product Scope Per Env",
							"v": "/product/scope/env",
							"m": "put",
							"group": "Product"
						},
						{
							"l": "Get Compact Product Package",
							"v": "/product/packages/aclPreview/service",
							"m": "put",
							"group": "Product"
						},
						{
							"l": "Get Compact Product Package",
							"v": "/product/packages/aclPreview/api",
							"m": "put",
							"group": "Product"
						},
						{
							"l": "Update Tenant",
							"v": "/tenant/update",
							"m": "put",
							"group": "Tenant"
						},
						{
							"l": "Update Tenant oAuth Configuration",
							"v": "/tenant/oauth/update",
							"m": "put",
							"group": "Tenant oAuth"
						},
						{
							"l": "Update Tenant oAuth User",
							"v": "/tenant/oauth/users/update",
							"m": "put",
							"group": "Tenant oAuth"
						},
						{
							"l": "Update Tenant Application",
							"v": "/tenant/application/update",
							"m": "put",
							"group": "Tenant Application"
						},
						{
							"l": "Update Tenant Application External Key",
							"v": "/tenant/application/key/ext/update",
							"m": "put",
							"group": "Tenant Application"
						},
						{
							"l": "Update Tenant Application Key Configuration",
							"v": "/tenant/application/key/config/update",
							"m": "put",
							"group": "Tenant Application"
						},
						{
							"l": "Update Tenant",
							"v": "/settings/tenant/update",
							"m": "put",
							"group": "Tenant Settings"
						},
						{
							"l": "Update Tenant oAuth Configuration",
							"v": "/settings/tenant/oauth/update",
							"m": "put",
							"group": "Tenant Settings"
						},
						{
							"l": "Update Tenant oAuth User",
							"v": "/settings/tenant/oauth/users/update",
							"m": "put",
							"group": "Tenant Settings"
						},
						{
							"l": "Update Tenant Application External Key",
							"v": "/settings/tenant/application/key/ext/update",
							"m": "put",
							"group": "Tenant Settings"
						},
						{
							"l": "Update Tenant Application Key Configuration",
							"v": "/settings/tenant/application/key/config/update",
							"m": "put",
							"group": "Tenant Settings"
						},
						{
							"l": "Update Daemon Group Configuration",
							"v": "/daemons/groupConfig/update",
							"m": "put",
							"group": "Daemons"
						},
						{
							"l": "Update Service Configuration",
							"v": "/daemons/groupConfig/serviceConfig/update",
							"m": "put",
							"group": "Daemons"
						},
						{
							"l": "Update Job's External Keys",
							"v": "/daemons/groupConfig/tenantExtKeys/update",
							"m": "put",
							"group": "Daemons"
						},
						{
							"l": "Update HA Cloud Node",
							"v": "/cloud/nodes/update",
							"m": "put",
							"group": "HA Cloud"
						},
						{
							"l": "Scale HA Service",
							"v": "/cloud/services/scale",
							"m": "put",
							"group": "HA Cloud"
						},
						{
							"l": "Redeploy HA Service",
							"v": "/cloud/services/redeploy",
							"m": "put",
							"group": "HA Cloud"
						},
						{
							"l": "Autoscale Services",
							"v": "/cloud/services/autoscale",
							"m": "put",
							"group": "HA Cloud"
						},
						{
							"l": "Configure Environment Autoscaling",
							"v": "/cloud/services/autoscale/config",
							"m": "put",
							"group": "HA Cloud"
						},
						{
							"l": "Update Catalog",
							"v": "/catalog/recipes/update",
							"m": "put",
							"group": "Catalog"
						},
						{
							"l": "Sync Repository",
							"v": "/gitAccounts/repo/sync",
							"m": "put",
							"group": "Git Accounts"
						},
						{
							"l": "Sync Repository Branches",
							"v": "/gitAccounts/repo/sync/branches",
							"m": "put",
							"group": "Git Accounts"
						},
						{
							"l": "Deactivate CI Provider",
							"v": "/ci/provider",
							"m": "put",
							"group": "Continuous Integration"
						},
						{
							"l": "Edit CI Recipe",
							"v": "/ci/recipe",
							"m": "put",
							"group": "Continuous Integration"
						},
						{
							"l": "Update CI Repository Settings",
							"v": "/ci/settings",
							"m": "put",
							"group": "Continuous Integration"
						},
						{
							"l": "Deactivate Repository",
							"v": "/gitAccounts/repo/deactivate",
							"m": "put",
							"group": "Git Accounts"
						},
						{
							"l": "Edit Endpoint",
							"v": "/apiBuilder/edit",
							"m": "put",
							"group": "API Builder"
						},
						{
							"l": "Update Endpoint's Schemas",
							"v": "/apiBuilder/updateSchemas",
							"m": "put",
							"group": "API Builder"
						},
						{
							"l": "Modify Infra Providers Connection",
							"v": "/infra",
							"m": "put",
							"group": "Infra Providers"
						},
						{
							"l": "Update Infra as Code Template",
							"v": "/infra/template",
							"m": "put",
							"group": "Infra Providers"
						},
						{
							"l": "Modify Virtual Machine Layer",
							"v": "/cloud/vm",
							"m": "put",
							"group": "Owner HA Cloud"
						},
						{
							"l": "Update Infra component",
							"v": "/infra/extras",
							"m": "put",
							"group": "Owner HA Cloud"
						},
						{
							"l": "Delete Template",
							"v": "/templates",
							"m": "delete",
							"group": "Templates"
						},
						{
							"l": "Delete Environment",
							"v": "/environment/delete",
							"m": "delete",
							"group": "Environment"
						},
						{
							"l": "Delete Environment Database",
							"v": "/environment/dbs/delete",
							"m": "delete",
							"group": "Environment Databases"
						},
						{
							"l": "Detach Container Technology",
							"v": "/environment/platforms/detach",
							"m": "delete",
							"group": "Environment Platforms"
						},
						{
							"l": "Unlock an environment from a Cloud Provider",
							"v": "/environment/infra/lock",
							"m": "delete",
							"group": "Environment"
						},
						{
							"l": "Delete a resource",
							"v": "/resources",
							"m": "delete",
							"group": "Resources"
						},
						{
							"l": "Delete A Custom Registry Entry",
							"v": "/customRegistry/delete",
							"m": "delete",
							"group": "Custom Registry"
						},
						{
							"l": "Delete Product",
							"v": "/product/delete",
							"m": "delete",
							"group": "Product"
						},
						{
							"l": "Delete Product Package",
							"v": "/product/packages/delete",
							"m": "delete",
							"group": "Product"
						},
						{
							"l": "Delete Tenant",
							"v": "/tenant/delete",
							"m": "delete",
							"group": "Tenant"
						},
						{
							"l": "Delete Tenant oAuth Configuration",
							"v": "/tenant/oauth/delete",
							"m": "delete",
							"group": "Tenant oAuth"
						},
						{
							"l": "Delete Tenant oAuth User",
							"v": "/tenant/oauth/users/delete",
							"m": "delete",
							"group": "Tenant oAuth"
						},
						{
							"l": "Delete Tenant Application",
							"v": "/tenant/application/delete",
							"m": "delete",
							"group": "Tenant Application"
						},
						{
							"l": "Delete Tenant Application Key",
							"v": "/tenant/application/key/delete",
							"m": "delete",
							"group": "Tenant Application"
						},
						{
							"l": "Delete Tenant oAuth Configuration",
							"v": "/settings/tenant/oauth/delete",
							"m": "delete",
							"group": "Tenant Settings"
						},
						{
							"l": "Delete Tenant oAuth User",
							"v": "/settings/tenant/oauth/users/delete",
							"m": "delete",
							"group": "Tenant Settings"
						},
						{
							"l": "Delete Tenant Application Key",
							"v": "/settings/tenant/application/key/delete",
							"m": "delete",
							"group": "Tenant Settings"
						},
						{
							"l": "Delete Daemon Group Configuration",
							"v": "/daemons/groupConfig/delete",
							"m": "delete",
							"group": "Daemons"
						},
						{
							"l": "Remove HA Cloud Node",
							"v": "/cloud/nodes/remove",
							"m": "delete",
							"group": "HA Cloud"
						},
						{
							"l": "Delete HA Service",
							"v": "/cloud/services/delete",
							"m": "delete",
							"group": "HA Cloud"
						},
						{
							"l": "Delete Virtual Machine",
							"v": "/cloud/vm/instance",
							"m": "delete",
							"group": "HA Cloud"
						},
						{
							"l": "Delete Virtual Machine Layer",
							"v": "/cloud/vm",
							"m": "delete",
							"group": "HA Cloud"
						},
						{
							"l": "Delete a Namespace",
							"v": "/cloud/namespaces/delete",
							"m": "delete",
							"group": "HA Cloud"
						},
						{
							"l": "Delete a Catalog",
							"v": "/catalog/recipes/delete",
							"m": "delete",
							"group": "Catalog"
						},
						{
							"l": "Delete CI Recipe",
							"v": "/ci/recipe",
							"m": "delete",
							"group": "Continuous Integration"
						},
						{
							"l": "Github Logout",
							"v": "/gitAccounts/logout",
							"m": "delete",
							"group": "Git Accounts"
						},
						{
							"l": "Delete Endpoint",
							"v": "/apiBuilder/delete",
							"m": "delete",
							"group": "API Builder"
						},
						{
							"l": "Delete Secret",
							"v": "/secrets/delete",
							"m": "delete",
							"group": "Secrets"
						},
						{
							"l": "Delete Persistent Volume Claim",
							"v": "/volume/claim",
							"m": "delete",
							"group": "Persistent Volume Claim"
						},
						{
							"l": "Deactivate Infra Provider",
							"v": "/infra",
							"m": "delete",
							"group": "Infra Providers"
						},
						{
							"l": "Remove Infra Provider Deployment",
							"v": "/infra/deployment",
							"m": "delete",
							"group": "Infra Providers"
						},
						{
							"l": "Remove Template from Infra Providers",
							"v": "/infra/template",
							"m": "delete",
							"group": "Infra Providers"
						},
						{
							"l": "Delete Infra component",
							"v": "/infra/extras",
							"m": "delete",
							"group": "HA Cloud"
						},
						{
							"l": "Delete from Favorites",
							"v": "/favorite",
							"m": "delete",
							"group": "Services"
						}
					],
					"extKeyRequired": true,
					"oauth": true,
					"provision_ACL": true,
					"tenant_Profile": false,
					"urac": true,
					"urac_ACL": true,
					"urac_Config": false,
					"urac_GroupConfig": true,
					"urac_Profile": true
				}
			}
		},
		{
			"_id": "5e9c4cc10fc9a793a62c5297",
			"name": "micro1",
			"description": "description is description",
			"group": "Example",
			"maintenance": {
				"port": {
					"type": "inherit"
				},
				"readiness": "/heartbeat"
			},
			"port": 4991,
			"prerequisites": {
				"cpu": " ",
				"memory": " "
			},
			"program": [
				"no program"
			],
			"requestTimeout": 30,
			"requestTimeoutRenewal": 5,
			"src": {
				"provider": "github",
				"owner": "RaghebAD",
				"repo": "soajs.test"
			},
			"swagger": true,
			"versions": {
				"1x2": {
					"lastSync": {
						"branch": "master",
						"ts": 1587301569837
					},
					"extKeyRequired": true,
					"oauth": false,
					"awareness": true,
					"urac": true,
					"urac_Profile": false,
					"urac_ACL": false,
					"provision_ACL": false,
					"tenant_Profile": false,
					"apis": [
						{
							"l": "Creates a domain",
							"v": "/v1/domain",
							"m": "post",
							"group": "calendar"
						},
						{
							"l": "Creates a schedule request for scheduleId",
							"v": "/v1/schedules/:scheduleId",
							"m": "post",
							"group": "calendar"
						},
						{
							"l": "Adds an accept/reject approval status to the schedule request identified by scheduleId",
							"v": "/v1/schedules/:scheduleId/approvals",
							"m": "post",
							"group": "calendar"
						},
						{
							"l": "Returns health status of server.",
							"v": "/v1/health",
							"m": "get",
							"group": "calendar"
						},
						{
							"l": "Returns a list of Scheduler Requests based upon the filter criteria.",
							"v": "/v1/schedules",
							"m": "get",
							"group": "calendar"
						},
						{
							"l": "Returns a list of Scheduler details based upon the filter criteria.",
							"v": "/v1/schedules/scheduleDetails",
							"m": "get",
							"group": "calendar"
						},
						{
							"l": "Retrieves a schedule request for scheduleId",
							"v": "/v1/schedules/:scheduleId",
							"m": "get",
							"group": "calendar"
						},
						{
							"l": "Deletes a schedule requests for scheduleId",
							"v": "/v1/schedules/:scheduleId",
							"m": "delete",
							"group": "calendar"
						}
					],
					"swagger": "{\"swagger\":\"2.0\",\"info\":{\"version\":\"1908.0001\",\"title\":\"calendar\"},\"host\":\"\",\"basePath\":\"/calendar\",\"tags\":[{\"name\":\"calendar\"}],\"paths\":{\"/v1/domain\":{\"post\":{\"tags\":[\"calendar\"],\"summary\":\"Creates a domain\",\"description\":\"Creates a domain\",\"operationId\":\"createDomain\",\"produces\":[\"application/json\"],\"parameters\":[{\"in\":\"body\",\"name\":\"body\",\"description\":\"Domain to be added\",\"required\":false,\"schema\":{\"$ref\":\"#/definitions/Create Domain Message\"}}],\"responses\":{\"200\":{\"description\":\"OK\"},\"412\":{\"description\":\"Domain already exists.\",\"schema\":{\"$ref\":\"#/definitions/SchedulerRequestError\"}},\"500\":{\"description\":\"Unexpected Runtime error\",\"schema\":{\"$ref\":\"#/definitions/SchedulerRequestError\"}}}}},\"/v1/health\":{\"get\":{\"tags\":[\"calendar\"],\"summary\":\"Returns health status of server.\",\"description\":\"Returns health status of server.\",\"operationId\":\"healthCheck\",\"produces\":[\"application/json\"],\"parameters\":[{\"name\":\"apiVersion\",\"in\":\"path\",\"description\":\"v1|v2\",\"required\":true,\"type\":\"string\",\"default\":\"v2\"},{\"name\":\"checkInterfaces\",\"in\":\"query\",\"description\":\"Check Interfaces\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"boolean\",\"default\":true},\"collectionFormat\":\"multi\"}],\"responses\":{\"200\":{\"description\":\"OK\",\"schema\":{\"$ref\":\"#/definitions/Health Check Message\"}},\"400\":{\"description\":\"Not healthy\",\"schema\":{\"$ref\":\"#/definitions/Health Check Message\"}}}}},\"/v1/schedules\":{\"get\":{\"tags\":[\"calendar\"],\"summary\":\"Returns a list of Scheduler Requests based upon the filter criteria.\",\"description\":\"Returns a list of Scheduler Requests based upon the filter criteria.\",\"operationId\":\"searchScheduleRequests\",\"produces\":[\"application/json\"],\"parameters\":[{\"name\":\"domain\",\"in\":\"query\",\"description\":\"Schedule domain.\",\"required\":false,\"type\":\"string\"},{\"name\":\"scheduleId\",\"in\":\"query\",\"description\":\"Schedule identifier\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"scheduleName\",\"in\":\"query\",\"description\":\"Schedule name\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"userId\",\"in\":\"query\",\"description\":\"Schedule User id of creator\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"status\",\"in\":\"query\",\"description\":\"Schedule status\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"createDateTime\",\"in\":\"query\",\"description\":\"Creation date and time (yyyy-MM-dd'T'HH:mm:ssZ)\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"optimizerStatus\",\"in\":\"query\",\"description\":\"Optimizer status\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"domainData\",\"in\":\"query\",\"description\":\"Domain data (Ex: name:value)\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"eventData\",\"in\":\"query\",\"description\":\"Event data (Ex : name:value)\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"}],\"responses\":{\"200\":{\"description\":\"OK\",\"schema\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/definitions/Schedule\"}}},\"400\":{\"description\":\"Invalid query scheduler details request.\",\"schema\":{\"$ref\":\"#/definitions/SchedulerRequestError\"}},\"404\":{\"description\":\"No records found\"},\"500\":{\"description\":\"Unexpected Runtime error\",\"schema\":{\"$ref\":\"#/definitions/SchedulerRequestError\"}}}}},\"/v1/schedules/scheduleDetails\":{\"get\":{\"tags\":[\"calendar\"],\"summary\":\"Returns a list of Scheduler details based upon the filter criteria.\",\"description\":\"Returns a list of Scheduler details based upon the filter criteria.\",\"operationId\":\"searchScheduleRequestDetails\",\"produces\":[\"application/json\"],\"parameters\":[{\"name\":\"domain\",\"in\":\"query\",\"description\":\"Schedule domain.\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"request.scheduleId\",\"in\":\"query\",\"description\":\"Schedule identifier\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"request.scheduleName\",\"in\":\"query\",\"description\":\"Schedule name\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"request.userId\",\"in\":\"query\",\"description\":\"SCheduler creator User id of \",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"request.status\",\"in\":\"query\",\"description\":\"Schedule status\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"request.createDateTime\",\"in\":\"query\",\"description\":\"Creation date and time (<low date>[,<hi date>])\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"request.optimizerStatus\",\"in\":\"query\",\"description\":\"Optimizer status\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"request.approvalUserId\",\"in\":\"query\",\"description\":\"Request Approval user id\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"request.approvalStatus\",\"in\":\"query\",\"description\":\"Request Approval status\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"request.approvalType\",\"in\":\"query\",\"description\":\"Request Approval type\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"startTime\",\"in\":\"query\",\"description\":\"Start time <low>,<high>\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"finishTime\",\"in\":\"query\",\"description\":\"Finish time <low>,<high>\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"maxSchedules\",\"in\":\"query\",\"description\":\"Maximum number of schedules to return\",\"required\":false,\"type\":\"integer\",\"format\":\"int32\"},{\"name\":\"lastScheduleId\",\"in\":\"query\",\"description\":\"Return schedules > lastScheduleId\",\"required\":false,\"type\":\"string\"},{\"name\":\"dd\",\"in\":\"query\",\"description\":\"Domain data name:Value dd=name:value\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"},{\"name\":\"ed\",\"in\":\"query\",\"description\":\"Event data name:Value ed=name:value\",\"required\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"collectionFormat\":\"multi\"}],\"responses\":{\"200\":{\"description\":\"OK\",\"schema\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/definitions/ScheduleEventMessage\"}}},\"400\":{\"description\":\"Invalid query scheduler details request.\",\"schema\":{\"$ref\":\"#/definitions/SchedulerRequestError\"}},\"404\":{\"description\":\"No records found\"},\"500\":{\"description\":\"Unexpected Runtime error\",\"schema\":{\"$ref\":\"#/definitions/SchedulerRequestError\"}}}}},\"/v1/schedules/{scheduleId}\":{\"get\":{\"tags\":[\"calendar\"],\"summary\":\"Retrieves a schedule request for scheduleId\",\"description\":\"Retrieves a schedule request for scheduleId\",\"operationId\":\"getScheduleRequestInfo\",\"produces\":[\"application/json\"],\"parameters\":[{\"name\":\"scheduleId\",\"in\":\"path\",\"description\":\"Schedule id to uniquely identify the schedule info being retrieved.\",\"required\":true,\"type\":\"string\"}],\"responses\":{\"200\":{\"description\":\"OK\",\"schema\":{\"$ref\":\"#/definitions/Schedule\"}},\"404\":{\"description\":\"No record found\"},\"500\":{\"description\":\"Unexpected Runtime error\",\"schema\":{\"$ref\":\"#/definitions/SchedulerRequestError\"}}}},\"post\":{\"tags\":[\"calendar\"],\"summary\":\"Creates a schedule request for scheduleId\",\"description\":\"Creates a schedule request for scheduleId\",\"operationId\":\"createScheduleRequest\",\"produces\":[\"application/json\"],\"parameters\":[{\"name\":\"scheduleId\",\"in\":\"path\",\"description\":\"Schedule id to uniquely identify the schedule request being created.\",\"required\":true,\"type\":\"string\"},{\"in\":\"body\",\"name\":\"body\",\"description\":\"Data for creating a schedule request for the given schedule id\",\"required\":false,\"schema\":{\"$ref\":\"#/definitions/Schedule Message\"}}],\"responses\":{\"202\":{\"description\":\"Schedule request accepted.\"},\"400\":{\"description\":\"Invalid schedule create request.\",\"schema\":{\"$ref\":\"#/definitions/SchedulerRequestError\"}},\"412\":{\"description\":\"Schedule request already exists for this schedule id.\",\"schema\":{\"$ref\":\"#/definitions/SchedulerRequestError\"}},\"500\":{\"description\":\"Unexpected Runtime error\",\"schema\":{\"$ref\":\"#/definitions/SchedulerRequestError\"}}}},\"delete\":{\"tags\":[\"calendar\"],\"summary\":\"Deletes a schedule requests for scheduleId\",\"description\":\"Deletes a schedule requests for scheduleId\",\"operationId\":\"deleteScheduleRequest\",\"produces\":[\"application/json\"],\"parameters\":[{\"name\":\"scheduleId\",\"in\":\"path\",\"description\":\"Schedule id to uniquely identify the schedule request being deleted.\",\"required\":true,\"type\":\"string\"}],\"responses\":{\"204\":{\"description\":\"Delete successful\"},\"404\":{\"description\":\"No record found\"},\"500\":{\"description\":\"Unexpected Runtime error\",\"schema\":{\"$ref\":\"#/definitions/SchedulerRequestError\"}}}}},\"/v1/schedules/{scheduleId}/approvals\":{\"post\":{\"tags\":[\"calendar\"],\"summary\":\"Adds an accept/reject approval status to the schedule request identified by scheduleId\",\"description\":\"Adds an accept/reject approval status to the schedule request identified by scheduleId\",\"operationId\":\"approveScheduleRequest\",\"produces\":[\"application/json\"],\"parameters\":[{\"name\":\"scheduleId\",\"in\":\"path\",\"description\":\"Schedule id to uniquely identify the schedule request being accepted or rejected.\",\"required\":true,\"type\":\"string\"},{\"in\":\"body\",\"name\":\"body\",\"description\":\"Accept or reject approval message\",\"required\":false,\"schema\":{\"$ref\":\"#/definitions/ApprovalMessage\"}}],\"responses\":{\"200\":{\"description\":\"OK\"},\"400\":{\"description\":\"Invalid schedule approval/reject request.\",\"schema\":{\"$ref\":\"#/definitions/SchedulerRequestError\"}},\"404\":{\"description\":\"No record found\"},\"500\":{\"description\":\"Unexpected Runtime error\",\"schema\":{\"$ref\":\"#/definitions/SchedulerRequestError\"}}}}}},\"definitions\":{\"ApprovalMessage\":{\"type\":\"object\",\"required\":[\"approvalStatus\",\"approvalType\",\"approvalUserId\"],\"properties\":{\"approvalUserId\":{\"type\":\"string\",\"description\":\"User Id- ATTUID of the approving user\"},\"approvalStatus\":{\"type\":\"string\",\"description\":\"Approval status \",\"enum\":[\"Accepted\",\"Rejected\"]},\"approvalType\":{\"type\":\"string\",\"description\":\"Approval Type\",\"enum\":[\"Tier 2\"]}}},\"ApprovalType\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"integer\",\"format\":\"int64\"},\"approvalCount\":{\"type\":\"integer\",\"format\":\"int32\"},\"approvalType\":{\"type\":\"string\"},\"domain\":{\"type\":\"string\"},\"scheduleApprovals\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"integer\",\"format\":\"int64\"},\"approvalDateTime\":{\"type\":\"integer\"},\"status\":{\"type\":\"string\"},\"userId\":{\"type\":\"string\"},\"approvalType\":{\"$ref\":\"#/definitions/ApprovalType\"}}}}}},\"Create Domain Message\":{\"type\":\"object\",\"required\":[\"domain\"],\"properties\":{\"domain\":{\"type\":\"string\",\"description\":\"Domain name\"}},\"description\":\"Event definition for schedule creation\"},\"DomainData\":{\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\"},\"value\":{\"type\":\"string\"}}},\"Event\":{\"type\":\"object\",\"properties\":{\"eventText\":{\"type\":\"string\"},\"eventTime\":{\"type\":\"string\"},\"recurEndTime\":{\"type\":\"string\"},\"reminder\":{\"type\":\"integer\",\"format\":\"int64\"},\"status\":{\"type\":\"string\"},\"statusMessage\":{\"type\":\"string\"},\"rrule\":{\"type\":\"string\"},\"timeSensitive\":{\"type\":\"boolean\"},\"eventData\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\"},\"value\":{\"type\":\"string\"}}}},\"eventsPending\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\"},\"dispatchTime\":{\"type\":\"integer\",\"format\":\"int64\"},\"eventTime\":{\"type\":\"integer\",\"format\":\"int64\"},\"eventsId\":{\"type\":\"string\"},\"status\":{\"type\":\"string\"},\"eventTimeString\":{\"type\":\"string\"},\"dispatchTimeString\":{\"type\":\"string\"}}}}}},\"EventData\":{\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\"},\"value\":{\"type\":\"string\"}}},\"EventsPending\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\"},\"dispatchTime\":{\"type\":\"integer\",\"format\":\"int64\"},\"eventTime\":{\"type\":\"integer\",\"format\":\"int64\"},\"eventsId\":{\"type\":\"string\"},\"status\":{\"type\":\"string\"},\"eventTimeString\":{\"type\":\"string\"},\"dispatchTimeString\":{\"type\":\"string\"}}},\"Health Check Component\":{\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\",\"description\":\"Componnent/interface name\",\"enum\":[\"Database\",\"DMaaPMR\"]},\"url\":{\"type\":\"string\",\"description\":\"URL representing component/interface\"},\"status\":{\"type\":\"string\",\"description\":\"'OK' or error status message\"},\"healthy\":{\"type\":\"boolean\",\"description\":\"Component health\"}},\"description\":\"Health of a single component of the instance\"},\"Health Check Message\":{\"type\":\"object\",\"properties\":{\"healthy\":{\"type\":\"boolean\",\"description\":\"Overall health of instance. false if even one component reports not healthy.\"},\"buildInfo\":{\"type\":\"string\",\"description\":\"Build info (docker image name)\"},\"currentTime\":{\"type\":\"string\",\"description\":\"Current time on the instance.\"},\"hostname\":{\"type\":\"string\",\"description\":\"Hostname (in k8s = pod name)\"},\"components\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\",\"description\":\"Componnent/interface name\",\"enum\":[\"Database\",\"DMaaPMR\"]},\"url\":{\"type\":\"string\",\"description\":\"URL representing component/interface\"},\"status\":{\"type\":\"string\",\"description\":\"'OK' or error status message\"},\"healthy\":{\"type\":\"boolean\",\"description\":\"Component health\"}},\"description\":\"Health of a single component of the instance\"}}},\"description\":\"Returns status of calendar service instance\"},\"RequestError\":{\"type\":\"object\",\"properties\":{\"messageId\":{\"type\":\"string\"},\"text\":{\"type\":\"string\"},\"variables\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}}}},\"Schedule\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\"},\"createDateTime\":{\"type\":\"string\",\"description\":\"Date/time of schedule creation\"},\"deleteDateTime\":{\"type\":\"string\",\"description\":\"Date/time of schedule deletion\"},\"globalRrule\":{\"type\":\"string\",\"description\":\"Global recurrence rule. Applies to all events unless a local RRULE is defined\"},\"globalRecurEndTime\":{\"type\":\"string\",\"description\":\"End time for global recurrance rule\"},\"optimizerDateTime\":{\"type\":\"string\"},\"optimizerReturnDateTime\":{\"type\":\"string\"},\"scheduleId\":{\"type\":\"string\",\"description\":\"Unique identifier of the schedule (UUID)\"},\"scheduleName\":{\"type\":\"string\",\"description\":\"User provided name for the schedule.\"},\"status\":{\"type\":\"string\",\"description\":\"Status of the schedule.\",\"enum\":[\"PendingSchedule\",\"ScheduleFailed\",\"OptimizationInProgress\",\"PendingApproval\",\"OptimizationFailed\",\"Accepted\",\"Rejected\",\"Scheduled\",\"PublishingEvents\",\"PublishedEvents\",\"Completed\",\"CompletedWithError\",\"Deleted\",\"Cancelled\"]},\"userId\":{\"type\":\"string\",\"description\":\"ATTUID of the scheduler creator.\"},\"domainData\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\"},\"value\":{\"type\":\"string\"}}}},\"events\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"eventText\":{\"type\":\"string\"},\"eventTime\":{\"type\":\"string\"},\"recurEndTime\":{\"type\":\"string\"},\"reminder\":{\"type\":\"integer\",\"format\":\"int64\"},\"status\":{\"type\":\"string\"},\"statusMessage\":{\"type\":\"string\"},\"rrule\":{\"type\":\"string\"},\"timeSensitive\":{\"type\":\"boolean\"},\"eventData\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\"},\"value\":{\"type\":\"string\"}}}},\"eventsPending\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\"},\"dispatchTime\":{\"type\":\"integer\",\"format\":\"int64\"},\"eventTime\":{\"type\":\"integer\",\"format\":\"int64\"},\"eventsId\":{\"type\":\"string\"},\"status\":{\"type\":\"string\"},\"eventTimeString\":{\"type\":\"string\"},\"dispatchTimeString\":{\"type\":\"string\"}}}}}}},\"scheduleApprovals\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"integer\",\"format\":\"int64\"},\"approvalDateTime\":{\"type\":\"integer\"},\"status\":{\"type\":\"string\"},\"userId\":{\"type\":\"string\"},\"approvalType\":{\"$ref\":\"#/definitions/ApprovalType\"}}}},\"domain\":{\"type\":\"string\"}}},\"Schedule Event Message\":{\"type\":\"object\",\"required\":[\"eventJson\",\"eventTime\"],\"properties\":{\"eventJson\":{\"type\":\"object\",\"description\":\"Application provided JSON object which is pubvlished as eventData in the DMaaP event\"},\"eventTime\":{\"type\":\"string\",\"description\":\"Date/time of the event. (The first occurance in the case of a recurring event.)\"},\"recurEndTime\":{\"type\":\"string\",\"description\":\"Recurring events - date/time to end recurring event\"},\"reminder\":{\"type\":\"integer\",\"format\":\"int64\",\"description\":\"Reminder time, in seconds. Seconds subtracted from the event time to calculate actual publish time to account for the DMaaP latency.\"},\"timeSensitive\":{\"type\":\"boolean\",\"description\":\"Time sensitive event.If true, Calendar will not publish event and update it to 'Past Due' if the event time has passed. Defaults to false which will not check for 'Past Due' events before publishing.\"},\"rrule\":{\"type\":\"string\",\"description\":\"Event RRULE (RFC 5545) overrides the global RRULE in the schedule, if any\"},\"eventData\":{\"type\":\"array\",\"description\":\"Event metadata. These attributes may be used in query API and/or referenced in the eventText as ${eventdata.name}\",\"items\":{\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\"},\"value\":{\"type\":\"string\"}}}}},\"description\":\"Event definition for schedule creation\"},\"Schedule Message\":{\"type\":\"object\",\"required\":[\"domain\",\"scheduleId\",\"userId\"],\"properties\":{\"domain\":{\"type\":\"string\",\"description\":\"Domain - Identifies the client application\",\"enum\":[\"ChangeManagement\",\"CLAMP\",\"POLO\"]},\"scheduleId\":{\"type\":\"string\",\"description\":\"Unique identifier of the schedule (UUID)\"},\"scheduleName\":{\"type\":\"string\",\"description\":\"User provided name of the scheduler, defaults to the scheduleId\"},\"userId\":{\"type\":\"string\",\"description\":\"Id of the user creating teh schedule\"},\"domainData\":{\"type\":\"array\",\"description\":\"Domain metadata - list of name/values \",\"items\":{\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\"},\"value\":{\"type\":\"string\"}}}},\"globalRrule\":{\"type\":\"string\",\"description\":\"Global RRULE (RFC 5545) applied to all events in the schedule. Mutually exclusive of Event RRULE\"},\"scheduleInfo\":{\"type\":\"string\"},\"events\":{\"type\":\"array\",\"description\":\"Events provided by client or generated by optimizer.\",\"items\":{\"type\":\"object\",\"required\":[\"eventJson\",\"eventTime\"],\"properties\":{\"eventJson\":{\"type\":\"object\",\"description\":\"Application provided JSON object which is pubvlished as eventData in the DMaaP event\"},\"eventTime\":{\"type\":\"string\",\"description\":\"Date/time of the event. (The first occurance in the case of a recurring event.)\"},\"recurEndTime\":{\"type\":\"string\",\"description\":\"Recurring events - date/time to end recurring event\"},\"reminder\":{\"type\":\"integer\",\"format\":\"int64\",\"description\":\"Reminder time, in seconds. Seconds subtracted from the event time to calculate actual publish time to account for the DMaaP latency.\"},\"timeSensitive\":{\"type\":\"boolean\",\"description\":\"Time sensitive event.If true, Calendar will not publish event and update it to 'Past Due' if the event time has passed. Defaults to false which will not check for 'Past Due' events before publishing.\"},\"rrule\":{\"type\":\"string\",\"description\":\"Event RRULE (RFC 5545) overrides the global RRULE in the schedule, if any\"},\"eventData\":{\"type\":\"array\",\"description\":\"Event metadata. These attributes may be used in query API and/or referenced in the eventText as ${eventdata.name}\",\"items\":{\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\"},\"value\":{\"type\":\"string\"}}}}},\"description\":\"Event definition for schedule creation\"}}},\"description\":\"Request for schedule creation\"},\"ScheduleApproval\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"integer\",\"format\":\"int64\"},\"approvalDateTime\":{\"type\":\"integer\"},\"status\":{\"type\":\"string\"},\"userId\":{\"type\":\"string\"},\"approvalType\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"integer\",\"format\":\"int64\"},\"approvalCount\":{\"type\":\"integer\",\"format\":\"int32\"},\"approvalType\":{\"type\":\"string\"},\"domain\":{\"type\":\"string\"},\"scheduleApprovals\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"integer\",\"format\":\"int64\"},\"approvalDateTime\":{\"type\":\"integer\"},\"status\":{\"type\":\"string\"},\"userId\":{\"type\":\"string\"},\"approvalType\":{\"$ref\":\"#/definitions/ApprovalType\"}}}}}}}},\"ScheduleEventMessage\":{\"type\":\"object\",\"properties\":{\"eventText\":{\"type\":\"string\"},\"eventTime\":{\"type\":\"string\"},\"recurEndTime\":{\"type\":\"string\"},\"reminder\":{\"type\":\"integer\",\"format\":\"int64\"},\"status\":{\"type\":\"string\"},\"statusMessage\":{\"type\":\"string\"},\"rrule\":{\"type\":\"string\"},\"timeSensitive\":{\"type\":\"boolean\"},\"eventData\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\"},\"value\":{\"type\":\"string\"}}}},\"eventsPending\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\"},\"dispatchTime\":{\"type\":\"integer\",\"format\":\"int64\"},\"eventTime\":{\"type\":\"integer\",\"format\":\"int64\"},\"eventsId\":{\"type\":\"string\"},\"status\":{\"type\":\"string\"},\"eventTimeString\":{\"type\":\"string\"},\"dispatchTimeString\":{\"type\":\"string\"}}}},\"scheduleRequest\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\"},\"createDateTime\":{\"type\":\"string\",\"description\":\"Date/time of schedule creation\"},\"deleteDateTime\":{\"type\":\"string\",\"description\":\"Date/time of schedule deletion\"},\"globalRrule\":{\"type\":\"string\",\"description\":\"Global recurrence rule. Applies to all events unless a local RRULE is defined\"},\"globalRecurEndTime\":{\"type\":\"string\",\"description\":\"End time for global recurrance rule\"},\"optimizerDateTime\":{\"type\":\"string\"},\"optimizerReturnDateTime\":{\"type\":\"string\"},\"scheduleId\":{\"type\":\"string\",\"description\":\"Unique identifier of the schedule (UUID)\"},\"scheduleName\":{\"type\":\"string\",\"description\":\"User provided name for the schedule.\"},\"status\":{\"type\":\"string\",\"description\":\"Status of the schedule.\",\"enum\":[\"PendingSchedule\",\"ScheduleFailed\",\"OptimizationInProgress\",\"PendingApproval\",\"OptimizationFailed\",\"Accepted\",\"Rejected\",\"Scheduled\",\"PublishingEvents\",\"PublishedEvents\",\"Completed\",\"CompletedWithError\",\"Deleted\",\"Cancelled\"]},\"userId\":{\"type\":\"string\",\"description\":\"ATTUID of the scheduler creator.\"},\"domainData\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\"},\"value\":{\"type\":\"string\"}}}},\"events\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"eventText\":{\"type\":\"string\"},\"eventTime\":{\"type\":\"string\"},\"recurEndTime\":{\"type\":\"string\"},\"reminder\":{\"type\":\"integer\",\"format\":\"int64\"},\"status\":{\"type\":\"string\"},\"statusMessage\":{\"type\":\"string\"},\"rrule\":{\"type\":\"string\"},\"timeSensitive\":{\"type\":\"boolean\"},\"eventData\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\"},\"value\":{\"type\":\"string\"}}}},\"eventsPending\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\"},\"dispatchTime\":{\"type\":\"integer\",\"format\":\"int64\"},\"eventTime\":{\"type\":\"integer\",\"format\":\"int64\"},\"eventsId\":{\"type\":\"string\"},\"status\":{\"type\":\"string\"},\"eventTimeString\":{\"type\":\"string\"},\"dispatchTimeString\":{\"type\":\"string\"}}}}}}},\"scheduleApprovals\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"integer\",\"format\":\"int64\"},\"approvalDateTime\":{\"type\":\"integer\"},\"status\":{\"type\":\"string\"},\"userId\":{\"type\":\"string\"},\"approvalType\":{\"$ref\":\"#/definitions/ApprovalType\"}}}},\"domain\":{\"type\":\"string\"}}}}},\"SchedulerRequestError\":{\"type\":\"object\",\"properties\":{\"requestError\":{\"type\":\"object\",\"properties\":{\"messageId\":{\"type\":\"string\"},\"text\":{\"type\":\"string\"},\"variables\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}}}}}}}}",
					"soa": "{\"serviceName\":\"micro1\",\"serviceGroup\":\"Example\",\"servicePort\":4991,\"serviceVersion\":\"1.2\",\"description\":\"description is description\",\"extKeyRequired\":true,\"oauth\":false,\"urac\":true,\"urac_Profile\":false,\"requestTimeout\":30,\"requestTimeoutRenewal\":5,\"swagger\":true,\"urac_ACL\":false,\"provision_ACL\":false,\"type\":\"service\",\"prerequisites\":{\"cpu\":\" \",\"memory\":\" \"},\"documentation\":{\"readme\":\"README.md\",\"release\":\"RELEASE.md\"},\"swaggerFilename\":\"swagger.json\",\"maintenance\":{\"port\":{\"type\":\"inherit\"},\"readiness\":\"/heartbeat\"},\"tenant_Profile\":false,\"program\":[\"no program\"]}",
					"branches": [
						"master"
					]
				}
			}
		},
		{
			"_id": "5e589c57c483986bc5e74e93",
			"name": "multitenant",
			"group": "SOAJS Core Services",
			"maintenance": {
				"port": {
					"type": "maintenance"
				},
				"readiness": "/heartbeat",
				"commands": [
					{
						"label": "Releoad Registry",
						"path": "/reloadRegistry",
						"icon": "registry"
					},
					{
						"label": "Resource Info",
						"path": "/resourceInfo",
						"icon": "info"
					}
				]
			},
			"port": 4004,
			"program": [
				"soajs"
			],
			"requestTimeout": 30,
			"requestTimeoutRenewal": 5,
			"src": {
				"provider": "github",
				"owner": "soajs",
				"repo": "soajs.multitenant"
			},
			"swagger": false,
			"versions": {
				"1": {
					"apis": [
						{
							"l": "List products",
							"v": "/products",
							"m": "get",
							"group": "Product",
							"groupMain": true
						},
						{
							"l": "List console products",
							"v": "/products/console",
							"m": "get",
							"group": "Console product",
							"groupMain": true
						},
						{
							"l": "Get product",
							"v": "/product",
							"m": "get",
							"group": "Product",
							"groupMain": true
						},
						{
							"l": "List product packages",
							"v": "/product/packages",
							"m": "get",
							"group": "Product"
						},
						{
							"l": "Get product package",
							"v": "/product/package",
							"m": "get",
							"group": "Product"
						},
						{
							"l": "List tenants",
							"v": "/tenants",
							"m": "get",
							"group": "Tenant"
						},
						{
							"l": "Get tenant",
							"v": "/tenant",
							"m": "get",
							"group": "Tenant"
						},
						{
							"l": "Get tenant",
							"v": "/admin/tenant",
							"m": "get",
							"group": "Admin Tenant"
						},
						{
							"l": "Get tenant application",
							"v": "/tenant/application",
							"m": "get",
							"group": "Tenant"
						},
						{
							"l": "Get tenant application",
							"v": "/admin/tenant/application",
							"m": "get",
							"group": "Admin Tenant"
						},
						{
							"l": "List tenant applications",
							"v": "/tenant/applications",
							"m": "get",
							"group": "Tenant"
						},
						{
							"l": "List tenant applications",
							"v": "/admin/tenant/applications",
							"m": "get",
							"group": "Admin Tenant"
						},
						{
							"l": "List tenant application ext keys",
							"v": "/tenant/application/key/ext",
							"m": "get",
							"group": "Tenant"
						},
						{
							"l": "List tenant application ext keys",
							"v": "/admin/tenant/application/key/ext",
							"m": "get",
							"group": "Admin Tenant"
						},
						{
							"l": "Add product",
							"v": "/product",
							"m": "post",
							"group": "Product",
							"groupMain": true
						},
						{
							"l": "Add package to product",
							"v": "/product/package",
							"m": "post",
							"group": "Product"
						},
						{
							"l": "Add tenant with optional application, key, and ext key",
							"v": "/tenant",
							"m": "post",
							"group": "Tenant"
						},
						{
							"l": "Add application to tenant with optional key and ext key",
							"v": "/tenant/application",
							"m": "post",
							"group": "Tenant"
						},
						{
							"l": "Add application to tenant with optional key and ext key",
							"v": "/admin/tenant/application",
							"m": "post",
							"group": "Admin Tenant"
						},
						{
							"l": "Add key to a tenant application with optional ext key",
							"v": "/tenant/application/key",
							"m": "post",
							"group": "Tenant"
						},
						{
							"l": "Add key to a tenant application with optional ext key",
							"v": "/admin/tenant/application/key",
							"m": "post",
							"group": "Admin Tenant"
						},
						{
							"l": "Add external key to tenant application",
							"v": "/tenant/application/key/ext",
							"m": "post",
							"group": "Tenant Access"
						},
						{
							"l": "Add external key to tenant application",
							"v": "/admin/tenant/application/key/ext",
							"m": "post",
							"group": "Admin Tenant"
						},
						{
							"l": "Delete product",
							"v": "/product",
							"m": "delete",
							"group": "Product",
							"groupMain": true
						},
						{
							"l": "Delete product package",
							"v": "/product/package",
							"m": "delete",
							"group": "Product"
						},
						{
							"l": "Delete Tenant",
							"v": "/tenant",
							"m": "delete",
							"group": "Tenant"
						},
						{
							"l": "Delete tenant application",
							"v": "/tenant/application",
							"m": "delete",
							"group": "Tenant"
						},
						{
							"l": "Delete tenant application key",
							"v": "/tenant/application/key",
							"m": "delete",
							"group": "Tenant"
						},
						{
							"l": "Delete tenant application external key",
							"v": "/tenant/application/key/ext",
							"m": "delete",
							"group": "Tenant Access"
						},
						{
							"l": "Purge ACL for a Product and all its packages",
							"v": "/product/purge",
							"m": "put",
							"group": "Product"
						},
						{
							"l": "Update product",
							"v": "/product",
							"m": "put",
							"group": "Product"
						},
						{
							"l": "Update product ACL scope",
							"v": "/product/scope",
							"m": "put",
							"group": "Product"
						},
						{
							"l": "Update product ACL scope by env",
							"v": "/product/scope/env",
							"m": "put",
							"group": "Product"
						},
						{
							"l": "Update product package",
							"v": "/product/package",
							"m": "put",
							"group": "Product"
						},
						{
							"l": "Update product package",
							"v": "/product/package/acl/env",
							"m": "put",
							"group": "Product"
						},
						{
							"l": "Update tenant",
							"v": "/tenant",
							"m": "put",
							"group": "Tenant"
						},
						{
							"l": "Update tenant",
							"v": "/admin/tenant",
							"m": "put",
							"group": "Admin Tenant"
						},
						{
							"l": "Update profile",
							"v": "/tenant/profile",
							"m": "put",
							"group": "Tenant"
						},
						{
							"l": "Update profile",
							"v": "/admin/tenant/profile",
							"m": "put",
							"group": "Admin Tenant"
						},
						{
							"l": "Update tenant application",
							"v": "/tenant/application",
							"m": "put",
							"group": "Tenant"
						},
						{
							"l": "Update tenant application",
							"v": "/admin/tenant/application",
							"m": "put",
							"group": "Admin Tenant"
						},
						{
							"l": "Update key information for a tenant application",
							"v": "/tenant/application/key",
							"m": "put",
							"group": "Tenant"
						},
						{
							"l": "Update key information for a tenant application",
							"v": "/admin/tenant/application/key",
							"m": "put",
							"group": "Admin Tenant"
						},
						{
							"l": "Update external key information for a tenant application",
							"v": "/tenant/application/key/ext",
							"m": "put",
							"group": "Tenant Access"
						},
						{
							"l": "Update external key information for a tenant application",
							"v": "/admin/tenant/application/key/ext",
							"m": "put",
							"group": "Admin Tenant"
						}
					],
					"extKeyRequired": true,
					"oauth": true,
					"provision_ACL": false,
					"tenant_Profile": false,
					"urac": false,
					"urac_ACL": false,
					"urac_Config": false,
					"urac_GroupConfig": false,
					"urac_Profile": false
				}
			}
		},
		{
			"_id": "5e589c57c483986bc5e74e8f",
			"name": "oauth",
			"group": "SOAJS Core Services",
			"maintenance": {
				"commands": [
					{
						"label": "Releoad Provision",
						"path": "/loadProvision",
						"icon": "provision"
					},
					{
						"label": "Releoad Registry",
						"path": "/reloadRegistry",
						"icon": "fas fa-undo"
					},
					{
						"label": "Resource Info",
						"path": "/resourceInfo",
						"icon": "fas fa-info"
					}
				],
				"port": {
					"type": "maintenance"
				},
				"readiness": "/heartbeat"
			},
			"port": 4002,
			"program": [
				"soajs"
			],
			"requestTimeout": 30,
			"requestTimeoutRenewal": 5,
			"src": {
				"provider": "github",
				"owner": "soajs",
				"repo": "soajs.oauth"
			},
			"swagger": false,
			"versions": {
				"1": {
					"apis": [
						{
							"l": "Cross environment roaming, but requires IP whitelisting",
							"v": "/roaming",
							"m": "get",
							"group": "Tokenization user"
						},
						{
							"l": "Get information about what third party login is available",
							"v": "/available/login",
							"m": "get",
							"group": "Guest"
						},
						{
							"l": "Get the authorization token",
							"v": "/authorization",
							"m": "get",
							"group": "Guest"
						},
						{
							"l": "Passport login",
							"v": "/passport/login/:strategy",
							"m": "get",
							"group": "Third party login"
						},
						{
							"l": "Passport login validation",
							"v": "/passport/validate/:strategy",
							"m": "get",
							"group": "Third party login"
						},
						{
							"l": "OpenAM login",
							"v": "/openam/login",
							"m": "post",
							"group": "Third party login"
						},
						{
							"l": "Ldap login",
							"v": "/ldap/login",
							"m": "post",
							"group": "Third party login"
						},
						{
							"l": "Create an access token",
							"v": "/token",
							"m": "post",
							"group": "Guest"
						},
						{
							"l": "Create an access token with pin",
							"v": "/pin",
							"m": "post",
							"group": "Tokenization"
						},
						{
							"l": "Delete access token",
							"v": "/accessToken/:token",
							"m": "delete",
							"group": "Tokenization"
						},
						{
							"l": "Delete refresh token",
							"v": "/refreshToken/:token",
							"m": "delete",
							"group": "Tokenization"
						},
						{
							"l": "Delete all tokens for a given user",
							"v": "/tokens/user/:userId",
							"m": "delete",
							"group": "User Tokenization"
						},
						{
							"l": "Delete all tokens for this client (tenant)",
							"v": "/tokens/tenant/:clientId",
							"m": "delete",
							"group": "Cient Tokenization"
						}
					],
					"extKeyRequired": true,
					"oauth": true,
					"provision_ACL": false,
					"tenant_Profile": false,
					"urac": false,
					"urac_ACL": false,
					"urac_Config": false,
					"urac_GroupConfig": false,
					"urac_Profile": false
				}
			}
		},
		{
			"_id": "5e589c57c483986bc5e74e91",
			"name": "urac",
			"group": "SOAJS Core Services",
			"maintenance": {
				"port": {
					"type": "maintenance"
				},
				"readiness": "/heartbeat",
				"commands": [
					{
						"label": "Releoad Registry",
						"path": "/reloadRegistry",
						"icon": "registry"
					},
					{
						"label": "Resource Info",
						"path": "/resourceInfo",
						"icon": "info"
					}
				]
			},
			"port": 4001,
			"program": [
				"soajs"
			],
			"requestTimeout": 30,
			"requestTimeoutRenewal": 5,
			"src": {
				"provider": "github",
				"owner": "soajs",
				"repo": "soajs.urac"
			},
			"swagger": false,
			"versions": {
				"3": {
					"apis": [
						{
							"l": "Forgot password by username as (username or email) - an email will be sent with a link to reset the password",
							"v": "/password/forgot",
							"m": "get",
							"group": "My account guest"
						},
						{
							"l": "To validate user account after joining",
							"v": "/validate/join",
							"m": "get",
							"group": "Guest join"
						},
						{
							"l": "Check if a username as (username or email) is available or taken",
							"v": "/checkUsername",
							"m": "get",
							"group": "Guest join"
						},
						{
							"l": "Check if user (username or email) status if pendingJoin or pendingNew and send a new token email",
							"v": "/emailToken",
							"m": "get",
							"group": "My account guest"
						},
						{
							"l": "To validate change email",
							"v": "/validate/changeEmail",
							"m": "get",
							"group": "My account guest"
						},
						{
							"l": "Get user account information by username as (username or email)",
							"v": "/user",
							"m": "get",
							"group": "My account",
							"groupMain": true
						},
						{
							"l": "Get user by id",
							"v": "/admin/user",
							"m": "get",
							"group": "User administration"
						},
						{
							"l": "List users matching certain keywords",
							"v": "/admin/users",
							"m": "get",
							"group": "User administration",
							"groupMain": true
						},
						{
							"l": "Get users count matching certain keywords",
							"v": "/admin/users/count",
							"m": "get",
							"group": "User administration"
						},
						{
							"l": "List all groups",
							"v": "/admin/groups",
							"m": "get",
							"group": "Group administration"
						},
						{
							"l": "Get group by id or code",
							"v": "/admin/group",
							"m": "get",
							"group": "Group administration"
						},
						{
							"l": "Get all users and groups of a main tenant",
							"v": "/admin/all",
							"m": "get",
							"group": "Administration"
						},
						{
							"l": "Send custom email",
							"v": "/email",
							"m": "post",
							"group": "Custom email"
						},
						{
							"l": "Join and create an account",
							"v": "/join",
							"m": "post",
							"group": "Guest join"
						},
						{
							"l": "Add user",
							"v": "/admin/user",
							"m": "post",
							"group": "User administration"
						},
						{
							"l": "List users by Id",
							"v": "/admin/users/ids",
							"m": "post",
							"group": "User administration",
							"groupMain": true
						},
						{
							"l": "Add group",
							"v": "/admin/group",
							"m": "post",
							"group": "Group administration"
						},
						{
							"l": "Delete group",
							"v": "/admin/group",
							"m": "delete",
							"group": "Group administration"
						},
						{
							"l": "Reset password",
							"v": "/password/reset",
							"m": "put",
							"group": "My account guest"
						},
						{
							"l": "Change account's password by id",
							"v": "/account/password",
							"m": "put",
							"group": "My account"
						},
						{
							"l": "Change account's email by id",
							"v": "/account/email",
							"m": "put",
							"group": "My account"
						},
						{
							"l": "Edit account's information by id",
							"v": "/account",
							"m": "put",
							"group": "My account"
						},
						{
							"l": "Edit user by id",
							"v": "/admin/user",
							"m": "put",
							"group": "User administration"
						},
						{
							"l": "Edit user's groups by id, username, or email",
							"v": "/admin/user/groups",
							"m": "put",
							"group": "User administration"
						},
						{
							"l": "Edit, reset, or delete user's pin information by id, username, or email",
							"v": "/admin/user/pin",
							"m": "put",
							"group": "User administration"
						},
						{
							"l": "Change the status of a user by id",
							"v": "/admin/user/status",
							"m": "put",
							"group": "User administration"
						},
						{
							"l": "Edit group by id",
							"v": "/admin/group",
							"m": "put",
							"group": "Group administration"
						},
						{
							"l": "Update environment(s) of group(s) by code(s) or id(s)",
							"v": "/admin/groups/environments",
							"m": "put",
							"group": "Group administration"
						},
						{
							"l": "Update package(s) of group(s) by code(s) or id(s)",
							"v": "/admin/groups/packages",
							"m": "put",
							"group": "Group administration"
						},
						{
							"l": "Self Invite user by id or username as username or email",
							"v": "/admin/user/self/invite",
							"m": "put",
							"group": "User administration"
						},
						{
							"l": "Invite users by id, username or email",
							"v": "/admin/users/invite",
							"m": "put",
							"group": "User administration"
						},
						{
							"l": "un-Invite users by id, username or email",
							"v": "/admin/users/uninvite",
							"m": "put",
							"group": "User administration"
						}
					],
					"extKeyRequired": true,
					"oauth": true,
					"provision_ACL": false,
					"tenant_Profile": false,
					"urac": true,
					"urac_ACL": false,
					"urac_Config": false,
					"urac_GroupConfig": false,
					"urac_Profile": false
				}
			}
		}
	];
	let pack = {
		"code": "TPROD_BASIC",
		"name": "tes pack",
		"description": null,
		"acl": {
			"dev": {
				"urac": {
					"3": {
						"access": true,
						"apisPermission": "restricted",
						"get": {
							"apis": {
								"/validate/join": {
									"group": "Guest join",
									"access": false
								},
								"/checkUsername": {
									"group": "Guest join",
									"access": true
								}
							}
						}
					}
				},
				"micro1": {
					"1x2": {
						"access": false,
						"apisPermission": "restricted"
					}
				},
				"dashboard": {
					"1": {
						"access": true,
						"apisPermission": "restricted"
					}
				},
				"oauth": {
					"1": {
						"access": true,
						"apisPermission": "restricted"
					}
				}
			},
			"qa": {},
			"stg": {
				"urac": {
					"3": {
						"access": true
					}
				},
				"dashboard": {
					"1": {
						"access": false,
					}
				},
			}
		},
		"_TTL": 21600000,
		"aclTypeByEnv": {
			"dev": "granular",
			"stg": "granular"
		}
	};
	describe("testing buildAclServicePreview", function () {
		
		it("success", function (done) {
			let inputmaskData ={
				"packageCode": "TPROD_BASIC",
				"productCode": "TPROD",
				"mainEnv": "dev",
				"secEnv": "stg"
			};
			lib.buildAclServicePreview(service, pack, inputmaskData, function (body) {
				assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing buildAclApiPreview", function () {
		
		it("success", function (done) {
			let inputmaskData ={
				"packageCode": "TPROD_BASIC",
				"productCode": "TPROD",
				"mainEnv": "dev",
				"secEnv": "stg"
			};
			lib.buildAclApiPreview(service, pack, inputmaskData, function (body) {
				assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing updateServiceAcl", function () {
		
		it("success", function (done) {
			let env = "dev";
			let acl = [
				{
					"service": "dashboard",
					"version": "1",
					"envs": {
						"dev": true
					},
					"restriction": {
						"dev": true
					},
					"access": {
						"dev": true
					}
				},
				{
					"service": "micro1",
					"version": "1.2",
					"envs": {
						"dev": false
					},
					"restriction": {
						"dev": true
					},
					"access": {
						"dev": false
					}
				},
				{
					"service": "multitenant",
					"version": "1",
					"envs": {
						"dev": false
					},
					"restriction": {
						"dev": true
					},
					"access": {
						"dev": true
					}
				},
				{
					"service": "oauth",
					"version": "1",
					"envs": {
						"dev": true
					},
					"restriction": {
						"dev": true
					},
					"access": {
						"dev": false
					}
				},
				{
					"service": "urac",
					"version": "3",
					"envs": {
						"dev": true
					},
					"restriction": {
						"dev": true
					},
					"access": {
						"dev": false
					}
				}
			];
			lib.updateServiceAcl(pack, acl, env, function (body) {
				assert.ok(body);
				done();
			});
		});
		
	});
	
	
	describe("testing updateApiAcl", function () {
		
		it("success", function (done) {
			let env = "dev";
			let acl = [
				{
					"service": "urac",
					"version": "3",
					"group": "Guest join",
					"method": "get",
					"api": "/validate/join",
					"envs": {
						"dev": true
					},
					"access": {
						"dev": true
					},
					"restriction": {
						"dev": true
					}
				},
				{
					"service": "urac",
					"version": "3",
					"group": "Guest join",
					"method": "get",
					"api": "/checkUsername",
					"envs": {
						"dev": true
					},
					"access": {
						"dev": false
					},
					"restriction": {
						"dev": true
					}
				}
			];
			lib.updateApiAcl(pack, acl, env, function (body) {
				assert.ok(body);
				done();
			});
		});
		
	});
	
});