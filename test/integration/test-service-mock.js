'use strict';
const express = require('express');
const sApp = express();
const mApp = express();

function startServer(serverConfig, callback) {
	if (!serverConfig) {
		serverConfig = {}
	}
	if (!serverConfig.name) {
		serverConfig.name = "httpmethods";
	}
	if (!serverConfig.s) {
		serverConfig.s = {};
		serverConfig.s.port = 4010;
	}
	if (!serverConfig.m) {
		serverConfig.m = {};
		serverConfig.m.port = 5010;
	}
	
	let mReply = {
		'result': true,
		'ts': Date.now(),
		'service': {
			'service': serverConfig.name,
			'type': 'rest',
			'route': "/heartbeat"
		}
	};
	let sReply = {
		'result': true,
		'data': {
			'firstname': "antoine",
			'lastname': "hage",
			'type': "mock service"
		}
	};
	
	sApp.get('/testGet', (req, res) => {
		sReply.data.url = req.url;
		sReply.data.method = req.method;
		res.json(sReply);
	});
	sApp.post('/testPost', (req, res) => {
		sReply.data.url = req.url;
		sReply.data.method = req.method;
		res.json(sReply);
	});
	sApp.put('/testPut', (req, res) => {
		sReply.data.url = req.url;
		sReply.data.method = req.method;
		res.json(sReply);
	});
	sApp.delete('/testDelete', (req, res) => {
		sReply.data.url = req.url;
		sReply.data.method = req.method;
		res.json(sReply);
	});
	sApp.patch('/testPatch', (req, res) => {
		sReply.data.url = req.url;
		sReply.data.method = req.method;
		res.json(sReply);
	});
	sApp.head('/testHead', (req, res) => {
		sReply.data.url = req.url;
		sReply.data.method = req.method;
		res.json(sReply);
	});
	sApp.options('/testOther', (req, res) => {
		sReply.data.url = req.url;
		sReply.data.method = req.method;
		res.json(sReply);
	});
	
	
	mApp.get('/heartbeat', (req, res) => {
		mReply.service.route = '/heartbeat';
		res.json(mReply)
	});
	mApp.get('/wrench', (req, res) => {
		mReply.service.route = '/wrench';
		res.json(mReply)
	});
	
	
	let sAppServer = sApp.listen(serverConfig.s.port, () => console.log(`${serverConfig.name} service mock listening on port ${serverConfig.s.port}!`));
	let mAppServer = mApp.listen(serverConfig.m.port, () => console.log(`${serverConfig.name} service mock listening on port ${serverConfig.m.port}!`));
	
	return callback(
		{
			"sAppServer": sAppServer,
			"mAppServer": mAppServer,
			"name": serverConfig.name
		}
	)
}

function killServer(config) {
	console.log("killing server ....");
	
	config.mAppServer.close((err) => {
		console.log("...sAppServer: " + config.name);
	});
	
	config.sAppServer.close((err) => {
		console.log("...mAppServer: " + config.name);
	});
}

module.exports = {
	startServer: startServer,
	killServer: killServer
};