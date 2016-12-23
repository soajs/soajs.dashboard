var productizationConfig = {
	'grid': {
		'product': {},
		'package': {
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{'label': translation.code[LANG], 'field': 'code'},
				{'label': translation.name[LANG], 'field': 'name'},
				{'label': translation.description[LANG], 'field': 'description'},
				{'label': 'TTL ( ' + translation.description[LANG]+ ' )', 'field': '_TTL', filter: "TTL"}
				//,{'label': 'ACL', 'field': 'acl'}
			],
			'leftActions': [],
			'topActions': [],
			'defaultSortField': 'code',
			'defaultLimit': 5
		}
	},
	'form': {
		'product': {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'code',
					'label': translation.code[LANG],
					'type': 'text',
					'placeholder': 'TPROD...',
					'value': '',
					'tooltip': translation.formProductCodeToolTip[LANG],
					'required': true
				},
				{
					'name': 'name',
					'label': translation.name[LANG],
					'type': 'text',
					'placeholder': translation.formProductNamePlaceholder[LANG],
					'value': '',
					'tooltip': translation.formProductNameToolTip[LANG],
					'required': true
				},
				{
					'name': 'description',
					'label': translation.description[LANG],
					'type': 'textarea',
					'rows': 5,
					'placeholder': translation.formProductDescriptionPlaceholder[LANG],
					'value': '',
					'tooltip': translation.formProductDescriptionToolTip[LANG],
					'required': false
				}
			]
		},
		'package': {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'code',
					'label': translation.code[LANG],
					'type': 'text',
					'placeholder': translation.formPackageCodePlaceholder[LANG],
					'value': '',
					'tooltip': translation.formPackageCodeToolTip[LANG],
					'required': true
				},
				{
					'name': 'name',
					'label': translation.name[LANG],
					'type': 'text',
					'placeholder': translation.formPackageNamePlaceholder[LANG],
					'value': '',
					'tooltip': translation.formPackageNameToolTip[LANG],
					'required': true
				},
				{
					'name': 'description',
					'label': translation.description[LANG],
					'type': 'textarea',
					'rows': 4,
					'placeholder': translation.formPackageDescriptionPlaceholder[LANG],
					'value': '',
					'tooltip': translation.formPackageDescriptionToolTip[LANG],
					'required': false
				},
				{
					'name': '_TTL',
					'label': 'TTL',
					'type': 'select',
					'value': [{'v': 6, 'l': '6 ' + translation.hours[LANG]}, {'v': 12, 'l': '12 ' + translation.hours[LANG]}, {'v': 24, 'l': '24 ' + translation.hours[LANG]},
						{'v': 48, 'l': '2 ' + translation.days[LANG]}, {'v': 72, 'l':'3 ' + translation.days[LANG]}, {'v': 96, 'l':'4 ' + translation.days[LANG]},
						{'v': 120, 'l':'5 ' + translation.days[LANG]}, {'v': 144, 'l':'6 ' + translation.days[LANG]}, {'v': 168, 'l':'7 ' + translation.days[LANG]}],
					'tooltip': translation.formTTLToolTip[LANG]
				}
			]
		}
	},
	'permissions':{
		'listProduct' :['dashboard', '/product/list', 'get'],
		'addProduct' : ['dashboard', '/product/add', 'post'],
		'deleteProduct' :['dashboard', '/product/delete', 'delete'],
		'editProduct':['dashboard', '/product/update', 'put'],
		'listPck' : ['dashboard', '/product/packages/list', 'get'],
		'addPck' : ['dashboard', '/product/packages/add', 'post'],
		'deletePck' : ['dashboard', '/product/packages/delete', 'delete'],
		'updatePck' : ['dashboard', '/product/packages/update', 'put']
	}
};