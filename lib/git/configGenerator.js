"use strict";

var os = require("os");
var fs = require("fs");
var yamljs = require("yamljs");

var core = require('soajs').core;
var validator = new core.validator.Validator();
var validatorSchema = require("../../schemas/serviceSchema.js");

var lib = {
    "extractValidation": function (commonFields, oneInput, tempInput, inputObj, common) {
        //if param schema is in common field ( used for objects only ) 
        if (oneInput.schema && oneInput.schema['$ref']) {
            inputObj.validation = lib.getIMFVfromCommonFields(commonFields, oneInput.schema['$ref']);
            if(common){
                commonFields[common].validation = inputObj.validation;
            }
        }
        //if param is a combination of array and common field
        else if (oneInput.schema && oneInput.schema.type === 'array' && oneInput.schema.items['$ref']) {
            inputObj.validation = {
                "type": "array",
                "items": lib.getIMFVfromCommonFields(commonFields, oneInput.schema.items['$ref'])
            };
            if(common){
                commonFields[common].validation = inputObj.validation;
            }
        }
        else if (oneInput.schema && oneInput.schema.properties && oneInput.schema.properties.items && oneInput.schema.properties.items.type === 'array' && oneInput.schema.properties.items.items['$ref']) {
            inputObj.validation = {
                "type": "array",
                "items": lib.getIMFVfromCommonFields(commonFields, oneInput.schema.properties.items.items['$ref'])
            };
            if(common){
                commonFields[common].validation = inputObj.validation;
            }
        }
        //if param is not a common field
        else {
            inputObj.validation = tempInput;
            if(common){
                commonFields[common].validation = inputObj.validation;
            }
        }
    },

    "getIMFVfromCommonFields": function (commonFields, source) {
        var commonFieldInputName = source.split("/");
        commonFieldInputName = commonFieldInputName[commonFieldInputName.length - 1];
        return commonFields[commonFieldInputName].validation;
    },

	"populateCommonFields": function (commonFields) {
        //loop in all common fields
        for (var oneCommonField in commonFields) {
            recursiveMapping(commonFields[oneCommonField].validation);
        }

        //loop through one common field recursively constructing and populating all its children imfv
        function recursiveMapping(source) {
            if (source.type === 'array') {
                if (source.items['$ref'] || source.items.type === 'object') {
                    source.items = mapSimpleField(source.items);
                }
                else if (source.items.type === 'object') {
                    recursiveMapping(source.items);
                }
                else mapSimpleField(source);
            }
            else if (source.type === 'object') {
                for (var property in source.properties) {
                    if (source.properties[property]['$ref']) {
                        source.properties[property] = mapSimpleField(source.properties[property]);
                    }
                    else if (source.properties[property].type === 'object' || source.properties[property].type === 'array') {
                        recursiveMapping(source.properties[property]);
                    }
                }
            }
            else if (source.schema) {
                if (source.schema.type === 'object') {
                    for (var property in source.schema.properties) {
                        if (source.schema.properties[property]['$ref']) {
                            source.schema.properties[property] = mapSimpleField(source.schema.properties[property]);
                        }
                    }
                }
            }
            else {
                //map simple inputs if any
                source = mapSimpleField(source);
            }
        }

        //if this input is a ref, get the ref and replace it.
        function mapSimpleField(oneField) {
            if (oneField['$ref']) {
                return lib.getIMFVfromCommonFields(commonFields, oneField['$ref']);
            }
            else {
                return oneField;
            }
        }
    },

	"injectCommonFields": function (commonFields, globalParams, all_apis) {
        var generatedObject = {};
        for (var i in globalParams) {
            if (commonFields[i]) {
                generatedObject[i] = commonFields[i];
            }
        }
        if (generatedObject && Object.keys(generatedObject).length > 0) {
            all_apis.commonFields = generatedObject;
        }
    }
};

var utils = {

    /**
     * parse the yaml and generate a config.js content from it
     * @param cb
     * @returns {*}
     */
    "parseYaml": function (yamlContent, context, callback) {
        var jsonAPISchema;

        try {
            jsonAPISchema = yamljs.parse(yamlContent);
        } catch (e) {
	        try {
		        jsonAPISchema = JSON.parse(yamlContent);
	        } catch (l) {
		        return callback({"code": 984, "msg": e.message});
	        }
        }
	
	    try {
            utils.validateYaml(jsonAPISchema);
        }
        catch (e) {
            return callback({"code": 985, "msg": e.message});
        }

        context.yaml = jsonAPISchema;

        utils.mapAPis(jsonAPISchema, function (response) {
            context.soajs.config.schema = response.schema;
            context.soajs.config.errors = response.errors;

            var check = validator.validate(context.soajs.config, validatorSchema);
            if (check.valid) {
                return callback(null, true);
            }
            else {
                var errMsgs = [];
                check.errors.forEach(function (oneError) {
                    errMsgs.push(oneError.stack);
                });
                return callback({"code": 986, "msg": new Error(errMsgs.join(" - ")).message});
            }
        });
    },

    /**
     * validate that parsed yaml content has the minimum required fields
     * @param yamlJson
     */
    "validateYaml": function (yamlJson) {
        if (typeof yamlJson !== 'object') {
            throw new Error("Yaml file was converted to a string");
        }

        if (!yamlJson.paths || Object.keys(yamlJson.paths).length === 0) {
            throw new Error("Yaml file is missing api schema");
        }

        //loop in path
        for (var onePath in yamlJson.paths) {
            //loop in methods
            for (var oneMethod in yamlJson.paths[onePath]) {
                if (!yamlJson.paths[onePath][oneMethod].summary || yamlJson.paths[onePath][oneMethod].summary === "") {
                	if (yamlJson.paths[onePath][oneMethod].description && yamlJson.paths[onePath][oneMethod].summary !== ""){
		                yamlJson.paths[onePath][oneMethod].summary = yamlJson.paths[onePath][oneMethod].description;
	                }
                	else {
		                throw new Error("Please enter a summary for API " + oneMethod + ": " + onePath + " you want to build.");
	                }
                }
            }
        }
    },

    /**
     * clone a javascript object with type casting
     * @param obj
     * @returns {*}
     */
    "cloneObj": function (obj) {
        if (typeof obj !== "object" || obj === null) {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        if (obj instanceof RegExp) {
            return new RegExp(obj);
        }

        if (obj instanceof Array && Object.keys(obj).every(function (k) {
                return !isNaN(k);
            })) {
            return obj.slice(0);
        }
        var _obj = {};
        for (var attr in obj) {
            if (Object.hasOwnProperty.call(obj, attr)) {
                _obj[attr] = utils.cloneObj(obj[attr]);
            }
        }
        return _obj;
    },

    /**
     * map apis to meet service configuraiton schema from a parsed swagger yaml json object
     * @param yamlJson
     * @param cb
     * @returns {*}
     */
    "mapAPis": function (yamlJson, cb) {
        var apiPath = yamlJson.paths;
        var definitions = yamlJson.definitions;
        var globalParams = yamlJson.parameters;
        var commonFields = {};

        //extract common fields
        if (definitions && (Object.keys(definitions).length > 0 || Object.keys(globalParams).length > 0)) {
            for (var onecommonInput in definitions) {
                commonFields[onecommonInput] = {
                    "validation": definitions[onecommonInput]
                };
            }
            for (var onecommonInput in globalParams) {
                var oneInput = globalParams[onecommonInput];
                var tempInput = utils.cloneObj(oneInput);
                var sourcePrefix = tempInput.in;
                var required = tempInput.required;
                var name = tempInput.name;
                if (sourcePrefix === 'path') {
                    sourcePrefix = "params";
                }
                if (sourcePrefix === 'header') {
                    sourcePrefix = "headers";
                }
                if (sourcePrefix === 'formData') {
                    sourcePrefix = "body";
                }
                var inputObj = {
                    "required": tempInput.required,
                    "source": [sourcePrefix + "." + tempInput.name],
                    "validation": {}
                };
                delete tempInput.required;
                delete tempInput.in;
                delete tempInput.name;
                delete tempInput.description;
                delete tempInput.collectionFormat; //todo: need to provide support for this later on
                var common = onecommonInput;
                commonFields[onecommonInput] = {
                    "required": required,
                    "source": [sourcePrefix + "." + name],
                    "validation": {}
                };
                lib.extractValidation(commonFields, oneInput, tempInput, inputObj, common);
            }
            lib.populateCommonFields(commonFields);
        }

        //extract the methods
        var all_methods = [];
        var all_errors = {};
        var globalResponses = yamlJson.responses;
        var responses = {};

        for (var oneResponse in globalResponses) {
            responses[oneResponse.toLowerCase()] = {
                "description": globalResponses[oneResponse].description
            };
        }
        for (var route in apiPath) {
            var methods = Object.keys(apiPath[route]);
            methods.forEach(function (oneMethod) {
                if (all_methods.indexOf(oneMethod.toLowerCase()) === -1) {
                    all_methods.push(oneMethod.toLowerCase())
                }

                //collect the error codes while at it
                if (apiPath[route][oneMethod].responses && Object.keys(apiPath[route][oneMethod].responses).length > 0) {
                    for (var errorCode in apiPath[route][oneMethod].responses) {
                        var code = parseInt(errorCode, 10);
                        if (!isNaN(code) && code !== 200 && apiPath[route][oneMethod].responses[errorCode].description) {
                            all_errors[code] = apiPath[route][oneMethod].responses[errorCode].description;
                        }
                        else {
                            if(!isNaN(code) && code !== 200) {
                                all_errors[code] = responses[apiPath[route][oneMethod].responses[errorCode]['$ref'].split("/")[2].toLowerCase()].description;
                            }
                        }
                    }
                }
            });
        }

        //map the methods
        var all_apis = {};
        all_methods.forEach(function (oneMethod) {
            all_apis[oneMethod] = {};
        });
        lib.injectCommonFields(commonFields, globalParams, all_apis);
        //loop in apis again and map the api routes
        for (var route in apiPath) {

            var methods = Object.keys(apiPath[route]);
            methods.forEach(function (oneMethod) {

                if (apiPath[route][oneMethod]) {
                    var soajsRoute = route.replace(/\{/g, ":").replace(/\}/g, "");

                    var mwFile = soajsRoute.replace(/\\/g, "_").replace(/:/g, "_").replace(/\//g, "_").replace(/[_]{2,}/g, "_");
                    mwFile = mwFile.toLowerCase();
                    if (mwFile[0] === "_") {
                        mwFile = mwFile.substring(1);
                    }
                    mwFile += "_" + oneMethod.toLowerCase() + ".js";

                    all_apis[oneMethod.toLowerCase()][soajsRoute] = {
                        "_apiInfo": {
                            "l": apiPath[route][oneMethod].summary || "__empty__",
                            "group": (apiPath[route][oneMethod].tags) ? apiPath[route][oneMethod].tags[0] : "__empty__"
                        },
                        "mw": '%dirname% + "/lib/mw/' + mwFile + '"',
                        "imfv":{
                            "custom":{},
                            "commonFields":[]
                        }
                    };
                }

                //map the parameters
                if (apiPath[route][oneMethod].parameters && apiPath[route][oneMethod].parameters.length > 0) {
                    for (var input in apiPath[route][oneMethod].parameters) {
                        var oneInput = apiPath[route][oneMethod].parameters[input];
                        if(oneInput['$ref']){
                            var oneInputName = oneInput['$ref'].split("/");
                            oneInputName = oneInputName[oneInputName.length-1];
                            if(commonFields[oneInputName] && commonFields[oneInputName].source){
                                all_apis[oneMethod.toLowerCase()][soajsRoute].imfv.commonFields.push(oneInputName);
                            }
                        }
                        else if (Object.keys(oneInput).length > 2) {
                            var tempInput = utils.cloneObj(oneInput);
                            var sourcePrefix = tempInput.in;
                            if (sourcePrefix === 'path') {
                                sourcePrefix = "params";
                            }
                            if (sourcePrefix === 'header') {
                                sourcePrefix = "headers";
                            }
                            if (sourcePrefix === 'formData') {
                                sourcePrefix = "body";
                            }
                            var inputObj = {
                                "required": tempInput.required,
                                "source": [sourcePrefix + "." + tempInput.name],
                                "validation": {}
                            };
                            delete tempInput.required;
                            delete tempInput.in;
                            delete tempInput.name;
                            delete tempInput.description;
                            delete tempInput.collectionFormat; //todo: need to provide support for this later on

                            lib.extractValidation(commonFields, oneInput, tempInput, inputObj);
                            all_apis[oneMethod.toLowerCase()][soajsRoute].imfv.custom[oneInput.name] = inputObj;
                        }
                    }

                    //inta hone
                    if(all_apis[oneMethod.toLowerCase()][soajsRoute].imfv.commonFields.length === 0){
                        delete all_apis[oneMethod.toLowerCase()][soajsRoute].imfv.commonFields;
                    }
                    if(Object.keys(all_apis[oneMethod.toLowerCase()][soajsRoute].imfv.custom).length === 0){
                        delete all_apis[oneMethod.toLowerCase()][soajsRoute].imfv.custom;
                    }
                }
            });
        }

        return cb({"schema": all_apis, "errors": all_errors});
    },

    /**
     * function that generates the files for the microservice
     * @param files
     * @param callback
     */
    "generateFiles": function (fileObj, cb) {
        //loop on all files and write them
        var data = utils.cloneObj(fileObj.data);

        //if tokens, replace all occurences with corresponding values
        if (fileObj.tokens) {
            for (var i in fileObj.tokens) {
                var regexp = new RegExp("%" + i + "%", "g");
                data = data.replace(regexp, fileObj.tokens[i]);
            }
        }
        if (fileObj.purify) {
            data = data.replace(/\\"/g, '"').replace(/["]+/g, '"').replace(/"__dirname/g, '__dirname');
            data = data.replace(/("group": "__empty__")/g, '"group": ""');
            data = data.replace(/("prefix": "(\s?|\s+),)/g, '"prefix": "",');
            data = data.replace(/("l": "__empty__")/g, '"l": ""');
        }
        return cb(null, data);
    }
};

/**
 * module to regenerate the folders/files from swagger.yml file
 * @type {{generate: generator.generate}}
 */
var generator = {
    //TODO: add soajs as parameter
    "generate": function (configPath, yamlPath, callback) {
        var yamlContent = fs.readFileSync(yamlPath, "utf8");
        try {
            var config = require(configPath);
        }
        catch (e){
            return callback({"code": 983, "msg": "Bad syntax found in the config file."});
        }
        //global object in this function to hold data that is juggled between functions
        var context = {
            yaml: null,
            soajs: {
                config: config
            }
        };

        /**
         * parse the yaml and generate a config.js content from it
         * @param cb
         * @returns {*}
         */
        function validateYaml(cb) {
            utils.parseYaml(yamlContent, context, cb);
        }

        /**
         * generate the folders and files needed to create a new microservice
         * @param cb
         */
        function generateModule(cb) {
            var files = {
                data: "\"use strict\";" + os.EOL + "module.exports = " + JSON.stringify(context.soajs.config, null, 2) + ";",
                tokens:{
                    dirname: "__dirname"
                },
                purify: true
            };
            utils.generateFiles(files, cb);
        }

        validateYaml((err, res) => {
            if(err) {
                return callback(err);
            }
            else {
                generateModule(callback);
            }
        });
    }
};

module.exports = generator;
