'use strict';

var catalogAppConfig = {
    form: {
        viewRecipe: {
            entries: [
                {
					'name': 'recipe',
					'label': 'Recipe',
					'type': 'jsoneditor',
					'height': '200px',
					'value': {},
					'required': true
				}
            ]
        },
        addRecipe: {
            entries: [
                {
                    'name': 'template',
					'label': 'Existing Recipe Template',
					'type': 'select',
					'value': [],
					'required': true
                },
                {
					'name': 'recipe',
					'label': 'Recipe',
					'type': 'jsoneditor',
					'height': '200px',
					'value': {},
					'required': true
				}
            ]
        }
    },
    permissions: {
		list: ['dashboard', '/catalog/recipes/list', 'get'],
		add: ['dashboard', '/catalog/recipes/add', 'post'],
		update: ['dashboard', '/catalog/recipes/update', 'put'],
		delete: ['dashboard', '/catalog/recipes/delete', 'delete']
	}

};
