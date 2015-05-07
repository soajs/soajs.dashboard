/**
 * UI Navigation links
 */
var navigation = [
	{
		'id': 'home',
		'label': 'Home',
		'url': '#/dashboard',
		'tplPath': 'modules/dashboard/directives/dashboard.tmpl',
		'scripts': ['modules/dashboard/config.js', 'modules/dashboard/controller.js'],
		'icon': 'home',
		'mainMenu': true,
		'private': true,
		'tracker': true
	},
	{
		'id': 'home',
		'label': 'Home',
		'url': '#/login',
		'tplPath': 'modules/myAccount/directives/login.tmpl',
		'scripts': ['modules/myAccount/config.js', 'modules/myAccount/controller.js'],
		'footerMenu': true
	},
	{
		'id': 'help',
		'label': 'Help',
		'url': '#/help',
		'guestMenu': true,
		'userMenu': true,
		'private': true,
		'icon': 'question',
		'scripts': ['modules/dashboard/controller.js'],
		'tplPath': 'modules/dashboard/directives/help.tmpl',
		'footerMenu': true
	}
];

var modules = ['members', 'environments', 'services', 'productization', 'multitenancy', 'settings', 'myAccount'];var modules = ['members', 'environments', 'services', 'productization', 'multitenancy', 'myAccount', 'settings'];