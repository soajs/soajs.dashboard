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
					'rows': 5,
					'placeholder': 'Testing Package, used by developers and does not reach production server...',
					'value': '',
					'tooltip': 'Enter a description explaining the usage of this package',
					'required': false
				},
				{
					'name': 'acl',
					'label': 'Access Level',
					'type': 'textarea',
					'rows': 10,
					'placeholder': {"urac": {"access": false, "apis": {"/account/changeEmail": {"access": true}}}},
					'value': '',
					'tooltip': 'Enter the Access Level configuration in this box as a JSON format Object.',
					'required': false
				},
				{
					'name': '_TTL',
					'label': 'TTL',
					'type': 'radio',
					'value': [{'v': 6}, {'v': 12}, {'v': 24}, {'v': 48}],
					'tooltip': 'Pick a time to live value for this package.'
				}
			]
		}
	}
};