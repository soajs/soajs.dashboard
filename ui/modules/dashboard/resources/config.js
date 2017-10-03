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
					{'v': 'rackspace', 'l': "Rackspace", "group": "cdn"},
					{'v': 'other', 'l': "Other", "group": "cdn"},

					{'v': 'kibana', 'l': "Kibana", "group": "system"},
                    {'v': 'logstash', 'l': "Logstash", "group": "system"},
					{'v': 'filebeat', 'l': "Filebeat", "group": "system"},
					{'v': 'metricbeat', 'l': "Metricbeat", "group": "system"},
					{'v': 'other', 'l': "Other", "group": "system"},
	
	                {'v': 'other', 'l': "Other", "group": "other"}
                ]
            }
        }
    },

    permissions: {
        list: ['dashboard', '/resources/list', 'get'],
		add: ['dashboard', '/resources/add', 'post'],
		update: ['dashboard', '/resources/update', 'put'],
		delete: ['dashboard', '/resources/delete', 'delete'],
        upgrade: ['dashboard', '/resources/upgrade', 'get'],

        getConfig: ['dashboard', '/resources/config', 'get'],
        setConfig: ['dashboard', '/resources/config/update', 'put'],

        deploy: ['dashboard', '/cloud/services/soajs/deploy', 'post'],
        rebuild: ['dashboard', '/cloud/services/redeploy', 'put'],
        deleteService: ['dashboard', '/cloud/services/delete', 'delete'],
        listServices: ['dashboard', '/cloud/services/list', 'get'],

        listEnvs: ['dashboard', '/environment/list', 'get'],
        getEnv: ['dashboard', '/environment', 'get'],

        listRecipes: ['dashboard', '/catalog/recipes/list', 'get']
    }

};
