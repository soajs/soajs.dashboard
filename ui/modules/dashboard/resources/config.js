'use strict';

var resourcesAppConfig = {
    form: {
	    addResource: {
            entries: [
                {
					'name': 'type',
					'label': "Resource Type",
					'type': 'select',
					'fieldMsg': "Pick the type of resource you want to create depending on its purpose.",
					'value' :[],
					'required': true
				},
                {
					'name': 'category',
					'label': "Resource Category",
					'type': 'select',
					'value' :[],
					'required': true,
                    'hidden': true
				}
            ],
            data: {
                types: [
                    {'v': 'cluster', 'l': "Cluster"},
                    {'v': 'server', 'l': "Server"},
                    {'v': 'cdn', 'l': "CDN"},
                    {'v': 'system', 'l': "System"},
                    {'v': 'other', 'l': "Other"}
                ],
                categories: [
                    {'v': 'mongo', 'l': "Local/External Mongo", "group": "cluster"},
					{'v': 'elasticsearch', 'l': "Local/External ElasticSearch", "group": "cluster"},
	
	                {'v': 'objectrocket_mongo', 'l': "Object Rocket - Mongo SAAS", "group": "cluster"},
	                {'v': 'objectrocket_elasticsearch', 'l': "Object Rocket - ElasticSearch SAAS", "group": "cluster"},
	                
					{'v': 'mysql', 'l': "MySQL", "group": "cluster"},
					{'v': 'oracle', 'l': "Oracle", "group": "cluster"},
					{'v': 'other', 'l': "Other", "group": "cluster"},

					{'v': 'nginx', 'l': "Nginx", "group": "server"},
					{'v': 'apache', 'l': "Apache", "group": "server"},
					{'v': 'iis', 'l': "IIS", "group": "server"},
					{'v': 'other', 'l': "Other", "group": "server"},

					{'v': 'amazons3', 'l': "Amazon S3", "group": "cdn"},
					{'v': 'rackspace', 'l': "Rackspace", "cluster": "cdn"},
					{'v': 'cloudflare', 'l': "Cloudflare", "group": "cdn"},
					{'v': 'other', 'l': "Other", "group": "cdn"},

					{'v': 'kibana', 'l': "Kibana", "group": "system"},
					{'v': 'other', 'l': "Other", "group": "system"}
                ]
            }
        }
    },

    permissions: {
        list: ['dashboard', '/resources/list', 'get'],
		add: ['dashboard', '/resources/add', 'post'],
		update: ['dashboard', '/resources/update', 'put'],
		delete: ['dashboard', '/resources/delete', 'delete'],

        deploy: ['dashboard', '/cloud/services/deploy', 'post']
    }

};
