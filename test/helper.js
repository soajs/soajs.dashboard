var testConsole = {
	log: function () {
		if (process.env.SHOW_LOGS === 'true') {
			console.log.apply(this, arguments);
		}
	}
};

var request = require("request");

module.exports = {
	deployer: {
		inspectService: function (options, cb) {
			return cb(null, true);
		},
		deleteService: function (options, cb) {
			return cb(null, true);
		},
		scaleService: function (options, cb) {
			return cb(null);
		},
		redeployService: function (options, cb) {
			return cb(null, {});
		},
		deployService: function (options, cb) {
			return cb(null, {});
		},
        findService: function (options, cb) {
            return cb(null, {});
        },
		deleteNameSpace: function (options, cb) {
			return cb(null, true);
		},
		listNameSpaces: function (options, cb) {
			return cb(null, []);
		},
		addNode: function (options, cb) {
			return cb(null, true);
		},
		updateNode: function (options, cb) {
			return cb(null, true);
		},
		removeNode: function (options, cb) {
			return cb(null, true);
		},
		listNodes: function (options, cb) {
			var arr = [];
			return cb(null, arr);
		},
		listServices: function (data, cb) {
			var arr = [
				{
					labels: {
						'soajs.env.code': 'dev'
					},
					ports: []
				}
			];
			return cb(null, arr);
		},
		maintenance: function (options, cb) {
			return cb(null, true);
		},
		getContainerLogs: function (data, cb) {
			return;
		},
		getAutoscaler: function(options, cb) {
			return cb(null, {});
		},
		createAutoscaler: function(options, cb) {
			return cb(null, true);
		},
		updateAutoscaler: function(options, cb) {
			return cb(null, true);
		},
		deleteAutoscaler: function(options, cb) {
			return cb(null, true);
		},
		getServicesMetrics: function(options, cb) {
			return cb(null, true);
		},
		getNodesMetrics: function(options, cb) {
			return cb(null, true);
		},
		execute: function(driverOptions, method, methodOptions, cb) {
			if(method === 'listKubeServices'){
				return cb(null, [{
						metadata : {
							name : 'heapster',
							namespace : 'kube-system'
						}
				}]);
			}else{
				return cb(null, []);
			}
		}
		
	},
	infraRecord : {
		"_id": '5aec1c671242bc43b6cb9e9c',
		"api": {
			"token": "ea5788149d1e1d6315dcb6dc4b7566248131c750e1d97c9254a5810687e2421dce7908684d1e93f6b14bc0e98d5a4d17e32f1f9d344fcba3bb7e24cd3ce739c9c0020dc25a547b9791657321244dc7c62c52a9630c03d6996e3287361454e068e85518e0ebf7181ba2ee3d3ccc317929b50ef8b5b5b4bd8d6c63fdbe556d656bc051dee5e7cb1a496efaf82f5abe114aea77c2ece7f6c64023f62a30738d60061c796028c6111b9107e3ee5669f3e06b8331f34bd368d08c675d122f2dd2c8a597d8396e978136ac1ff0927842f8df036ab4e3ccb3d6f81712d72346e70bd9b9bd79a03702b933145943c6c318efafb84ca8dcd683ed45afe1984039afd9cae2c845bfc5c7c02ccfca0c602ebb3edd5cdb6e4b30d87f9f468192597f691bc1e930599e643414d74fd25a6ac31d975d9e7b3e65de01f32d89ab1e59f209f6e4e2f2d367b2edd2fb1088ac23c35c4f14a8f05d393461e1e4d098df8d5f4c87024dd5ec8dd2c3edec5419458aa0990d8cef3238ca7bbb2439a1cd8bc926bf6614f0a60cabfbc2348c5376db2026e7a546dc222e63c66d2109fee39adecac1b920ff8654add1382e66f4864a0873c8785556dce2f5ff03b8393bbbe67a2aea5119fec1c309a3ccd9b79db2887d25c81a1341d86af21946cbfdc1400e4acbce29ce471503d691e35d407a74159010473b42e90f7ffd2c2a02d919b3f177690ee92cd0",
			"ipaddress": "192.168.50.67",
			"network": "soajsnet",
			"port": 443,
			"protocol": "https"
		},
		"name": "local",
		"technologies": [
			"docker"
		],
		"templates": null,
		"label": "Wissam Docker",
		"deployments": [
			{
				"technology": "docker",
				"options": {
					"zone": "local"
				},
				"environments": [
					"DEV"
				],
				"loadBalancers": {},
				"name": "htlocalmggdiohh06wiu",
				"id": "htlocalmggdiohh06wiu"
			}
		]
	},
	requireModule: function (path) {
		return require((process.env.APP_DIR_FOR_CODE_COVERAGE || '../') + path);
	},
	requester: function (method, params, cb) {
		var requestOptions = {
			'uri': params.uri,
			'json': params.body || true
		};
		if (params.headers) requestOptions.headers = params.headers;
		if (params.authorization) requestOptions.headers.authorization = params.authorization;
		if (params.qs) requestOptions.qs = params.qs;
		if (params.form !== undefined) requestOptions.form = params.form;

		testConsole.log('===========================================================================');
		testConsole.log('==== URI     :', params.uri);
		testConsole.log('==== REQUEST :', JSON.stringify(requestOptions));
		request[method](requestOptions, function (err, response, body) {
			testConsole.log('==== RESPONSE:', JSON.stringify(body));
			return cb(err, body, response);
		});
	}
};
