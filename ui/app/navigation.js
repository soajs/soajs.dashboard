/**
 * UI Navigation links
 */

var navigation = [
	{
		'checkPermission': {
			'service': 'dashboard',
			'route': '/environment/list'
		},
		'id': 'home',
		'label': translation.home[LANG],
		'url': '#/dashboard',
		'tplPath': 'modules/DASHBOARD/home/directives/dashboard.tmpl',
		'scripts': ['modules/DASHBOARD/home/config.js', 'modules/DASHBOARD/home/controller.js'],
		'icon': 'home',
		//'userMenu': true,
		//'mainMenu': true,
		'tracker': true
	},
	{
		'id': 'home',
		'label': translation.home[LANG],
		'url': '#/login',
		'tplPath': 'modules/DASHBOARD/myAccount/directives/login.tmpl',
		'scripts': ['modules/DASHBOARD/myAccount/config.js', 'modules/DASHBOARD/myAccount/controller.js'],
		'footerMenu': true
	},
	//{
	//	'id': 'help',
	//	'label': 'Help',
	//	'url': '#/help',
	//	'guestMenu': true,
	//	'userMenu': true,
	//	'private': true,
	//	'icon': 'question',
	//	'scripts': ['modules/dashboard/config.js', 'modules/dashboard/controller.js'],
	//	'tplPath': 'modules/dashboard/directives/help.tmpl'
	//},
	{
		'id': 'help2',
		'label': translation.help[LANG],
		'url': '#/help',
		'scripts': ['modules/DASHBOARD/home/config.js', 'modules/DASHBOARD/home/controller.js'],
		'tplPath': 'modules/DASHBOARD/home/directives/help.tmpl',
		'footerMenu': true
	}
];

(function () {
	var link = document.createElement("script");
	link.type = "text/javascript";
	link.src = "themes/" + themeToUse + "/bootstrap.js";
	document.getElementsByTagName("head")[0].appendChild(link);

	if (modules) {
		var allFiles= [];
		for (var pillar in modules) {
			if (modules.hasOwnProperty(pillar)){
				for (var env in modules[pillar]) {
					if(modules[pillar].hasOwnProperty(env)){
						for ( var install in modules[pillar][env]){
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
		for(var j = 0; j < allFiles.length; j++)
		{
			var x = document.createElement("script");
			x.type = "text/javascript";
			x.src= allFiles[j];
			document.getElementsByTagName("head")[0].appendChild(x);
		}
	}
})();