

var lib = {
	
	generateYaml: function(soajsImfvSchema){
		let output = {
			swagger: "2.0",
			info: {
				version: "1.0.0",
				title: "SOAJS Petstore"
			},
			host: "localhost",
			basePath: "/petstore",
			schemes: [
				"http"
			],
			responses: {},
			
			paths: {}, // route / method / ...
			parameters: {}, //
			definitions: {}
		};
		
		let soajsImfvSchemaKeys = Object.keys(soajsImfvSchema);
		
		soajsImfvSchemaKeys.forEach(function (schemaKey) {
			let schema = soajsImfvSchema[schemaKey];
			
			if (schemaKey === 'commonFields') {
				let parameters = lib.deduceParamsFromCommonFields(schema);
				output.parameters = parameters;
			} else {
				let routesKeys = Object.keys(schema);
				routesKeys.forEach(function (routeKey) {
					let route = schema[routeKey];
					let custom = route.imfv.custom;
					let commonFields = route.imfv.commonFields;
					let routeParams = [];
					
					if (custom) {
						console.log('..............................');
						console.log(' ....... working on : ' + routeKey + ' [ ' + schemaKey + ']');
						console.log('..............................');
						routeParams = lib.convertCustomImfv(custom);
					}
					
					if (commonFields) {
						// todo: commonFields
					}
					
					if (!output.paths[routeKey]) {
						output.paths[routeKey] = {};
					}
					
					output.paths[routeKey][schemaKey] = {
						tags: [],
						summary: 'test',
						operationId: 'whatdoumean',
						parameters: routeParams,
						responses: {}
					};
				});
				
				// todo: continue from here
				
			}
		});
	},
	
	firstCharToUpper: function (str) {
	//todo:
	return str;
},
	
	convertSource: function (arrayOfSources) {
	// todo: how to support many source? comma sepperated?
	let output = ""; // body
	if (arrayOfSources) {
		arrayOfSources.forEach(function (eachSource) {
			if (eachSource.includes('body')) {
				output += "body,";
			}
			if (eachSource.includes('headers')) {
				output += "headers,";
			}
			if (eachSource.includes('params')) { // params or headers?
				output += "path,";
			}
		})
	}
	
	if (output.length > 0) {
		output = output.substring(0, output.length - 1);
	}
	
	return output !== '' ? output : null;
},
	
	convertItem: function (key, object) {
	console.log('--- +++++++++++++++ +++++++++++++++ +++++++++++++++');
	console.log(key);
	console.log(JSON.stringify(object, null, 2));
	console.log('---');
	
	let schema = {};
	
	let output = {
		in: lib.convertSource(object.source),
		name: key,
		description: object.description || '', // todo: support in inputmaskdata
		required: object.required
	};
	
	if (object.validation) {
		if (output.type !== 'object') {
			output.type = object.validation.type;
		} else {
			output.schema = {
				$ref: "#/definitions/" + lib.firstCharToUpper(key) + "_" + 0 // todo: add counter
			};
			
			//let definition = deduceDefinition();
			
		}
	}
	
	// schema $ref
	// type object.type
	// object.validation.type
	
	// "in": "body",
	// 	"name": "pet",
	// 	"description": "Pet object that needs to be added to the store",
	// 	"required": true,
	// 	"schema": {
	// 	"$ref": "#/definitions/Pet"
	// }
	
	console.log('------- output ----');
	console.log(output);
	console.log('-----------');
	
	
	return output;
},
	
	convertCustomImfv: function (soajsImfv) {
	let output = [];
	
	let customKeys = Object.keys(soajsImfv);
	customKeys.forEach(function (eachCustom) {
		let customKey = soajsImfv[eachCustom];
		let tempo = lib.convertItem(eachCustom, customKey);
		output.push(tempo);
	});
	
	return output;
},
	
	deduceParamsFromCommonFields: function (commonFields) {
	let output = [];
	
	if (!commonFields) {
		return output;
	}
	
	let commonFieldsArray = Object.keys(commonFields);
	commonFieldsArray.forEach(function (eachCommon) {
		let commonField = commonFields[eachCommon];
		let tempo = lib.convertItem(eachCommon, commonField);
		output.push(tempo);
	});
	
	return output;
}

};

module.exports = {
	/**
	 * parse the JSON and generate a Yaml from it
	 * @param cb
	 * @returns {*}
	 */
	"parseJson": function (jsonContent, callback) {
		var yamlCode = lib.generateYaml(jsonContent);
		
		try {
			yamlCode = yamljs.stringify(jsonContent, 2, 1);
		}
		catch (e) {
			return callback({"code": 851, "msg": e.message});
		}
		
		return callback(null, yamlCode);
	}
};