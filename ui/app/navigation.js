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
		'tplPath': 'modules/dashboard/directives/dashboard.tmpl',
		'scripts': ['modules/dashboard/config.js', 'modules/dashboard/controller.js'],
		'icon': 'home',
		//'userMenu': true,
		//'mainMenu': true,
		'tracker': true
	},
	{
		'id': 'home',
		'label': translation.home[LANG],
		'url': '#/login',
		'tplPath': 'modules/myAccount/directives/login.tmpl',
		'scripts': ['modules/myAccount/config.js', 'modules/myAccount/controller.js'],
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
		'scripts': ['modules/dashboard/config.js', 'modules/dashboard/controller.js'],
		'tplPath': 'modules/dashboard/directives/help.tmpl',
		'footerMenu': true
	}
];