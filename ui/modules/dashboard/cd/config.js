'use strict';
var cdAppConfig = {
	form: {
		entries: [
			{
				'name': 'cd',
				'label': 'Continuous Delivery Strategy',
				'type': 'jsoneditor',
				'required': true,
				'height': "300px",
				'fixedHeight': true,
				'fieldMsg': "Provide an optional Continuous Delivery Update strategy for each environment."
			}
		]
	},
	permissions: {
		get: ['dashboard', '/cd', 'get'],
		save: ['dashboard', '/cd', 'post']
	},
	upgradeSpaceLink : "http://soajsorg.atlassian.net"
};
