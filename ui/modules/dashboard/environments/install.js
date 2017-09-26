"use strict";

var envTranslation ={
	"code": {
		"ENG": "Code",
		"FRA": "Code"
	},
	"registries": {
		"ENG": "Registries",
		"FRA": "Registries"
	},
	"repositories": {
		"ENG": "Repositories",
		"FRA": "Repositories"
	},
	"platformsAndCertificates": {
		"ENG": "Platforms & Certificates",
		"FRA": "Platforms & Certificates"
	},
	"hosts": {
		"ENG": "Hosts",
		"FRA": "Hosts"
	},
	"databases": {
		"ENG": "Databases",
		"FRA": "Databases"
	},
	//config
	"environmentDescription": {
		"ENG": "Environment Description",
		"FRA": "Environment Description"
	},
	"myEnvDescription": {
		"ENG": "My Environment Description...",
		"FRA": "My Environment Description..."
	},
	"environmentDomain": {
		"ENG": "Environment Domain",
		"FRA": "Environment Domain"
	},
	"myDomainCom": {
		"ENG": "mydomain.com",
		"FRA": "mydomain.com"
	},
	"environmentGatewayPort": {
		"ENG": "Environment Gateway Port",
		"FRA": "Environment Gateway Port"
	},
	"profileToUse": {
		"ENG": "Profile to Use",
		"FRA": "Profile to Use"
	},
	"single": {
		"ENG": "single",
		"FRA": "single"
	},
	"replica3": {
		"ENG": "replica3",
		"FRA": "replica3"
	},
	"replica5": {
		"ENG": "replica5",
		"FRA": "replica5"
	},
	"platformDriver": {
		"ENG": "Platform Driver",
		"FRA": "Platform Driver"
	},
	"socket": {
		"ENG": "Socket",
		"FRA": "Socket"
	},
	"machine": {
		"ENG": "Machine",
		"FRA": "Machine"
	},
	"tenantKeySecurityPassword": {
		"ENG": "Tenant Key Security Password",
		"FRA": "Tenant Key Security Password"
	},
	"myTenantKeyAES256Password": {
		"ENG": "My Tenant Key AES256 Password...",
		"FRA": "My Tenant Key AES256 Password..."
	},
	"sessionCookieEncryptionPassword": {
		"ENG": "Session & Cookie encryption Password",
		"FRA": "Session & Cookie encryption Password"
	},
	"myPasswordDoNotTellAnyone": {
		"ENG": "My Password, don't tell anyone...",
		"FRA": "My Password, don't tell anyone..."
	},
	"databaseName": {
		"ENG": "Database Name",
		"FRA": "Database Name"
	},
	"myDatabase": {
		"ENG": "myDatabase...",
		"FRA": "myDatabase..."
	},
	"enterEnvironmentDatabaseName": {
		"ENG": "Enter Environment Database Name.",
		"FRA": "Enter Environment Database Name."
	},
	"clusterName": {
		"ENG": "Cluster Name",
		"FRA": "Cluster Name"
	},
	"sessionDatabaseCollection": {
		"ENG": "Session Database Collection",
		"FRA": "Session Database Collection"
	},
	"sessionDots": {
		"ENG": "session...",
		"FRA": "session..."
	},
	"provideTheSessionDatabaseCollectionName": {
		"ENG": "Provide the Session Database Collection Name",
		"FRA": "Provide the Session Database Collection Name"
	},
	"stringified": {
		"ENG": "Stringified",
		"FRA": "Stringified"
	},
	"expiresAfter": {
		"ENG": "Expires After",
		"FRA": "Expires After"
	},
	"enterNumberHoursBeforeSessionExpires": {
		"ENG": "Enter the number of hours before the session expires",
		"FRA": "Enter the number of hours before the session expires"
	},
	"store": {
		"ENG": "Store",
		"FRA": "Store"
	},
	"provideTheSessionDatabaseStore": {
		"ENG": "Provide the Session Database Store",
		"FRA": "Provide the Session Database Store"
	},
	"admin": {
		"ENG": "admin",
		"FRA": "admin"
	},
	"hostNumber": {
		"ENG": "Host(s) Number",
		"FRA": "Host(s) Number"
	},
	"enterHowManyHostsAddForService": {
		"ENG": "Enter How Many Host(s) you would like to add for this service.",
		"FRA": "Enter How Many Host(s) you would like to add for this service."
	},
	"environmentVariables": {
		"ENG": "Environment Variables",
		"FRA": "Environment Variables"
	},
	"provideOptionalEnvironmentVariablesSeparatedComma": {
		"ENG": "Provide Optional Environment Variables separated by a comma",
		"FRA": "Provide Optional Environment Variables separated by a comma"
	},
	"defaultEnvironmentVariables": {
		"ENG": "Default Environment Variables:",
		"FRA": "Default Environment Variables:"
	},
	"controller": {
		"ENG": "Number of Controller Instances",
		"FRA": "Number of Controller Instances"
	},
	"numberOfNginxInstances": {
		"ENG": "Number of Nginx Instances",
		"FRA": "Number of Nginx Instances"
	},
	"chooseHowManyControllersDeploy": {
		"ENG": "Choose how many controllers to deploy",
		"FRA": "Choose how many controllers to deploy"
	},
	"certificates": {
		"ENG": "Certificates",
		"FRA": "Certificates"
	},
	"uploadCertificate": {
		"ENG": "Upload Certificate",
		"FRA": "Upload Certificate"
	},
	"uploadCertificatePemFormat": {
		"ENG": "Upload certificates in .pem format.",
		"FRA": "Upload certificates in .pem format."
	},
	"driverName": {
		"ENG": "Driver Name",
		"FRA": "Driver Name"
	},
	"driverHost": {
		"ENG": "Driver Host",
		"FRA": "Driver Host"
	},
	"driverPort": {
		"ENG": "Driver Port",
		"FRA": "Driver Port"
	},
	"additionalConfiguration": {
		"ENG": "Additional Configuration",
		"FRA": "Additional Configuration"
	},
	"provideOptionalDriverConfiguration": {
		"ENG": "Provide optional driver configuration",
		"FRA": "Provide optional driver configuration"
	},
	"siteDomain": {
		"ENG": "Site Domain",
		"FRA": "Site Domain"
	},
	"apiDomain": {
		"ENG": "API Domain",
		"FRA": "API Domain"
	},
	"apiPrefix": {
		"ENG": "API Prefix",
		"FRA": "API Prefix"
	},
	"sitePrefix": {
		"ENG": "Site Prefix",
		"FRA": "Site Prefix"
	},
	"inCaseAPIPrefixNotSpecified": {
		"ENG": 'In case the api prefix was not specified, it will be set to "api" by default',
		"FRA": 'In case the api prefix was not specified, it will be set to "api" by default'
	},
	"inCaseSitePrefixNotSpecified": {
		"ENG": 'In case the site prefix was not specified, it will be set to "site" by default',
		"FRA": 'In case the site prefix was not specified, it will be set to "site" by default'
	},
	"enterSitePrefix": {
		"ENG": "Enter Site Prefix",
		"FRA": "Enter Site Prefix"
	},
	"enterAPIPrefix": {
		"ENG": "Enter API Prefix",
		"FRA": "Enter API Prefix"
	},
	"inCaseAPIOrSitePrefixNotSpecified": {
		"ENG": 'In case API Prefix and Site Prefix were not specified, they will be set by default to "api" and "site" respectively.',
		"FRA": 'In case API Prefix and Site Prefix were not specified, they will be set by default to "api" and "site" respectively.'
	},
	"inOrderToViewNewEnvYouNeedToReLogin": {
		"ENG": "However, in order to view the newly created environment you need to re-login",
		"FRA": "However, in order to view the newly created environment you need to re-login"
	},
	"hacloud": {
		"ENG": "High Availability - Cloud",
		"FRA": "High Availability - Cloud"
	},
	"nodeIP": {
		"ENG": "Node IP/Domain",
		"FRA": "Node IP/Domain"
	},
	"nodeDockerPort": {
		"ENG": "Node Docker Port",
		"FRA": "Node Docker Port"
	},
	"nodeRole": {
		"ENG": "Node Role",
		"FRA": "Node Role"
	},
	//controller
	"addNewEnvironment": {
		"ENG": "Add New Environment",
		"FRA": "Add New Environment"
	},
	"environmentCreatedSuccessfully": {
		"ENG": "Environment Created Successfully.",
		"FRA": "Environment Created Successfully."
	},
	"advancedMode": {
		"ENG": "Advanced Mode",
		"FRA": "Advanced Mode"
	},
	"errorInvalidLoggerJsonObject": {
		"ENG": "Error: Invalid logger Json object",
		"FRA": "Error: Invalid logger Json object"
	},
	"provideConfigurationOnePlatformDriverProceed": {
		"ENG": "Provide a configuration for at least one platform driver to proceed.",
		"FRA": "Provide a configuration for at least one platform driver to proceed."
	},
	"errorInvalidJsonObjectProvidedDeployerConfiguration": {
		"ENG": "Error: invalid Json object provided for Deployer Configuration",
		"FRA": "Error: invalid Json object provided for Deployer Configuration"
	},
	"updated": {
		"ENG": "Updated",
		"FRA": "Updated"
	},
	"successfully": {
		"ENG": "Successfully.",
		"FRA": "Successfully."
	},
	"securityKeyUpdateSuccessMessage": {
		"ENG": "It is mandatory that you copy the external key of the default login package for the dashboard environment and paste it in the config.js file [apiConfiguration.key field]. By default, the login package for dashboard is called DSBRD_MAIN. When done, re-login to dashboard and generate new external keys for all your tenants for this environment.",
		"FRA": "It is mandatory that you copy the external key of the default login package for the dashboard environment and paste it in the config.js file [apiConfiguration.key field]. By default, the login package for dashboard is called DSBRD_MAIN. When done, re-login to dashboard and generate new external keys for all your tenants for this environment."
	},
	"selectedEnvironmentRemoved": {
		"ENG": "Selected Environment has been removed.",
		"FRA": "Selected Environment has been removed."
	},
	"unableRemoveSelectedEnvironment": {
		"ENG": "Unable to remove selected Environment",
		"FRA": "Unable to remove selected Environment"
	},
	"upload": {
		"ENG": "Upload",
		"FRA": "Upload"
	},
	"uploadingCertificates": {
		"ENG": "Uploading Certificates...",
		"FRA": "Uploading Certificates..."
	},
	"thisMightTakeFewMinutesPleaseWait": {
		"ENG": "This might take a few minutes, please wait.",
		"FRA": "This might take a few minutes, please wait."
	},
	"certificateAddedSuccessfully": {
		"ENG": "Certificate(s) added successfully.",
		"FRA": "Certificate(s) added successfully."
	},
	"selectedCertificateRemoved": {
		"ENG": "Selected Certificate has been removed",
		"FRA": "Selected Certificate has been removed"
	},
	//services
	//platforms
	"local": {
		"ENG": "local",
		"FRA": "local"
	},
	"cloud": {
		"ENG": "cloud",
		"FRA": "cloud"
	},
	"uploadCertificates": {
		"ENG": "Upload Certificates",
		"FRA": "Upload Certificates"
	},
	"chosenCertificatesSavedSuccessfully": {
		"ENG": "The chosen certificates were saved successfully",
		"FRA": "The chosen certificates were saved successfully"
	},
	"errorOccurredWhileUploadingFile": {
		"ENG": "Error Occurred while uploading file:",
		"FRA": "Error Occurred while uploading file:"
	},
	"selectedDriverUpdated": {
		"ENG": "Selected driver has been updated",
		"FRA": "Selected driver has been updated"
	},
	"driverConfigurationClearedSuccessfully": {
		"ENG": "Driver configuration cleared successfully",
		"FRA": "Driver configuration cleared successfully"
	},
	"addDriver": {
		"ENG": "Add Driver",
		"FRA": "Add Driver"
	},
	//hosts
	"driverCreatedSuccessfully": {
		"ENG": "Driver created successfully",
		"FRA": "Driver created successfully"
	},
	"unableRetrieveServicesHostsInformation": {
		"ENG": "Unable to retrieve services hosts information.",
		"FRA": "Unable to retrieve services hosts information."
	},
	"unableToRetrieveZombieContainers": {
		"ENG": "Unable to retrieve zombie containers",
		"FRA": "Unable to retrieve zombie containers"
	},
	"unableToDeleteZombieContainer": {
		"ENG": "Unable to delete zombie container",
		"FRA": "Unable to delete zombie container"
	},
	"zombieContainerRemovedSuccessfully": {
		"ENG": "Zombie container removed successfully",
		"FRA": "Zombie container removed succesfully"
	},
	"unableToGetZombieContainerLogs": {
		"ENG": "Unable to get zombie container logs",
		"FRA": "Unable to get zombie container logs"
	},
	"controllers": {
		"ENG": "Controllers",
		"FRA": "Controllers"
	},
	"notHealthy": {
		"ENG": "not healthy",
		"FRA": "not healthy"
	},
	"errorExecutingHeartbeatTest": {
		"ENG": "error executing heartbeat test for",
		"FRA": "error executing heartbeat test for"
	},
	"onHostName": {
		"ENG": "on hostname:",
		"FRA": "on hostname:"
	},
	"service": {
		"ENG": "Service",
		"FRA": "Service"
	},
	"isHealthy": {
		"ENG": "is healthy",
		"FRA": "is healthy"
	},
	"checkingServicePleaseWait": {
		"ENG": "checking services please wait...",
		"FRA": "checking services please wait..."
	},
	"errorExecutingAwarnessTestControllerIP": {
		"ENG": "error executing awareness test for controller on ip:",
		"FRA": "error executing awareness test for controller on ip:"
	},
	"awarenessTestControllerIP": {
		"ENG": "Awareness test for controller on ip:",
		"FRA": "Awareness test for controller on ip:"
	},
	"wasSuccesful": {
		"ENG": "was successful",
		"FRA": "was successful"
	},
	"errorExecutingReloadRegistryTest": {
		"ENG": "error executing Reload Registry test for",
		"FRA": "error executing Reload Registry test for"
	},
	"onIP": {
		"ENG": "on ip:",
		"FRA": "on ip:"
	},
	"errorExecutingDaemonStatisticsTest": {
		"ENG": "error executing Daemon Statistics test for",
		"FRA": "error executing Daemon Statistics test for"
	},
	"selectedEnvironmentHostRemoved": {
		"ENG": "Selected Environment host has been removed.",
		"FRA": "Selected Environment host has been removed."
	},
	"errorExecutingGetHostLogsOperation": {
		"ENG": "error executing get Host Logs Operation for",
		"FRA": "error executing get Host Logs Operation for"
	},
	"unableRetrieveListServices": {
		"ENG": "Unable to retrieve the list of services",
		"FRA": "Unable to retrieve the list of services"
	},
	"controllerLowercase": {
		"ENG": "controller",
		"FRA": "controller"
	},
	"selectServiceFromListAbove": {
		"ENG": "Select the service from the list above.",
		"FRA": "Select the service from the list above."
	},
	"createNewServiceHost": {
		"ENG": "Create New Service Host",
		"FRA": "Create New Service Host"
	},
	"deployingNewHostFor": {
		"ENG": "Deploying new Host for",
		"FRA": "Deploying new Host for"
	},
	"doNotRefreshThisPageThisWillTakeFewMinutes": {
		"ENG": "Do not refresh this page, this will take a few minutes...",
		"FRA": "Do not refresh this page, this will take a few minutes..."
	},
	"newServiceHostsAdded": {
		"ENG": "New Service Host(s) Added.",
		"FRA": "New Service Host(s) Added."
	},
	"unableRetrieveDaemonsHostsInformation": {
		"ENG": "Unable to retrieve daemons hosts information.",
		"FRA": "Unable to retrieve daemons hosts information."
	},
	"daemonGroupConfiguration": {
		"ENG": "Daemon Group Configuration",
		"FRA": "Daemon Group Configuration"
	},
	"chooseGroupConfigForSelectedDaemon": {
		"ENG": "Choose a daemon group configuration for selected daemon",
		"FRA": "Choose a daemon group configuration for selected daemon"
	},
	"portMapping": {
		"ENG": "Port Mapping",
		"FRA": "Port Mapping"
	},
	"network": {
		"ENG": "Network",
		"FRA": "Network"
	},
	"instances": {
		"ENG": "Instances",
		"FRA": "Instances"
	},
	"activeHosts": {
		"ENG": "Active Hosts",
		"FRA": "Active Hosts"
	},
	//deploy
	"deployEnvironment": {
		"ENG": "Deploy Environment",
		"FRA": "Deploy Environment"
	},
	"youMustChooseLeastControllerDeployEnvironment": {
		"ENG": "You must choose at least 1 controller to deploy this environment",
		"FRA": "You must choose at least 1 controller to deploy this environment"
	},
	"deployingNew": {
		"ENG": "Deploying new ",
		"FRA": "Deploying new "
	},
	"deploying": {
		"ENG": "Deploying ",
		"FRA": "Deploying "
	},
	"newControllersEnvironment": {
		"ENG": " new controller(s) for environment ",
		"FRA": " new controllers(s) for environment "
	},
    "newNginxEnvironment": {
        "ENG": " new nginx instance(s) for environment ",
        "FRA": " new nginx instance(s) for environment "
    },
	"zombieContainers": {
		"ENG": "Zombie Containers",
		"FRA": "Zombie Containers"
	},
	"containerLogs": {
		"ENG": "Container Logs",
		"FRA": "Container Logs"
	},
	"deleteContainer": {
		"ENG": "Delete Container",
		"FRA": "Delete Container"
	},
	//database
	"unableFetchEnvironmentDatabase": {
		"ENG": "Unable to fetch Environment Database.",
		"FRA": "Unable to fetch Environment Database."
	},
	"selectedEnvironmentDatabaseRemoved": {
		"ENG": "Selected Environment Database has been removed.",
		"FRA": "Selected Environment Database has been removed."
	},
	"unableRemoveSelectedEnvironmentDatabase": {
		"ENG": "Unable to remove selected Environment Database.",
		"FRA": "Unable to remove selected Environment Database."
	},
	"environmentDatabaseAddedSuccessfully": {
		"ENG": "Environment Database Added Successfully.",
		"FRA": "Environment Database Added Successfully."
	},
	"updateDatabase": {
		"ENG": "Update Database",
		"FRA": "Update Database"
	},
	"environmentDatabasePrefixUpdated": {
		"ENG": "Environment Database Prefix has been updated.",
		"FRA": "Environment Database Prefix has been updated."
	},
	"environmentDatabasePrefixRemoved": {
		"ENG": "Environment Database Prefix has been removed.",
		"FRA": "Environment Database Prefix has been removed."
	},
	"unableUpdateEnvironmentDatabasePrefix": {
		"ENG": "Unable to update Environment Database Prefix.",
		"FRA": "Unable to update Environment Database Prefix."
	},
	//directives
	//addEditDriver
	"driverType": {
		"ENG": "Driver Type",
		"FRA": "Driver Type"
	},
	"host": {
		"ENG": "Host",
		"FRA": "Host"
	},
	"cloudProvider": {
		"ENG": "Cloud Provider",
		"FRA": "Cloud Provider"
	},
	"socketPath": {
		"ENG": "Socket Path",
		"FRA": "Socket Path"
	},
	"goBackEnvironments": {
		"ENG": "Go Back to Environments",
		"FRA": "Go Back to Environments"
	},
	"enterEnvironmentCodeMaximumCharacters": {
		"ENG": "Enter Environment Code; maximum 5 characters.",
		"FRA": "Enter Environment Code; maximum 5 characters."
	},
	"domain": {
		"ENG": "Domain",
		"FRA": "Domain"
	},
	"enterEnvironmentDomain": {
		"ENG": "Enter Environment Domain",
		"FRA": "Enter Environment Domain"
	},
	"enterDescriptionExplainingUsageEnvironment": {
		"ENG": "Enter a description explaining the usage of this environment",
		"FRA": "Enter a description explaining the usage of this environment"
	},
	"developmentEnvironmentUsedByDevelopers": {
		"ENG": "Development Environment, used by developers and does not reach production server...",
		"FRA": "Development Environment, used by developers and does not reach production server..."
	},
	"environmentGatewayPortNginx": {
		"ENG": "Environment Gateway Port for Nginx",
		"FRA": "Environment Gateway Port for Nginx"
	},
	"pickDatabaseProfile": {
		"ENG": "Pick a Database Profile to use.",
		"FRA": "Pick a Database Profile to use."
	},
	"serviceConfig": {
		"ENG": "Service Config",
		"FRA": "Service Config"
	},
	"maxPoolSize": {
		"ENG": "Max Pool Size",
		"FRA": "Max Pool Size"
	},
	"specifyControllersMaximumPoolSize": {
		"ENG": "Specify the controller's maximum pool size, 0 is unlimited. More info on",
		"FRA": "Specify the controller's maximum pool size, 0 is unlimited. More info on"
	},
	"request": {
		"ENG": "Request",
		"FRA": "Request"
	},
	"true": {
		"ENG": "True",
		"FRA": "True"
	},
	"false": {
		"ENG": "False",
		"FRA": "False"
	},
	"specifyControllerShouldPersistSessionUser": {
		"ENG": "Specify if the controller should persist the session of the user for browsers that doesn't support cookies.",
		"FRA": "Specify if the controller should persist the session of the user for browsers that doesn't support cookies."
	},
	"specifyControllerMaximumTimeoutLimitInSeconds": {
		"ENG": "Specify the controller maximum timeout limit in seconds, between 20 and 60 seconds",
		"FRA": "Specify the controller maximum timeout limit in seconds, between 20 and 60 seconds"
	},
	"specifyControllerTimeoutRenewalCount": {
		"ENG": "Specify the controller timeout renewal count, 0 for unlimited",
		"FRA": "Specify the controller timeout renewal count, 0 for unlimited"
	},
	"healthCheckInterval": {
		"ENG": "Health Check Interval",
		"FRA": "Health Check Interval"
	},
	"specifyAmountTimeMillisecondsBetweenHealthCheck": {
		"ENG": "Specify the amount of time in milliseconds between health check operations, minimum 5000.",
		"FRA": "Specify the amount of time in milliseconds between health check operations, minimum 5000."
	},
	"autoReloadRegistry": {
		"ENG": "Auto Reload Registry",
		"FRA": "Auto Reload Registry"
	},
	"specifyAmountTimeMillisecondsAutoReloadRegistry": {
		"ENG": "Specify the amount of time in milliseconds to auto reload the registry, minimum 60000.",
		"FRA": "Specify the amount of time in milliseconds to auto reload the registry, minimum 60000."
	},
	"maxLogCount": {
		"ENG": "Max Log Count",
		"FRA": "Max Log Count"
	},
	"specifyMaximumNumberDisplayAwarenessWarningLogs": {
		"ENG": "Specify the maximum number to display awareness warning logs for each service before stopping, minimum 5.",
		"FRA": "Specify the maximum number to display awareness warning logs for each service before stopping, minimum 5."
	},
	"autoRegisterService": {
		"ENG": "Auto Register Service",
		"FRA": "Auto Register Service"
	},
	"specifyIfServicesShouldAutoRegister": {
		"ENG": "Specify if services should auto register or not.",
		"FRA": "Specify if services should auto register or not."
	},
	"algorithm": {
		"ENG": "Algorithm",
		"FRA": "Algorithm"
	},
	"specifyAlgorithmPasswordMinimumCharacters": {
		"ENG": "Specify the algorithm to use and a password (minimum 5 characters) to encrypt tenant keys. More info on",
		"FRA": "Specify the algorithm to use and a password (minimum 5 characters) to encrypt tenant keys. More info on"
	},
	"specifyLoggerConfiguration": {
		"ENG": "Specify the logger configuration to use. More info on",
		"FRA": "Specify the logger configuration to use. More info on"
	},
	"enabled": {
		"ENG": "Enabled",
		"FRA": "Enabled"
	},
	"specifyCORSShouldBeEnabled": {
		"ENG": "Specify if CORS should be enabled",
		"FRA": "Specify if CORS should be enabled"
	},
	"origin": {
		"ENG": "Origin",
		"FRA": "Origin"
	},
	"specifyOriginThatCORSShouldSupport": {
		"ENG": "Specify the origin that CORS should support",
		"FRA": "Specify the origin that CORS should support"
	},
	"specifyCORSShouldSupportCredentialsRequests": {
		"ENG": "Specify if CORS should should support credentials in requests",
		"FRA": "Specify if CORS should should support credentials in requests"
	},
	"methods": {
		"ENG": "Methods",
		"FRA": "Methods"
	},
	"enterMethodsThatCORSShouldSupport": {
		"ENG": "Enter the methods that CORS should support",
		"FRA": "Enter the methods that CORS should support"
	},
	"headers": {
		"ENG": "Headers",
		"FRA": "Headers"
	},
	"enterHeaderValuesThatCORSShouldSupport": {
		"ENG": "Enter header values that CORS should support",
		"FRA": "Enter header values that CORS should support"
	},
	"maxAge": {
		"ENG": "Max age",
		"FRA": "Max age"
	},
	"specifyMaximumAgeValueMillisecondsCORSCashe": {
		"ENG": "Specify the maximum age value in milliseconds for how long CORS should cache the response",
		"FRA": "Specify the maximum age value in milliseconds for how long CORS should cache the response"
	},
	"grants": {
		"ENG": "Grants",
		"FRA": "Grants"
	},
	"accessTokenLifetime":{
		"ENG": "Access Token Lifetime",
		"FRA": "Access Token Lifetime"
	},
	"accessTokenLifetimeNote":{
		"ENG": "Access Token Lifetime in seconds. Default is 1 hour.",
		"FRA": "Access Token Lifetime in seconds. Default is 1 hour."
	},
	"refreshTokenLifetime":{
		"ENG": "Refresh Token Lifetime",
		"FRA": "Refresh Token Lifetime"
	},
	"refreshTokenLifetimeNote":{
		"ENG": "Refresh Token Lifetime in seconds. Default is 14 days.",
		"FRA": "Refresh Token Lifetime in seconds. Default is 14 days."
	},

	"enterCommaSeparatedValues": {
		"ENG": "Enter comma separated values",
		"FRA": "Enter comma separated values"
	},
	"passwordRefreshGrants": {
		"ENG": "password,refresh_grants",
		"FRA": "password,refresh_grants"
	},
	"debug": {
		"ENG": "Debug",
		"FRA": "Debug"
	},
	"enterSupportedGrantTypesoAuthSpecifyIfoAuthDebugMode": {
		"ENG": "Enter the supported grant types of oAuth and specify if oAuth should run in debug mode.",
		"FRA": "Enter the supported grant types of oAuth and specify if oAuth should run in debug mode."
	},
	"controllerUpperCase": {
		"ENG": "Controller",
		"FRA": "Controller"
	},
	"provideTheControllerDefaultPort": {
		"ENG": "Provide the controller default port",
		"FRA": "Provide the controller default port"
	},
	"maintenanceInc": {
		"ENG": "MaintenanceInc",
		"FRA": "MaintenanceInc"
	},
	"provideMaintenancePortRangeValueDefaultPort": {
		"ENG": "Provide the maintenance port range value from the default port; maintenance port = 4000 + 1000, minimum 1000.",
		"FRA": "Provide the maintenance port range value from the default port; maintenance port = 4000 + 1000, minimum 1000."
	},
	"randomInc": {
		"ENG": "RandomInc",
		"FRA": "RandomInc"
	},
	"whenNewServicesNoPortRegisteredRandomPortNumberAssigned": {
		"ENG": "When new services with no port are registered, random port number is assigned. Provide limit: minimum 100.",
		"FRA": "When new services with no port are registered, random port number is assigned. Provide limit: minimum 100."
	},
	"secret": {
		"ENG": "Secret",
		"FRA": "Secret"
	},
	"enterCookieSecretPhraseEncryptCookieValues": {
		"ENG": "Enter the cookie secret phrase, used to encrypt cookie values, minimum 5 characters.",
		"FRA": "Enter the cookie secret phrase, used to encrypt cookie values, minimum 5 characters."
	},
	"specifyNameForThisSessionMinimumCharacters": {
		"ENG": "Specify a name for the session, minimum 5 characters.",
		"FRA": "Specify a name for the session, minimum 5 characters."
	},
	"specifySecretPhraseUsedEncryptSessionValues": {
		"ENG": "Specify a secret phrase used to encrypt session values, minimum 5 characters.",
		"FRA": "Specify a secret phrase used to encrypt session values, minimum 5 characters."
	},
	"proxy": {
		"ENG": "Proxy",
		"FRA": "Proxy"
	},
	"useTrustProxySettingsFromExpress": {
		"ENG": "Use 'trust proxy' settings from express",
		"FRA": "Use 'trust proxy' settings from express"
	},
	"useXForwardedProtoHeaders": {
		"ENG": "Use 'X-Forwarded-Proto' in headers",
		"FRA": "Use 'X-Forwarded-Proto' in headers"
	},
	"ignoreAllHeadersOnlyTSLSSlConnections": {
		"ENG": "Ignore all headers, only TLS/SSL connections are secured",
		"FRA": "Ignore all headers, only TLS/SSL connections are secured"
	},
	"pickTheProxyOptionFromListAbove": {
		"ENG": "Pick the proxy option from the list above; 1st value is the default value. More info on",
		"FRA": "Pick the proxy option from the list above; 1st value is the default value. More info on"
	},
	"expressSession": {
		"ENG": "Express Session",
		"FRA": "Express Session"
	},
	"chooseIfCookieShouldSetEveryResponseCookieExpiration": {
		"ENG": "Choose if the cookie should be set on every response or not. If true, the cookie expiration date will be reset every time.",
		"FRA": "Choose if the cookie should be set on every response or not. If true, the cookie expiration date will be reset every time."
	},
	"rolling": {
		"ENG": "Rolling",
		"FRA": "Rolling"
	},
	"resave": {
		"ENG": "Resave",
		"FRA": "Resave"
	},
	"chooseIfSessionShouldBeSavedBackSessionStore": {
		"ENG": "Choose if the session should be saved back to the session store, even if it was never modified during the request.",
		"FRA": "Choose if the session should be saved back to the session store, even if it was never modified during the request."
	},
	"saveUninitialized": {
		"ENG": "Save Uninitialized",
		"FRA": "Save Uninitialized"
	},
	"chooseWhetherForceSessionUninitializedSavedStore": {
		"ENG": "Choose Whether to force a session that is 'uninitialized' to be saved to the store. More info on",
		"FRA": "Choose Whether to force a session that is 'uninitialized' to be saved to the store. More info on"
	},
	"unset": {
		"ENG": "Unset",
		"FRA": "Unset"
	},
	"keep": {
		"ENG": "Keep",
		"FRA": "Keep"
	},
	"destroy": {
		"ENG": "Destroy",
		"FRA": "Destroy"
	},
	"chooseSessionShouldDeletedWhenResponseEnds": {
		"ENG": "Choose if the session should be deleted when the response ends or it should be kept, default is kept",
		"FRA": "Choose if the session should be deleted when the response ends or it should be kept, default is kept"
	},
	"cookie": {
		"ENG": "Cookie",
		"FRA": "Cookie"
	},
	"path": {
		"ENG": "Path",
		"FRA": "Path"
	},
	"specifyPathWhereCookieShouldBeCreated": {
		"ENG": "Specify path where cookies should be created.",
		"FRA": "Specify path where cookies should be created."
	},
	"httpOnly": {
		"ENG": "Http Only",
		"FRA": "Http Only"
	},
	"chooseIfCookiesShouldBeUsedHTTPMode": {
		"ENG": "Choose if cookies should be used in HTTP mode only.",
		"FRA": "Choose if cookies should be used in HTTP mode only."
	},
	"chooseIfCookiesShouldEncrypted": {
		"ENG": "Choose if cookies should be encrypted.",
		"FRA": "Choose if cookies should be encrypted."
	},
	"specifyLifetimeCookieMilliseconds": {
		"ENG": "Specify the lifetime of a cookie in milliseconds, 0 is unlimited.",
		"FRA": "Specify the lifetime of a cookie in milliseconds, 0 is unlimited."
	},
	"secure": {
		"ENG": "Secure",
		"FRA": "Secure"
	},
	"tenantKeySecurity": {
		"ENG": "Tenant Key Security:",
		"FRA": "Tenant Key Security:"
	},
	/*Changing the tenant key security encryption configuration, disables the usage of all tenant keys.If you choose to proceed:
	 A new dashboard key will be generated for you and you have to replace the current key in config.js
	 You need to go to Multi-Tenancy and generate new keys for all your tenants
	 Specify the algorithm to use and a password (minimum 5 characters) to encrypt tenant keys. More info on what options are supported is found at
	 */
	"changingLoggingConfigurationMayCauseImproperFunctionality":{
        "ENG": "Changing the formatter configuration will cause the analytics to function improperly.",
        "FRA": "Changing the formatter configuration will cause the analytics to function improperly.",
	},

	"adviceToKeepConfigurationAsIs":{
        "ENG": "It is advisable to keep the Logger configuration as is, in case you choose to turn on Analytics in the future.",
        "FRA": "It is advisable to keep the Logger configuration as is, in case you choose to turn on Analytics in the future.",
	},

	"changingTenantKeySecurityEncryptionConfigurationDisablesTenantKeys": {
		"ENG": "Changing the tenant key security encryption configuration, disables the usage of all tenant keys.",
		"FRA": "Changing the tenant key security encryption configuration, disables the usage of all tenant keys."
	},
	"ifYouChooseProceed": {
		"ENG": "If you choose to proceed:",
		"FRA": "If you choose to proceed:"
	},
	"newDashboardKeyGeneratedReplaceKey": {
		"ENG": "A new dashboard key will be generated for you and you have to replace the current key in config.js",
		"FRA": "A new dashboard key will be generated for you and you have to replace the current key in config.js"
	},
	"youNeedToGoTo": {
		"ENG": "You need to go to",
		"FRA": "You need to go to"
	},
	"andGenerateNewKeysTenants": {
		"ENG": "and generate new keys for all your tenants",
		"FRA": "and generate new keys for all your tenants"
	},
	"specifyAlgorithmUsePasswordMinimumCharactersEncryptTenantKeys": {
		"ENG": "Specify the algorithm to use and a password (minimum 5 characters) to encrypt tenant keys. More info on what options are supported is found at",
		"FRA": "Specify the algorithm to use and a password (minimum 5 characters) to encrypt tenant keys. More info on what options are supported is found at"
	},
	"areYouSureYouWantChangeSecurityKeyConfiguration": {
		"ENG": "Are you sure you want to Change the security key configuration?",
		"FRA": "Are you sure you want to Change the security key configuration?"
	},
	"updateTenantSecurity": {
		"ENG": "Update Tenant Security",
		"FRA": "Update Tenant Security"
	},
	//list
	"editEnvironment": {
		"ENG": "Edit Environment",
		"FRA": "Edit Environment"
	},
	"removeEnvironment": {
		"ENG": "Remove Environment",
		"FRA": "Remove Environment"
	},
	"areYouSureWantRemoveThisEnvironment": {
		"ENG": "Are you sure you want to remove this environment?",
		"FRA": "Are you sure you want to remove this environment?"
	},
	"tenantSecurityUpdated": {
		"ENG": "Tenant Security Configuration has been updated",
		"FRA": "Tenant Security Configuration has been updated"
	},
	"theFollowingKeysWereGenerated": {
		"ENG": "The following external keys were generated",
		"FRA": "The following external keys were generated"
	},
	"appPackage": {
		"ENG": "Application Package",
		"FRA": "Application Package"
	},
	"reloadDashboard": {
		"ENG": "Reload Dashboard",
		"FRA": "Reload Dashboard"
	},
	"update": {
		"ENG": "Update",
		"FRA": "Update"
	},
	"codeView": {
		"ENG": "Code View",
		"FRA": "Code View"
	},
	"treeView": {
		"ENG": "Tree View",
		"FRA": "Tree View"
	},
	"formView": {
		"ENG": "Form View",
		"FRA": "Form View"
	},
	"customRegistryFieldMsg": {
		"ENG": "Use this input to add any custom registry value, supported types are: JSON, Boolean, Number, Regular Expression (Turn on text support above if the value is text)",
		"FRA": "Use this input to add any custom registry value, supported types are: JSON, Boolean, Number, Regular Expression (Turn on text support above if the value is text)"
	},
	"defaultRegistry": {
		"ENG": "Default Registry",
		"FRA": "Default Registry"
	},
	"customRegistry": {
		"ENG": "Custom Registry",
		"FRA": "Custom Registry"
	},
	"loadingCustomRegistry": {
		"ENG": "Loading custom registry ...",
		"FRA": "Loading custom registry ..."
	},
	//list-databases
	"areYouSureYouWantRemoveSelectedDatabase": {
		"ENG": "Are you sure you want to remove the selected database ?",
		"FRA": "Are you sure you want to remove the selected database ?"
	},
	"removeDatabase": {
		"ENG": "Remove Database",
		"FRA": "Remove Database"
	},
	"editDatabase": {
		"ENG": "Edit Database",
		"FRA": "Edit Database"
	},
	"addSessionDatabase": {
		"ENG": "Add Session Database",
		"FRA": "Add Session Database"
	},
	"addNewDatabase": {
		"ENG": "Add New Database",
		"FRA": "Add New Database"
	},
	//list-deployment
	"thisEnvironmentConfiguredDeployed": {
		"ENG": "This Environment is Configured to be deployed",
		"FRA": "This Environment is Configured to be deployed"
	},
	"manually": {
		"ENG": "Manually",
		"FRA": "Manually"
	},
	"allServicesRunningEnvironmentHaveStartedStoppedAdministrator": {
		"ENG": "All Services running in this environment have to be started and stopped by the administrator.",
		"FRA": "All Services running in this environment have to be started and stopped by the administrator."
	},
	"thisEnvironmentConfiguredUse": {
		"ENG": "This Environment is Configured to use",
		"FRA": "This Environment is Configured to use"
	},
	"deployment": {
		"ENG": "Deployment",
		"FRA": "Deployment"
	},
	"containerDrivers": {
		"ENG": "Container Drivers:",
		"FRA": "Container Drivers:"
	},
	"dockerCertificates": {
		"ENG": "Docker Certificates:",
		"FRA": "Docker Certificates:"
	},
	"length": {
		"ENG": "Length",
		"FRA": "Length"
	},
	"uploadDate": {
		"ENG": "Upload Date",
		"FRA": "Upload Date"
	},
	"areYouSureYouWantDelete": {
		"ENG": "Are you sure you want to delete",
		"FRA": "Are you sure you want to delete"
	},
	"noCertificatesUploadedYet": {
		"ENG": "No certificates uploaded yet!",
		"FRA": "No certificates uploaded yet!"
	},
	//list-hosts
	"thisEnvironmentHasNotBeenDeployedYet": {
		"ENG": "This Environment has not been deployed yet.",
		"FRA": "This Environment has not been deployed yet."
	},
	"addNewHosts": {
		"ENG": "Add new Hosts",
		"FRA": "Add new Hosts"
	},
	"refresh": {
		"ENG": "Refresh",
		"FRA": "Refresh"
	},
	"hostname": {
		"ENG": "Hostname",
		"FRA": "Hostname"
	},
	"executeHeartbeatOperation": {
		"ENG": "Execute Heartbeat Operation",
		"FRA": "Execute Heartbeat Operation"
	},
	"executeAwarenessOperation": {
		"ENG": "Execute Awareness Operation",
		"FRA": "Execute Awareness Operation"
	},
	"reloadRegistryOperation": {
		"ENG": "Reload Registry Operation",
		"FRA": "Reload Registry Operation"
	},
	"areYouSureYouWantRemoveHost": {
		"ENG": "Are you sure you want to remove this host?",
		"FRA": "Are you sure you want to remove this host?"
	},
	"removeHostIP": {
		"ENG": "Remove Host IP",
		"FRA": "Remove Host IP"
	},
	"getContainerLogs": {
		"ENG": "Get Container Logs",
		"FRA": "Get Container Logs"
	},
	"getContainerAnalytics": {
		"ENG": "Get Container Analytics",
		"FRA": "Get Container Logs"
	},
	"getContainerMetrics": {
		"ENG": "Get Container Metrics",
		"FRA": "Get Container Metrics"
	},
	"getServiceAnalytics": {
		"ENG": "Get Service Analytics",
		"FRA": "Get Service Analytics"
	},
	"getServiceMetrics": {
		"ENG": "Get Service Metrics",
		"FRA": "Get Service Metrics"
	},
	"actions": {
		"ENG": "Actions",
		"FRA": "Actions"
	},
	"group": {
		"ENG": "Group",
		"FRA": "Groupe"
	},
	"version": {
		"ENG": "Version",
		"FRA": "Version"
	},
	"loadProvisionOperation": {
		"ENG": "Load Provisioning Operation",
		"FRA": "Load Provisioning Operation"
	},
	"loadDaemonStatisticsOperation": {
		"ENG": "Load Daemon Statistics Operation",
		"FRA": "Load Daemon Statistics Operation"
	},
	"lastCheck": {
		"ENG": "Last Check",
		"FRA": "Last Check"
	},
	"downSince": {
		"ENG": "Down Since",
		"FRA": "Down Since"
	},
	"downCount": {
		"ENG": "Down Count",
		"FRA": "Down Count"
	},
	"healthy": {
		"ENG": "Healthy",
		"FRA": "Healthy"
	},
	"hostHasBeenRestartedSuccessfully": {
		"ENG": "Host has been restarted successfully",
		"FRA": "Host has been restarted successfully"
	},
	"restart": {
		"ENG": "Restart",
		"FRA": "Restart"
	},
	//list-platforms
	"selected": {
		"ENG": "Selected",
		"FRA": "Selected"
	},
	"areYouSureYouWantClearThisDriversConfiguration": {
		"ENG": "Are you sure you want to clear this driver's configuration?",
		"FRA": "Are you sure you want to clear this driver's configuration?"
	},
	"deleteDriver": {
		"ENG": "Delete Driver",
		"FRA": "Delete Driver"
	},
	"editDriver": {
		"ENG": "Edit Driver",
		"FRA": "Edit Driver"
	},
	"selectDriver": {
		"ENG": "Select Driver",
		"FRA": "Select Driver"
	},
	"removeCertificate": {
		"ENG": "Remove Certificate",
		"FRA": "Remove Certificate"
	},
	"manual": {
		"ENG": "Manual",
		"FRA": "Manual"
	},
	"container": {
		"ENG": "Container",
		"FRA": "Container"
	},
	"change": {
		"ENG": "Change",
		"FRA": "Change"
	},
	"uploadSSLCertificatesMsg": {
		"ENG": "Upload optional SSL certificates for Nginx in order to enable HTTPS",
		"FRA": "Upload optional SSL certificates for Nginx in order to enable HTTPS"
	},
	"chainedCertificate": {
		"ENG": "Chained Certificate",
		"FRA": "Chained Certificate"
	},
	"privateKey": {
		"ENG": "Private Key",
		"FRA": "Private Key"
	},

	//list-service-config
	"reloadRegistry": {
		"ENG": "Reload Registry",
		"FRA": "Reload Registry"
	},
	"theFollowingConfigurationModifiedEveryTimeReloadRegistryMaintenanceOperation": {
		"ENG": "The following configuration is modified every time a reloadRegistry maintenance operation is executed on a service.",
		"FRA": "The following configuration is modified every time a reloadRegistry maintenance operation is executed on a service."
	},
	"restartHost": {
		"ENG": "Restart Host",
		"FRA": "Restart Host"
	},
	"theFollowingConfigurationModifiedEveryTimeReloadRegistryMaintenanceOperationRequiresServiceRestartContent": {
		"ENG": "The following configuration is not affected by reloadRegistry maintenance operation and requires a service restart so that its content is modified.",
		"FRA": "The following configuration is not affected by reloadRegistry maintenance operation and requires a service restart so that its content is modified."
	},
	"logger": {
		"ENG": "Logger",
		"FRA": "Logger"
	},
	"session": {
		"ENG": "Session",
		"FRA": "Session"
	},
	"selectedFile": {
		"ENG": "Selected Files:",
		"FRA": "Selected Files:"
	},
	"multipleSelectionFilesPermitted": {
		"ENG": "Multiple selection of files is permitted",
		"FRA": "Multiple selection of files is permitted"
	},
	"availableCertificates": {
		"ENG": "Available certificates:",
		"FRA": "Available certificates:"
	},
	//add new host form
	"serviceName": {
		"ENG": "Service Name",
		"FRA": "Service Name"
	},
	"serviceVersion": {
		"ENG": "Service Version",
		"FRA": "Service Version"
	},
	"daemonGroupConfig": {
		"ENG": "Daemon Group Configuration",
		"FRA": "Daemon Group Configuration"
	},
	"branch": {
		"ENG": "Branch",
		"FRA": "Branch"
	},
	"serviceHasRunningInstancesDifferentCommits": {
		"ENG": "This service has one or more running instances with different commits",
		"FRA": "This service has one or more running instances with different commits"
	},
	"recommendedToMaintainHomogeneity": {
		"ENG": "It is recommended that you maintain homogeneity and deploy using an existing commit",
		"FRA": "It is recommended that you maintain homogeneity and deploy using an existing commit"
	},
	"commit": {
		"ENG": "Commit",
		"FRA": "Commit"
	},
	"hostnames": {
		"ENG": "Hostname(s)",
		"FRA": "Hostname(s)"
	},
	"understandTheRiskToDeploy": {
		"ENG": "I understand the risk and would like to use a new commit to deploy",
		"FRA": "I understand the risk and would like to use a new commit to deploy"
	},
	"hostsNumber": {
		"ENG": "Host(s) Number",
		"FRA": "Host(s) Number"
	},
	"envVariables": {
		"ENG": "Additional Environment Variables",
		"FRA": "Additional Environment Variables"
	},
	"defaultEnvVariables": {
		"ENG": "Default Environment Variables",
		"FRA": "Default Environment Variables"
	},
	"warning": {
		"ENG": "Warning",
		"FRA": "Warning"
	},
	//upload certificates modal
	"noAdditionalCertificatesRequired": {
		"ENG": "No additional certificates are required",
		"FRA": "No additional certificates are required"
	},
	"availableFilesOfType": {
		"ENG": "Available files of type",
		"FRA": "Available files of type"
	},
	"loadDaemonGroupConfig":{
		"ENG": "Load Daemon Group Config",
		"FRA": "Load Daemon Group Config"
	}
};

for (var attrname in envTranslation) {
	translation[attrname] = envTranslation[attrname];
}

var environmentsNav = [
	{
		'id': 'environments',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/environment/list',
			'method': 'get'
		},
		'label': translation.registries[LANG],
		'url': '#/environments',
		'tplPath': 'modules/dashboard/environments/directives/list.tmpl',
		'icon': 'earth',
		'pillar':{
			'name': 'deployment',
			'label': translation.deploy[LANG],
			'position': 3
		},
		'order': 1,
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/dashboard/environments/config.js','modules/dashboard/environments/services/template.js', 'modules/dashboard/environments/controller.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'repositories',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/gitAccounts/accounts/list',
			'method': 'get'
		},
		'label': translation.repositories[LANG],
		'url': '#/deploy-repositories',
		'tplPath': 'modules/dashboard/environments/directives/list-repos.tmpl',
		'icon': 'git',
		'excludedEnvs': ['dashboard'],
		'pillar':{
			'name': 'deployment',
			'label': translation.deploy[LANG],
			'position': 3
		},
		'order': 2,
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/dashboard/environments/config.js','modules/dashboard/environments/repos-ctrl.js', 'modules/dashboard/environments/services/repos.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'environments-platforms',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/environment/platforms/list',
			'method': 'get'
		},
		'label': translation.platformsAndCertificates[LANG],
		'url': '#/environments-platforms',
		'tplPath': 'modules/dashboard/environments/directives/list-platforms.tmpl',
		'icon': 'drawer',
		'pillar': {
			'name': 'deployment',
			'label': translation.deploy[LANG],
			'position': 3
		},
		'order': 4,
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/dashboard/environments/config.js', 'modules/dashboard/environments/platforms-ctrl.js', 'modules/dashboard/environments/services/platforms.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'environments-dbs',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/environment/dbs/list',
			'method': 'get'
		},
		'label': translation.databases[LANG],
		'url': '#/environments-dbs',
		'tplPath': 'modules/dashboard/environments/directives/list-databases.tmpl',
		'icon': 'database',
		'pillar':{
			'name': 'deployment',
			'label': translation.deploy[LANG],
			'position': 3
		},
		'order': 6,
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/dashboard/environments/config.js', 'modules/dashboard/environments/dbs-ctrl.js', 'modules/dashboard/environments/services/database.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'environments-hosts',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/hosts/list',
			'method': 'get'
		},
		'label': translation.hosts[LANG],
		'url': '#/environments-hosts',
		'tplPath': 'modules/dashboard/environments/directives/list-hosts.tmpl',
		'icon': 'sphere',
		'pillar':{
			'name': 'deployment',
			'label': translation.deploy[LANG],
			'position': 3
		},
		'order': 7,
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/dashboard/environments/config.js', 'modules/dashboard/environments/hosts-ctrl.js', 'modules/dashboard/environments/services/hosts.js', 'modules/dashboard/environments/services/deploy.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'oneEnvironment',
		'label': translation.environments[LANG],
		'url': '#/environments/environment/:id?',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/environment/update',
			'method': 'put'
		},
		'tplPath': 'modules/dashboard/environments/directives/edit.tmpl',
		'tracker': true,
		'pillar':{
			'name': 'deployment',
			'label': translation.deploy[LANG],
			'position': 3
		},
		'scripts': ['modules/dashboard/environments/config.js', 'modules/dashboard/environments/controller.js', 'modules/dashboard/environments/services/database.js', 'modules/dashboard/environments/services/hosts.js', 'modules/dashboard/environments/services/deploy.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'environments-hacloud',
		'label': translation.hacloud[LANG],
		'url': '#/environments-hacloud',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/cloud/nodes/list',
			'method': 'get'
		},
		'icon': 'sphere',
		'tplPath': 'modules/dashboard/environments/directives/list-cloud.tmpl',
		'pillar':{
			'name': 'deployment',
			'label': translation.deploy[LANG],
			'position': 3
		},
		'order': 7,
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/dashboard/environments/config.js', 'modules/dashboard/environments/hacloud-ctrl.js', 'modules/dashboard/environments/services/nodes.js', 'modules/dashboard/environments/services/hacloud.js', 'modules/dashboard/environments/services/deploy.js'],
		'ancestor': [translation.home[LANG]]
	}
];

navigation = navigation.concat(environmentsNav);
