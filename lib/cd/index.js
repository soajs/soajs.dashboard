'use strict';
var fs = require('fs');
var async = require('async');
var request = require("request");
var deployer = require("soajs").drivers;
var compareVersions = require('compare-versions');

var utils = require('../../utils/utils.js');

var colName = 'cicd';
var envColName = 'environment';

function checkIfError(req, mainCb, data, cb) {
    if (data.error) {
        if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
            req.soajs.log.error(data.error);
        }

        return mainCb({"code": data.code, "msg": data.config.errors[data.code]});
    } else {
        if (cb) return cb();
    }
}


var BL = {

    model: null,

    /**
     * Function that gets CD config
     * @param  {Object}             config
     * @param  {Request Object}     req
     * @param  {Function}           cb
     *
     */
    getConfig: function (config, req, cb) {
        var opts = { collection: colName, conditions: {"type": "cd"} };
        BL.model.findEntry(req.soajs, opts, function (error, record) {
            checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                return cb(null, record || {});
            });
        });
    },

    /**
     * Function that saves CD config
     * @param  {Object}             config
     * @param  {Request Object}     req
     * @param  {Function}           cb
     *
     */
    saveConfig: function (config, req, cb) {
        req.soajs.inputmaskData.config.type = "cd";
        var opts = {
            collection: colName,
            conditions: {
                "type": "cd"
            },
            fields: req.soajs.inputmaskData.config,
            options: { upsert: true }
        };
        BL.model.updateEntry(req.soajs, opts, function (error) {
            checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                return cb(null, true);
            });
        });
    },

    /**
     * Function that triggers CD deploy operation
     * @param  {Object}             config
     * @param  {Request Object}     req
     * @param  {Function}           cb
     *
     */
    cdDeploy: function (config, req, cb) {

        //verify that the deploy_token is valid
        verifyDeployToken(function () {
            //get CD recipe
            BL.getConfig(config, req, function (error, record) {
                checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                    // get all environments
                    getEnvs(function (error, envs) {
                        //NOTE: the only error returned by this function is from the drivers, which are handled by utils.checkErrorReturn
                        utils.checkErrorReturn(req, cb, {config: config, error: error}, function () {
                            // check if cd should be triggered based on available input
                            checkConfig(record, envs, function (error, servicesList) {
                                // no error to be handled here
                                // redeploy services
                                processCD(servicesList, function (error) {
                                    checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                                        return cb(null, true);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        function verifyDeployToken(fcb) {
            var opts = {
                collection: colName,
                conditions: {
                    "type": "ci"
                }
            };
            BL.model.findEntries(req.soajs, opts, function (error, records) {
                checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                    checkIfError(req, cb, {config: config, error: !records || records.length === 0, code: 955}, function () {
                        var ciConfig = records[0];
                        checkIfError(req, cb, {
                            config: config,
                            error: ciConfig.settings.gitToken !== req.soajs.inputmaskData.deploy_token,
                            code: 956
                        }, fcb);
                    });
                });
            });
        }

        function getEnvs(fcb) {
            var opts = {
                collection: envColName,
                conditions: {}
            };
            BL.model.findEntries(req.soajs, opts, function (error, envs) {
                checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                    // get all services deployed in each environment
                    async.map(envs, function (oneEnv, callback) {
                        var options = utils.buildDeployerOptions(oneEnv, req.soajs, BL);
                        options.params = { env: oneEnv.code.toLowerCase() };
                        deployer.listServices(options, function (error, services) {
                            if (error) return callback(error);

                            //map repo name and branch of each service and return an updated array with the values
                            async.map(services, function (oneService, callback) {
	                            if(oneService.labels && oneService.labels['service.repo']){
		                            oneService.repo = oneService.labels['service.repo'];
	                            }
	                            
	                            if(oneService.labels && oneService.labels['service.branch']) {
		                            oneService.branch = oneService.labels['service.branch'];
	                            }
                                return callback(null, oneService);
                            }, function (error, mappedServices) {
                                //filter services, only return those who match the repo and branch provided by the api request
                                async.filter(mappedServices, function (oneService, callback) {
                                    return callback(null, ((oneService.repo === req.soajs.inputmaskData.repo) && (oneService.branch === req.soajs.inputmaskData.branch)));
                                }, function (error, repoServices) {
                                    return callback(null, { record: oneEnv, services: repoServices });
                                });
                            });
                        });
                    }, fcb);
                });
            });
        }

        function checkConfig(record, envs, cb) {
            if (!record) return cb(); // no CD config found
            async.concat(envs, function (oneEnv, callback) {
                var cdEnvConfig = record[oneEnv.record.code.toUpperCase()];
                if (!cdEnvConfig) {
                    req.soajs.log.debug("No CD configuration found for environment", oneEnv.record.code);
                    return callback(null, []); // no CD config found for environment
                }
	
                if (!oneEnv.services || oneEnv.services.length === 0) {
                    req.soajs.log.debug("No services matching repo name or branch found in environment", oneEnv.record.code);
                    return callback(null, []); // no services matching repo/branch were found in this environment
                }
	            
                async.concat(oneEnv.services, function (oneService, callback) {
                    var serviceCD = {
                        id: oneService.id,
                        mode: ((oneService.labels && oneService.labels['soajs.service.mode'] ? oneService.labels['soajs.service.mode'] : 'deployment')), //NOTE: only required for kubernetes driver
                        repo: oneService.repo,
                        envRecord: oneEnv.record,
                        service: oneService
                    };

                    var serviceName = '';
                    if (oneService.labels && oneService.labels['soajs.service.name']) {
                        serviceName = oneService.labels['soajs.service.name'];
                    }
                    else {
                        req.soajs.log.error('Unable to find the name of service(s) included in ' + oneService.repo + ' repository. Make sure [soajs.service.name] label is set.');
                        req.soajs.log.error('CD configuration per service cannot be applied (if any), label [soajs.service.name] is missing');
                    }

                    // check if service has custom set CD configuration that overrides the global
                    if (cdEnvConfig[serviceName]) {
                        req.soajs.log.debug("found specific entry in CD configuration for service", serviceName, 'in environment', oneEnv.record.code);

                        if(req.soajs.inputmaskData.services && Array.isArray(req.soajs.inputmaskData.services) && req.soajs.inputmaskData.services.length > 0){
                            req.soajs.log.debug("received service potential versioning for", serviceName, "from API inputs, detecting version ...");
                            //loop in array and find the service version
                            var version;
                            for(let i=0; i< req.soajs.inputmaskData.services.length; i++){
                                if(req.soajs.inputmaskData.services[i].serviceName === serviceName && req.soajs.inputmaskData.services[i].serviceVersion === parseInt(oneService.labels['soajs.service.version'])){
                                    version = req.soajs.inputmaskData.services[i].serviceVersion;
                                    break;
                                }
                            }
                            if(version){
                                req.soajs.log.debug("found specific version ", version, "for service", serviceName, "in API inputs, checking CD configuration....");

                                if(cdEnvConfig[serviceName]['v'+ version]){
                                    req.soajs.log.debug("found specific version ", version, "for service", serviceName, "in CD configuration of environment", oneEnv.record.code);
                                    version = 'v' + version;
                                    //make sure that the service custom config points to the same branch
                                    if (cdEnvConfig[serviceName][version].branch && cdEnvConfig[serviceName][version].branch === req.soajs.inputmaskData.branch) {
                                        serviceCD.branch = cdEnvConfig[serviceName][version].branch;
                                        if (cdEnvConfig[serviceName].strategy) serviceCD.strategy = cdEnvConfig[serviceName][version].strategy;
                                    }
                                }
                                else{
                                    req.soajs.log.debug("did not find any version ", version, "for service", serviceName, "in CD configuration, using default of environment", oneEnv.record.code);
                                    //make sure that the service custom config points to the same branch
                                    if (cdEnvConfig[serviceName].branch && cdEnvConfig[serviceName].branch === req.soajs.inputmaskData.branch) {
                                        serviceCD.branch = cdEnvConfig[serviceName].branch;
                                        if (cdEnvConfig[serviceName].strategy) serviceCD.strategy = cdEnvConfig[serviceName].strategy;
                                    }
                                }
                            }
                        }
                        else{
                            req.soajs.log.debug("no specific version for service", serviceName, "found in API inputs, using default");
                            //make sure that the service custom config points to the same branch
                            if (cdEnvConfig[serviceName].branch && (cdEnvConfig[serviceName].branch === req.soajs.inputmaskData.branch)) {
                                serviceCD.branch = cdEnvConfig[serviceName].branch;
                                if (cdEnvConfig[serviceName].strategy) serviceCD.strategy = cdEnvConfig[serviceName].strategy;
                            }
                        }
                    }
                    else {
                        req.soajs.log.debug("no specific entry for service ", serviceName, "found in CD configuration, using default CD strategy of environment", oneEnv.record.code);
                        // check if service matches the global CD configuration
                        if (cdEnvConfig.branch === req.soajs.inputmaskData.branch) {
                            serviceCD.branch = cdEnvConfig.branch;
                            if (cdEnvConfig.strategy) serviceCD.strategy = cdEnvConfig.strategy;
                        }
                    }

                    if (serviceCD.branch && serviceCD.strategy) {
                        //matching CD configuration was found for repo service(s), CD can be applied
                        return callback(null, [ serviceCD ]);
                    }
                    else {
                        //matching CD configuration was not found or applicable, CD will not be applied
                        return callback(null, []);
                    }
                }, callback);
            }, cb);
        }

        function processCD(servicesList, cb) {
            async.each(servicesList, function (oneService, callback) {
                if (oneService.strategy === 'update') {
                    var opts = {
                        "collection": "ledger",
                        "record": {
                            "serviceName": oneService.service.labels["soajs.service.name"],
                            "env": oneService.service.labels["soajs.env.code"],
                            "repo": oneService.repo,
                            "branch": oneService.branch,
                            "ts": new Date().getTime(),
                            "update": true
                        }
                    };
                    if(oneService.serviceVersion){
                        opts.record.serviceVersion = oneService.service.labels["soajs.service.version"];
                    }
                    BL.model.insertEntry(req.soajs, opts, (err,res) => {
                        var options = utils.buildDeployerOptions(oneService.envRecord, req.soajs, BL);
                        options.params = {
                            id: oneService.id,
                            mode: oneService.mode,
                            action: 'redeploy'
                        };
                        return deployer.redeployService(options, callback);
                    });
                }
                else if (oneService.strategy === 'notify') {
                    var opts = {
                        "collection": "ledger",
                        "record": {
                            "serviceId": oneService.id,
                            "mode": oneService.service.labels["soajs.service.mode"],
                            "serviceName": oneService.service.labels["soajs.service.name"],
                            "env": oneService.service.labels["soajs.env.code"],
                            "repo": oneService.repo,
                            "branch": oneService.branch,
                            "ts": new Date().getTime(),
                            "notify": true
                        }
                    };
                    if(oneService.serviceVersion){
                        opts.record.serviceVersion = oneService.service.labels["soajs.service.version"];
                    }
                    BL.model.insertEntry(req.soajs, opts, (err,res) => {
                        req.soajs.log.info('NOTIFY: Received CD trigger for ' + oneService.repo);
                        return callback();
                    });
                }
            }, cb);
        }
    },

    /**
     * Function that gets Update Notification Ledger
     * @param  {Object}             config
     * @param  {Request Object}     req
     * @param  {Function}           cb
     */
    getUpdates: function (config, req, cb) {

        function initBLModel (BLModule, modelName, cb) {
            BLModule.init(modelName, cb);
        }

        /**
         * get all catalogs
         * @param cb
         */
        function getCatalogs(cb) {
            let opts = {
                collection: "catalogs",
                conditions: {}
            };
            BL.model.findEntries(req.soajs, opts, cb);
        }

        /**
         * get all deployed services in this environment
         * @param cb
         */
        function getServices(cb) {
            var servicesBL = require("../cloud/services.js");
            initBLModel(servicesBL, 'mongo', function(error, BL){
                if(error){
                    return cb(error);
                }
                req.soajs.inputmaskData.env = req.soajs.inputmaskData.env.toLowerCase();
                BL.listServices(config, req.soajs, cb);
            });
        }

        /**
         * get the latest soajs images
         * @param cb
         */
        function getLatestSOAJSImageInfo(cb){
            let myUrl = config.docker.url;
            myUrl = myUrl.replace("%organization%", "soajsorg").replace("%imagename%", "soajs");
            let opts = {
                method: 'GET',
                url: myUrl,
                headers: { 'cache-control': 'no-cache' },
                json: true
            };
            request.get(opts, function(error, response, body){
                return cb(error, (body && body.results) ? body.results : []);
            });
        }

        var updateList= [];
        async.parallel({'catalogs': getCatalogs, 'services': getServices, "soajsImages": getLatestSOAJSImageInfo}, function(error, response){
            checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                /**
                 * compare entries
                 */
                async.each(response.services, function(oneService, cb){
                    doesServiceHaveUpdates(oneService, response.catalogs, response.soajsImages, cb);
                }, function(){
                    return cb(null, updateList);
                });
            });
        });

        /**
         * Checks if there is a catalog, code and/or image update for this service
         * @param oneService
         * @param catalogs
         * @param repos
         * @param soajsImages
         * @param cb
         * @returns {*}
         */
        function doesServiceHaveUpdates(oneService, catalogs, soajsImages, cb){
            //check if service has labels
            if(!oneService.labels){
                return cb(null, true);
            }

            if(!oneService.tasks || oneService.tasks.length === 0){
                return cb(null, true);
            }

            var proceed = false;
            var biggestTaskTs = 0;
            oneService.tasks.forEach(function(oneTask){
                if(oneTask.status && (process.env.SOAJS_DEPLOY_TEST || oneTask.status.state === 'running')){
                    proceed = true;
                    var taskTs = new Date(oneTask.status.ts).getTime();
                    if(taskTs > biggestTaskTs){
                        biggestTaskTs = taskTs;
                    }
                }
            });

            if(!proceed){
                return cb(null, true);
            }

            //if no catalog id is found in labels, no need to notify
            //if no env code is found in labels, no need to notify
            //if env code found but not matching input, no need to notify
            if(!oneService.labels['soajs.catalog.id'] || !oneService.labels['soajs.env.code'] || oneService.labels['soajs.env.code'] !== req.soajs.inputmaskData.env.toLowerCase()){
                return cb(null, true);
            }

            let myCatalog;
            for(let i =0; i < catalogs.length; i++){
                if(catalogs[i]._id.toString() === oneService.labels['soajs.catalog.id']){
                    myCatalog = catalogs[i];
                    break;
                }
            }
	        
            //no catalog recipe found, no need to notify
            if(!myCatalog || !myCatalog.v){
                return cb(null, true);
            }

            let updateObj = {
                'id': oneService.id,
                'name': oneService.name,
                'labels': oneService.labels,
                'mode': '',
                'service': {
                    'env': oneService.env
                },
                'catalog': {
                    'name': myCatalog.name,
                    'type': myCatalog.type,
                    'subtype': myCatalog.subtype,
                    'v': myCatalog.v
                }
            };

            //if catalog.v and no service catalog v, then update
            //if catalog.v is greater than service catalog v, then update
            if(myCatalog.v && (!oneService.labels['soajs.catalog.v'] || parseInt(myCatalog.v) > parseInt(oneService.labels['soajs.catalog.v']) )){
                updateObj.catalog.ts = myCatalog.ts;
                updateObj.catalog.envs = myCatalog.recipe.buildOptions.env;
                updateObj.catalog.image = myCatalog.recipe.deployOptions.image;
                updateObj.catalog.git = myCatalog.recipe.deployOptions.specifyGitConfiguration;
                updateObj.mode = 'rebuild';
                updateObj.image = updateObj.catalog.image;
                updateList.push(updateObj);
            }

            //check if there are image updates
            let opts = {
                imageInfo: myCatalog.recipe.deployOptions.image,
                results: soajsImages,
                oneService: oneService,
                updateObj: updateObj,
                biggestTaskTs: biggestTaskTs
            };
            checkImageforUpdates(opts, cb);
        }

        /**
         * checks if there is an updated image
         * @param opts
         * @param cb
         */
        function checkImageforUpdates(opts, cb){
            if(opts.imageInfo.name ==='soajs' && opts.imageInfo.prefix === 'soajsorg'){
                step2(opts.results);
            }
            else{
                let myUrl = config.docker.url;
	            var prefix = "library";
	            if(opts.imageInfo.prefix && opts.imageInfo.prefix !== ''){
		            prefix = opts.imageInfo.prefix;
	            }
                
                myUrl = myUrl.replace("%organization%", prefix).replace("%imagename%", opts.imageInfo.name);
                let options = {
                    method: 'GET',
                    url: myUrl,
                    headers: { 'cache-control': 'no-cache' },
                    json: true
                };
                request.get(options, function(error, response, body){
                    if(error){ return cb(error); }
                    if(body && body.results && Array.isArray(body.results) && body.results.length > 0){
                        step2(body.results);
                    }
                    else{
                    	step2([]);
                    }
                });
            }

            function step2(results){
            	if(results.length === 0){
            		return cb(null, true);
	            }
	            
                let tag = opts.imageInfo.tag;
                var latest;
                let newVersion;
                let imageLastUpdated;

                var newObj = JSON.parse(JSON.stringify(opts.updateObj));
                newObj.image = opts.imageInfo;
                results.forEach(function(oneImage){
                    if(oneImage.name === tag ){
                        latest = oneImage;
                        imageLastUpdated = new Date(oneImage.last_updated).getTime();
                        if(!opts.oneService.labels['service.image.ts']){
                            newObj.image.noimage = true;
                            newVersion = true;
                        }
                        else if(imageLastUpdated > new Date(opts.oneService.labels['service.image.ts']).getTime()){
                            newObj.image.update = true;
                            newVersion = true;
                        }
                    }
	
	                if (oneImage.name === 'latest' && !newVersion){
		                latest = oneImage;
		                //if the image name is not latest and there is a newer version
		                if(latest.name !== tag) {
			                imageLastUpdated = new Date(latest.last_updated).getTime();
			                newVersion = (new Date(latest.last_updated).getTime() > new Date(opts.oneService.labels['service.image.ts']).getTime());
			                if(newVersion){
				                newObj.image.upgrade = true;
			                }
		                }
	                }

                    if(oneImage.name !== tag && !newVersion){
                        var output = deepVersionComparison(oneImage, tag, opts, newObj);
                        newVersion = output[0];
                        imageLastUpdated = output[1];
                    }
                });

                if(!newVersion){
                    return cb(null, true);
                }

                newObj.image.ts= imageLastUpdated;
                newObj.mode = 'image';
                updateList.push(newObj);

                return cb(null, true);
            }

            function deepVersionComparison(oneImage, tag, opts, newObj){
                //check if both the tag and the oneImage.name
                if(!isNaN(parseInt(oneImage.name)) && !isNaN(parseInt(tag))){
                    //the tags might be something like 10.0.x or 9.5.2
                    if(opts.imageInfo.prefix === 'soajsorg' && oneImage.name.indexOf("-") !== -1){
                        //comparing new soajs tag 1.1.x-1.1.x with something like 1.0.x-1.0.x
                        var info1 = oneImage.name.split("-");
                        var info2 = tag.split("-");

                        //check if deployer got updated
                        if(compareVersions(info1[0], info2[0]) == 1){
                            newObj.image.deployer = true;
                            return [true, new Date(oneImage.last_updated).getTime()];
                        }
                        //check if soajs got updated
                        else if(compareVersions(info1[1], info2[1]) == 1){
                            newObj.image.upgrade = true;
                            return [true, new Date(oneImage.last_updated).getTime()];
                        }
                        else
                            return [false, null];
                    }
                    else{
                        //compare image tags
                        if(compareVersions(oneImage.name, tag) === 1){
                            newObj.image.update = true;
                            // newVersion = true;
                            // imageLastUpdated = new Date(oneImage.last_updated).getTime();
                            return [true, new Date(oneImage.last_updated).getTime()];
                        }
                        else
                            return [false, null];
                    }
                }
                else if(!isNaN(parseInt(oneImage.name)) && tag !=='latest' && isNaN(tag)){
                    //comparing new soajs tag 1.0.x-1.0.x with old ones
                    newObj.image.upgrade = true;
                    // newVersion = true;
                    // imageLastUpdated = new Date(oneImage.last_updated).getTime();
                    return [true, new Date(oneImage.last_updated).getTime()];
                }
                else
                    return [false,null];
            }
        }
    },

    /**
     * Lists the ledgers of a specific environment
     * @param config
     * @param req
     * @param cb
     */
    getLedger: function (config, req, cb){
        let opts = {
            "collection": "ledger",
            "conditions": {"env": req.soajs.inputmaskData.env.toLowerCase()},
            "options": {
                "sort": {"ts":-1},
                "skip": req.soajs.inputmaskData.start,
                "limit": 200
            }
        };
        BL.model.findEntries(req.soajs, opts, cb);
    },

    /**
     * Marks the ledger record(s) as read
     * @param config
     * @param req
     * @param cb
     */
    markRead (config, req, cb) {
        let opts = {
            "collection": "ledger",
            "fields" : {
                "$set": {
                    "read": true
                }
            }
        };
        //if an ID is given
        if(req.soajs.inputmaskData.data.id) {
            req.soajs.inputmaskData.id = req.soajs.inputmaskData.data.id;
            BL.model.validateId(req.soajs, (err) => {
                if(err)
                    return cb(err);

                opts.conditions = {"_id": req.soajs.inputmaskData.id};
                opts.options = {"upsert": true};

                BL.model.updateEntry(req.soajs, opts, (error, res) => {
                    if (error)
                        return cb(error);
                    else {
                        return cb(null, res);
                    }
                });
            });
        }
        else if(req.soajs.inputmaskData.data.all) {
            opts.conditions = {};
            opts.options = {"upsert": false, "safe": true, "multi": true};
            BL.model.updateEntry(req.soajs, opts, (error, res) => {
                if (error)
                    return cb(error);
                else {
                    return cb(null, res);
                }
            });
        }
    },

    /**
     * function that takes action based on ledger notification
     * @param config
     * @param req
     * @param cb
     */
    cdAction: function(config, registry, req, cb){
        function initBLModel (BLModule, modelName, cb) {
            BLModule.init(modelName, cb);
        }
        function callDeployer(opName, cb) {
            var servicesBL = require("../cloud/deploy.js");
            initBLModel(servicesBL, 'mongo', function(error, BL){
                if(error){
                    return cb(error);
                }
                BL[opName](config, req.soajs, registry, null, cb);
            });
        }

        /**
         * update the ledger entry and trigger service redeploy operation
         */
        if(req.soajs.inputmaskData.data.id){
            req.soajs.inputmaskData.id = req.soajs.inputmaskData.data.id;
            BL.model.validateId(req.soajs, (err) => {
                if(err)
                    return cb(err);

                let opts = {
                    "collection": "ledger",
                    "conditions": {"_id": req.soajs.inputmaskData.id}
                };
                BL.model.findEntry(req.soajs, opts, (error, record) =>{
                    if(error)
                        return cb(error);


                    opts = {
                        "collection": "ledger",
                        "conditions": {"serviceId": record.serviceId, "env": record.env, "repo": record.repo, "branch": record.branch},
                        "fields" : {
                            "$set": {
                                "manual": true,
                                "oldTs": record.ts,
                                "ts": new Date().getTime()
                            }
                        },
                        "options": {"upsert":true, "multi": true}
                    };
                    BL.model.updateEntry(req.soajs, opts, (error) => {
                        if(error)
                            return cb(error);

                        delete record.oldTs;
                        delete record._id;
                        opts = {
                            "collection": "ledger",
                            "record":record
                        };
                        BL.model.insertEntry(req.soajs, opts, (error) =>{
                            if(error)
                                return cb(error);

                            req.soajs.inputmaskData.action = "redeploy";
                            req.soajs.inputmaskData.env = record.env;
                            req.soajs.inputmaskData.mode = record.mode;
                            req.soajs.inputmaskData.serviceId = record.serviceId;
                            callDeployer('redeployService', cb);
                        });
                    });
                });
            });
        }
        else{
            //add new catalog entry and rebuild the service
            let opts = {
                "collection": "ledger",
                "record": {
                    "serviceId": req.soajs.inputmaskData.data.serviceId,
                    "serviceName": req.soajs.inputmaskData.data.serviceName,
                    "mode": req.soajs.inputmaskData.data.mode,
                    "env": req.soajs.inputmaskData.data.env.toLowerCase(),
                    "ts": new Date().getTime(),
                    "rebuild": true
                }
            };
            if(req.soajs.inputmaskData.data.serviceVersion){
                opts.record["serviceVersion"] = req.soajs.inputmaskData.data.serviceVersion;
            }
            BL.model.insertEntry(req.soajs, opts, (error) =>{
                if(error)
                    return cb(error);

                req.soajs.inputmaskData.action = "rebuild";
                req.soajs.inputmaskData.env = req.soajs.inputmaskData.data.env.toLowerCase();
                req.soajs.inputmaskData.mode = req.soajs.inputmaskData.data.mode;
                req.soajs.inputmaskData.serviceId = req.soajs.inputmaskData.data.serviceId;
                callDeployer('redeployService', cb);
            });
        }
    }

};

module.exports = {
    "init": function (modelName, cb) {
        var modelPath;

        if (!modelName) {
            return cb(new Error("No Model Requested!"));
        }
        modelPath = __dirname + "/../../models/" + modelName + ".js";
        return requireModel(modelPath, cb);
        /**
         * checks if model file exists, requires it and returns it.
         * @param filePath
         * @param cb
         */
        function requireModel(filePath, cb) {
            //check if file exist. if not return error
            fs.exists(filePath, function (exists) {
                if (!exists) {
                    return cb(new Error("Requested Model Not Found!"));
                }

                BL.model = require(filePath);
                return cb(null, BL);
            });
        }
    }
};
