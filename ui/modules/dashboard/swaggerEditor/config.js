var dbForm = {
	db: [
		{
			'name': 'prefix%count%',
			'label': 'Prefix',
			'type': 'text',
			'placeholder': 'pre',
			'value': '',
			'tooltip': 'Enter your database prefix'
		},
		{
			'name': 'name%count%',
			'label': 'Name',
			'type': 'text',
			'placeholder': 'myDB',
			'value': '',
			'tooltip': 'Enter your database name'
		},
		{
			'name': 'multitenant%count%',
			'label': 'Multitenant',
			'type': 'radio',
			'value': [
				{l: 'true', v: 'true'},
				{l: 'false', v: 'false', selected: true}
			],
			'tooltip': 'Choose if you want your database multitenant'
		},
		{
			'name': 'model%count%',
			'label': 'Model',
			'type': 'select',
			'value': [
				{l: 'mongo', v: 'mongo', selected: true},
				{l: 'es', v: 'es'}
			],
			'tooltip': 'Choose your database model'
		},
		{
			"name": "removeDb%count%",
			"type": "html",
			"value": "<span class='red'><span class='icon icon-cross' title='Remove'></span></span>",
			"onAction": function (id, data, form) {
				var number = id.replace("removeDb", "");
				// need to decrease count
				delete form.formData['prefix' + number];
				delete form.formData['name' + number];
				delete form.formData['multitenant' + number];
				delete form.formData['model' + number];
				form.entries.forEach(function (oneEntry) {
					if (oneEntry.type === 'group' && oneEntry.name === 'dbs') {
						for (var i = oneEntry.entries.length - 1; i >= 0; i--) {
							if (oneEntry.entries[i].name === 'prefix' + number) {
								oneEntry.entries.splice(i, 1);
							}
							else if (oneEntry.entries[i].name === 'name' + number) {
								oneEntry.entries.splice(i, 1);
							}
							else if (oneEntry.entries[i].name === 'multitenant' + number) {
								oneEntry.entries.splice(i, 1);
							}
							else if (oneEntry.entries[i].name === 'model' + number) {
								oneEntry.entries.splice(i, 1);
							}
							else if (oneEntry.entries[i].name === 'removeDb' + number) {
								oneEntry.entries.splice(i, 1);
							}
						}
						form.formData.dbCount = number;
					}
				});
			}
		}
	]
};
var swaggerEditorConfig = {
	form: {
		entries: [
			{
				'name': 'serviceName',
				'label': "Service Name",
				'type': 'text',
				'placeholder': "myservice",
				'value': '',
				'tooltip': "Enter the service name, it shouldn't contain any upper case letters",
				'required': true,
				"fieldMsg": "Service Name should be alphanumeric and does not contain any space or dot or hyphen characters"
			},
			{
				'name': 'serviceGroup',
				'label': "Service Group",
				'type': 'text',
				'placeholder': "Group",
				'value': '',
				'tooltip': "Enter the group you want to add this service to it",
				'required': true
			},
			{
				'name': 'servicePort',
				'label': "Service Port",
				'type': 'number',
				'min': 4100,
				'placeholder': "4100",
				'value': '',
				'tooltip': "Enter the service port that will be use to access your service",
				'required': true,
				"fieldMsg": "The service port should be equal or greater than 4100"
			},
			{
				'name': 'serviceVersion',
				'label': "Service version",
				'type': 'number',
				'min': 1,
				'placeholder': "1",
				'value': '',
				'tooltip': "Enter your service version",
				'required': true,
				"fieldMsg": "The service version should be equal or greater than 1"
			},
			{
				'name': 'requestTimeout',
				'label': "Request Timeout",
				'type': 'number',
				'min': 1,
				'placeholder': "1",
				'value': '',
				'tooltip': "Enter the timeout of any request",
				'required': true,
				'fieldMsg': "Specify how many seconds the controller should wait before considering the request as a timeout, value must be equal or greater than 1."
			},
			{
				'name': 'requestTimeoutRenewal',
				'label': "Request Timeout Renewal",
				'type': 'number',
				'min': 1,
				'placeholder': "1",
				'value': '',
				'tooltip': "Enter the timeout renewal of any request",
				'required': true,
				'fieldMsg': "Specify how many attempts the controller should make after timing out before eventually giving up, value must be equal or greater than 1."
			},
			{
				'name': 'session',
				'label': "Session",
				'type': 'radio',
				'value': [
					{l: 'true', v: 'true'},
					{l: 'false', v: 'false', selected: true}
				],
				'tooltip': "Choose your property",
				'required': true,
				'fieldMsg': "If set to true, SOAJS creates a persistent session and adds it to the request object"
			},
			{
				'name': 'oauth',
				'label': "oauth",
				'type': 'radio',
				'value': [
					{l: 'true', v: 'true'},
					{l: 'false', v: 'false', selected: true}
				],
				'tooltip': "Choose your property",
				'required': true,
				'fieldMsg': "if set to true, the service becomes protected by oauth. Only requests that have a valid access_token are permitted to use the APIs of this service"
				
			},
			{
				'name': 'extKeyRequired',
				'label': "extKeyRequired",
				'type': 'radio',
				'value': [
					{l: 'true', v: 'true'},
					{l: 'false', v: 'false', selected: true}
				],
				'tooltip': "Choose your property",
				'required': true,
				'fieldMsg': "SOAJS evolves the service and makes it multitenant supportive"
				
			},
			{
				'name': 'urac',
				'label': "urac",
				'type': 'radio',
				'value': [
					{l: 'true', v: 'true'},
					{l: 'false', v: 'false', selected: true}
				],
				'tooltip': "Choose your property",
				'required': true,
				'fieldMsg': "This service requires access to the logged in user record in its business logic"
				
			},
			{
				'name': 'urac_Profile',
				'label': "urac_Profile",
				'type': 'radio',
				'value': [
					{l: 'true', v: 'true'},
					{l: 'false', v: 'false', selected: true}
				],
				'tooltip': "Choose your property",
				'required': true,
				'fieldMsg': "This service requires access to the logged in user profile in its business logic"
				
			},
			{
				'name': 'urac_ACL',
				'label': "urac_ACL",
				'type': 'radio',
				'value': [
					{l: 'true', v: 'true'},
					{l: 'false', v: 'false', selected: true}
				],
				'tooltip': "Choose your property",
				'required': true,
				'fieldMsg': "This service requires access to the logged in user Access Level in its business logic"
				
			},
			{
				'name': 'provision_ACL',
				'label': "provision_ACL",
				'type': 'radio',
				'value': [
					{l: 'true', v: 'true'},
					{l: 'false', v: 'false', selected: true}
				],
				'tooltip': "Choose your property",
				'required': true,
				'fieldMsg': "This service requires access to package and tenant ACL in its business logic"
				
			},
			{
				'name': 'dbs',
				'label': 'Database',
				'type': 'group',
				'collapsed': false,
				"class": "dbsList",
				'entries': []
			},
			{
				'name': 'addDb',
				'type': 'html',
				'actions': '',
				'value': '<span class=""><input type="button" class="btn btn-sm btn-success" value="Add a database"></span>'
			}
		]
},
	permissions: {
		'simulator': ['dashboard', '/swagger/simulate', 'post'],
		'generate': ['dashboard', '/swagger/generate', 'post']
	}
};