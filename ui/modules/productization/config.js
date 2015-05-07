var productizationConfig = {
	'grid': {
		'product': {},
		'package': {
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{'label': 'Code', 'field': 'code'},
				{'label': 'Name', 'field': 'name'},
				{'label': 'Description', 'field': 'description'},
				{'label': 'TTL ( hours )', 'field': '_TTL', filter: "TTL"}
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
					'label': 'Code',
					'type': 'text',
					'placeholder': 'TPROD...',
					'value': '',
					'tooltip': 'Enter Product Code; maximum 5 characters.',
					'required': true
				},
				{
					'name': 'name',
					'label': 'Name',
					'type': 'text',
					'placeholder': 'Test Product...',
					'value': '',
					'tooltip': 'Enter Product Name.',
					'required': true
				},
				{
					'name': 'description',
					'label': 'Description',
					'type': 'textarea',
					'rows': 5,
					'placeholder': 'Testing Product, used by developers and does not reach production server...',
					'value': '',
					'tooltip': 'Enter a description explaining the usage of this product',
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
					'label': 'Code',
					'type': 'text',
					'placeholder': 'BASIC...',
					'value': '',
					'tooltip': 'Enter Package Code; maximum 5 characters.',
					'required': true
				},
				{
					'name': 'name',
					'label': 'Name',
					'type': 'text',
					'placeholder': 'Test Package...',
					'value': '',
					'tooltip': 'Enter Package Name.',
					'required': true
				},
				{
					'name': 'description',
					'label': 'Description',
					'type': 'textarea',
					'rows': 4,
					'placeholder': 'Testing Package, used by developers and does not reach production server...',
					'value': '',
					'tooltip': 'Enter a description explaining the usage of this package',
					'required': false
				},
				{
					'name': '_TTL',
					'label': 'TTL',
					'type': 'select',
					'value': [{'v': 6, 'l': '6 hours'}, {'v': 12, 'l': '12 hours'}, {'v': 24, 'l': '24 hours'},
						{'v': 48, 'l': '2 days'}, {'v': 72, 'l':'3 days'}, {'v': 96, 'l':'4 days'},
						{'v': 120, 'l':'5 days'}, {'v': 144, 'l':'6 days'}, {'v': 168, 'l':'7 days'}],
					'tooltip': 'Pick a time to live value for this package.'
				}
			]
		}
	},
	'permissions':{
		'listProduct' :['dashboard', '/product/list'],
		'addProduct' : ['dashboard', '/product/add'],
		'deleteProduct' :['dashboard', '/product/delete'],
		'editProduct':['dashboard', '/product/update'],
		'listPck' : ['dashboard', '/product/packages/list'],
		'addPck' : ['dashboard', '/product/packages/add'],
		'deletePck' : ['dashboard', '/product/packages/delete'],
		'updatePck' : ['dashboard', '/product/packages/update']
	}
};