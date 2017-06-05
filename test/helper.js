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
		}
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