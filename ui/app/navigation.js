/**
 * UI Navigation links
 */

var navigation = [
	{
		'id': 'home',
		'label': translation.home[LANG],
		'url': '#/dashboard',
		'tplPath': 'modules/dashboard/home/directives/dashboard.tmpl',
		'scripts': ['modules/dashboard/home/config.js', 'modules/dashboard/home/controller.js'],
		'footerMenu': true,
		'tracker': true
	},
	{
		'id': 'login',
		'label': translation.home[LANG],
		'url': '#/login',
		'tplPath': 'modules/dashboard/myAccount/directives/login.tmpl',
		'scripts': ['modules/dashboard/myAccount/config.js', 'modules/dashboard/myAccount/controller.js']
	},
	{
		'id': 'noEnv',
		'label': 'No Environment Found',
		'url': '#/home/env',
		'pillar': {
			'name': 'deploy',
			'label': translation.deploy[LANG],
			'position': 3
		},
		'order': 2,
		'checkPermission': {
			'service': 'dashboard',
			'route': '/environment/list'
		},
		'scripts': ['modules/dashboard/home/config.js', 'modules/dashboard/home/controller.js'],
		'tplPath': 'modules/dashboard/home/directives/noenv.tmpl'
	},
	{
		'id': 'help2',
		'label': translation.help[LANG],
		'url': '#/help',
		'scripts': ['modules/dashboard/home/config.js', 'modules/dashboard/home/controller.js'],
		'tplPath': 'modules/dashboard/home/directives/help.tmpl',
		'footerMenu': true
	}
];

(function () {
	var link = document.createElement("script");
	link.type = "text/javascript";
	link.src = "themes/" + themeToUse + "/bootstrap.js";
	document.getElementsByTagName("head")[0].appendChild(link);

	if (modules) {
		var allFiles = [];
		for (var pillar in modules) {
			if (modules.hasOwnProperty(pillar)) {
				for (var env in modules[pillar]) {
					if (modules[pillar].hasOwnProperty(env)) {
						for (var install in modules[pillar][env]) {
							if (typeof modules[pillar][env][install] === 'string') {
								allFiles.push(modules[pillar][env][install]);
							}
							else if (typeof modules[pillar][env][install] === 'object') {
								if (modules[pillar][env][install].latest) {
									allFiles.push(modules[pillar][env][install][modules[pillar][env][install].latest]);

								}
								else {
									var latest = parseInt(Object.keys(modules[pillar][env][install])[0]);
									for (var i = 1; i < Object.keys(modules[pillar][env][install]).length; i++) {
										if (parseInt(Object.keys(modules[pillar][env][install])[i]) > latest) {
											latest = parseInt(Object.keys(modules[pillar][env][install])[i]);
										}
									}
									allFiles.push(modules[pillar][env][install][latest.toString()]);
								}
							}
						}
					}
				}
			}
		}

		var head = document.getElementsByTagName("head")[0];

		function getFile(entry) {
			var x = document.createElement("script");
			x.type = "text/javascript";
			x.src = entry;
			//head.appendChild(x);
			head.insertBefore(x, head.firstChild);
		}

		for (var j = 0; j < allFiles.length; j++) {
			getFile(allFiles[j]);
		}
	}
})();