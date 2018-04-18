"use strict";
var serviceProviders = [
	{
		v: 'aws',
		l: 'Amazon Web Services',
		image: 'modules/dashboard/environments/images/aws.png',
		help: {
			docker: 'https://soajsorg.atlassian.net/wiki/spaces/EX/pages/142213183/AWS+Docker',
			kubernetes: 'https://soajsorg.atlassian.net/wiki/spaces/EX/pages/142344246/AWS+Kubernetes'
		}
	},
	{
		v: 'rackspace',
		l: 'Rackspace',
		image: 'modules/dashboard/environments/images/rackspace.png',
		help: {
			docker: 'https://soajsorg.atlassian.net/wiki/spaces/EX/pages/142442528/Rackspace+Docker',
			kubernetes: 'https://soajsorg.atlassian.net/wiki/spaces/EX/pages/142147626/Rackspace+Kubernetes'
		}
	},
	{
		v: 'google',
		l: 'Google Cloud',
		image: 'modules/dashboard/environments/images/google.png',
		help: {
			docker: 'https://soajsorg.atlassian.net/wiki/spaces/EX/pages/142409762/Google+Docker',
			kubernetes: 'https://soajsorg.atlassian.net/wiki/spaces/EX/pages/142344252/Google+Kubernetes'
		}
	},
	{
		v: 'azure',
		l: 'Microsoft Azure',
		image: 'modules/dashboard/environments/images/azure.png',
		help: {
			docker: 'https://soajsorg.atlassian.net/wiki/spaces/EX/pages/142147642/Microsoft+Azure+Docker',
			kubernetes: 'https://soajsorg.atlassian.net/wiki/spaces/EX/pages/142213187/Microsoft+Azure+Kubernetes'
		}
	},
	{
		v: 'joyent',
		l: 'Joyent',
		image: 'modules/dashboard/environments/images/joyent.png',
		help: {
			docker: 'https://soajsorg.atlassian.net/wiki/spaces/EX/pages/142442552/Joyent+Docker',
			kubernetes: 'https://soajsorg.atlassian.net/wiki/spaces/EX/pages/142442556/Joyent+Kubernetes'
		}
	},
	{
		'v': 'liquidweb',
		l: 'Liquid Web',
		image: 'modules/dashboard/environments/images/liquidweb.png',
		help: {
			docker: 'https://soajsorg.atlassian.net/wiki/spaces/EX/pages/142213203/Liquid+Web+Docker',
			kubernetes: 'https://soajsorg.atlassian.net/wiki/spaces/EX/pages/142180385/Liquid+Web+Kubernetes'
		}
	},
	{
		'v': 'digitalocean',
		l: 'Digital Ocean',
		image: 'modules/dashboard/environments/images/digitalocean.png',
		help: {
			docker: 'https://soajsorg.atlassian.net/wiki/spaces/EX/pages/142376998/Digital+Ocean+Docker',
			kubernetes: 'https://soajsorg.atlassian.net/wiki/spaces/EX/pages/142344256/Digital+Ocean+Kubernetes'
		}
	},
	{
		v: 'other',
		l: 'Ubuntu',
		image: 'modules/dashboard/environments/images/ubuntu.png',
		help: {
			docker: 'https://soajsorg.atlassian.net/wiki/spaces/EX/pages/142442570/Other+with+Docker',
			kubernetes: 'https://soajsorg.atlassian.net/wiki/spaces/EX/pages/142377002/Other+with+Kubernetes'
		}
	}
];

var environmentsConfig = {
	deployer: {
		kubernetes: {
			"minPort": 0,
			"maxPort": 2767
		},
		certificates: {
			required: ['ca', 'cert', 'key']
		}
	},
	predefinedPortalTemplateName : "SOAJS Portal Environment",
	
	customRegistryIncrement: 20,
	
	form: {
		add: {
			deploy: {
				"entries": [
					{
						"name": "deployment",
						"directive": "modules/dashboard/environments/directives/add/deploy.tmpl"
					}
				]
			},
			registry: {
				"entries": [
					{
						"name": "registry",
						"directive": "modules/dashboard/environments/directives/add/registry.tmpl"
					}
				]
			},
			nginx: {
				"entries": [
					{
						"name": "nginx",
						"directive": "modules/dashboard/environments/directives/add/nginx.tmpl"
					}
				]
			}
		},
		database: {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'prefix',
					'label': "Custom Prefix",
					'type': 'text',
					'placeholder': 'soajs_',
					'value': '',
					'tooltip': "Enter a custom prefix for this Database or leave empty to use the global prefix value.",
					'fieldMsg': "Enter a custom prefix for this Database or leave empty to use the global prefix value.",
					'required': false
				},
				{
					'name': 'name',
					'label': translation.databaseName[LANG],
					'type': 'text',
					'placeholder': translation.myDatabase[LANG],
					'value': '',
					'tooltip': translation.enterEnvironmentDatabaseName[LANG],
					'required': true
				},
				{
					'name': 'cluster',
					'label': translation.clusterName[LANG],
					'type': 'select',
					'value': [{'v': '', 'l': ''}],
					'required': true
				},
				{
					'name': 'tenantSpecific',
					'label': translation.tenantSpecific[LANG],
					'type': 'radio',
					'value': [
						{
							'v': false,
							'l': "False"
						},
						{
							'v': true,
							'l': "True"
						}
					],
					'required': false
				}
			]
		},
		session: {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'prefix',
					'label': "Custom Prefix",
					'type': 'text',
					'placeholder': 'soajs_',
					'value': '',
					'tooltip': "Enter a custom prefix for this Database or leave empty to use the global prefix value.",
					'fieldMsg': "Enter a custom prefix for this Database or leave empty to use the global prefix value.",
					'required': false
				},
				{
					'name': 'name',
					'label': translation.databaseName[LANG],
					'type': 'text',
					'placeholder': translation.myDatabase[LANG],
					'value': '',
					'tooltip': translation.enterEnvironmentDatabaseName[LANG],
					'required': true
				},
				{
					'name': 'cluster',
					'label': translation.clusterName[LANG],
					'type': 'select',
					'value': [{'v': '', 'l': ''}],
					'required': true
				},
				{
					'name': 'collection',
					'label': translation.sessionDatabaseCollection[LANG],
					'type': 'text',
					'placeholder': translation.sessionDots[LANG],
					'value': '',
					'tooltip': translation.provideTheSessionDatabaseCollectionName[LANG],
					'required': true
				},
				{
					'name': 'stringify',
					'label': translation.stringified[LANG],
					'type': 'radio',
					'value': [{'v': false, 'selected': true}, {'v': true}],
					'required': true
				},
				{
					'name': 'expireAfter',
					'label': translation.expiresAfter[LANG],
					'type': 'text',
					'tooltip': translation.enterNumberHoursBeforeSessionExpires[LANG],
					'value': '',
					'placeholder': '300...',
					'required': true
				},
				{
					'name': 'store',
					'label': translation.store[LANG],
					'type': 'jsoneditor',
					'height': '200px',
					'value': {},
					'required': true,
					'tooltip': translation.provideTheSessionDatabaseStore[LANG]
				}
			]
		},
		host: {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'number',
					'label': 'Host(s) Number',
					'type': 'number',
					'placeholder': '1',
					'value': 1,
					'tooltip': translation.hostNumber[LANG],
					'fieldMsg': translation.enterHowManyHostsAddForService[LANG],
					'required': true
				},
				{
					'name': 'variables',
					"label": translation.environmentVariables[LANG],
					"type": "textarea",
					"required": false,
					"tooltip": translation.provideOptionalEnvironmentVariablesSeparatedComma[LANG],
					"fieldMsg": "ENV_VAR1=val1,ENV_VAR2=val2,..."
				},
				{
					"name": "defaultENVVAR",
					"type": "html",
					"value": "<p>" + translation.defaultEnvironmentVariables[LANG] + "<br /><ul><li>SOAJS_SRV_AUTOREGISTER=true</li><li>NODE_ENV=production</li><li>SOAJS_ENV=%envName%</li><li>SOAJS_PROFILE=%profilePathToUse%</li></ul></p>"
				}
			]
		},
		deploy: {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'nginx',
					'label': 'Nginx Configuration',
					'type': 'group',
					'description': {
						'type': 'info',
						'content': ""
					},
					'entries': [
						{
							'name': 'nginxDeploymentMode',
							'label': 'Nginx Deployment Mode',
							'type': 'text',
							'value': 'global',
							'disabled': true,
							'required': true,
							'fieldMsg': "Nginx will be deployed as Global/Daemonset mode on each node.<br />This allows nginx to capture the real IP value when requests arrive to the cloud."
						},
						{
							'name': 'nginxMemoryLimit',
							'label': 'Memory Limit Per Instance for Nginx (in MBytes)',
							'type': 'number',
							'value': 500,
							'fieldMsg': 'Set a custom memory limit for Nginx instances',
							'required': false
						},
						{
							'name': 'nginxRecipe',
							'label': 'Nginx Catalog Recipe',
							'type': 'select',
							'value': [],
							'tooltip': 'Specify the catalog recipe to be used when deploying nginx',
							'required': true
						}
					]
				},
				{
					'name': 'controllers',
					'label': 'Controller Configuration',
					'type': 'group',
					'description': {
						'type': 'none',
						'content': ""
					},
					'entries': [
						{
							'name': 'controllerDeploymentMode',
							'label': 'Controller Deployment Mode',
							'type': 'select',
							'value': [
								{l: 'Replicated', v: 'replicated', 'selected': true},
								{l: 'Global', v: 'global'}
							],
							'tooltip': 'Specify the deployment mode',
							'required': true,
							'fieldMsg': "Global/Daemonset mode deploys one replica of the service on each node.<br />Replicated/Deployment mode deploys the specified number of replicas based on the availability of resources."
						},
						{
							'name': 'controllers',
							'label': translation.controller[LANG],
							'type': 'number',
							'value': '',
							'tooltip': translation.chooseHowManyControllersDeploy[LANG],
							'fieldMsg': translation.chooseHowManyControllersDeploy[LANG],
							'required': true
						},
						{
							'name': 'ctrlMemoryLimit',
							'label': 'Memory Limit Per Instance for Controllers (in MBytes)',
							'type': 'number',
							'value': 500,
							'fieldMsg': 'Set a custom memory limit for controller instances',
							'required': false
						},
						{
							'name': 'ctrlRecipe',
							'label': 'Controller Catalog Recipe',
							'type': 'select',
							'value': [],
							'tooltip': 'Specify the catalog recipe to be used when deploying controller',
							'required': true
						}
					]
				}
			]
		},
		uploadCerts: {
			'entries': [
				{
					'name': 'uploadCerts',
					'label': translation.certificates[LANG],
					'type': 'document',
					'tooltip': translation.uploadCertificate[LANG],
					'required': false,
					"limit": 3,
					'fieldMsg': "Upload certificates in .pem format."
				}
			]
		},
		restartHost: {
			'entries': [
				{
					'name': 'branch',
					'label': 'Select branch to be used in order to restart host',
					'type': 'select',
					'tooltip': 'Select Branch',
					'required': true,
					'value': []
				}
			]
		},
		serviceInfo: {
			'entries': [
				{
					'name': 'jsonData',
					'label': '',
					'type': 'jsoneditor',
					'options': {
						'mode': 'view',
						'availableModes': []
					},
					'height': '500px',
					"value": {}
				}
			]
		},
		multiServiceInfo: {
			'entries': [
				{
					'name': 'infoTabs',
					'label': '',
					'type': 'tabset',
					'tabs': []
				}
			]
		},
		node: {
			'entries': [
				{
					'name': 'ip',
					'label': translation.nodeIP[LANG],
					'type': 'text',
					'tooltip': translation.nodeIP[LANG],
					'required': true,
					'value': ''
				},
				{
					'name': 'port',
					'label': translation.nodeDockerPort[LANG],
					'type': 'number',
					'tooltip': translation.nodeDockerPort[LANG],
					'required': true,
					'value': ''
				},
				{
					'name': 'role',
					'label': translation.nodeRole[LANG],
					'type': 'select',
					'value': [
						{l: 'Manager', v: 'manager'},
						{l: 'Worker', v: 'worker', selected: true}
					],
					'tooltip': translation.nodeRole[LANG],
					'required': true
				}
			]
		},
		nodeTag: {
			'entries': [
				{
					'name': 'tag',
					'label': "Service Provider",
					'type': 'uiselect',
					'value': serviceProviders,
					'tooltip': "Select Which Service Provider Hosts this node",
					'required': true,
					"fieldMsg": "Tag your nodes based on which Service Providers they are available at."
				}
			]
		},
		nginxUI: {
			entries: [
				{
					'name': 'content',
					'label': 'Static Content',
					'type': 'select',
					'required': false,
					'value': []
				},
				{
					'name': 'branch',
					'label': 'Branch',
					'type': 'select',
					'required': false,
					'value': []
				},
				{
					'name': 'supportSSL',
					'label': 'Do you want to enable SSL for Nginx?',
					'type': 'radio',
					'value': [{'v': true, 'l': 'Yes'}, {'v': false, 'l': 'No', 'selected': true}],
					'required': false
				},
				{
					'name': 'certType',
					'label': 'Do you want the system to generate self signed certificates?',
					'type': 'radio',
					'value': [{'v': true, 'l': 'Yes', 'selected': true}, {'v': false, 'l': 'No'}],
					'required': false,
					'hidden': true
				},
				{
					'name': 'kubeSecret',
					'label': 'Kubernetes secret',
					'type': 'text',
					'value': null,
					'fieldMsg': 'Provide the kubernetes secret that contains the certificates',
					'required': false,
					'hidden': true
				},
			]
		}
	},

	nginxRequiredCerts: {
		certificate: {
			label: 'Chained Certificate',
			extension: '.crt'
		},
		privateKey: {
			label: 'Private Key',
			extension: '.key',
			msg: 'Key from SSL Provider'
		}
	},

	jsoneditorConfig: {
		'height': '200px'
	},

	permissions: {
		"listEnvironments": ['dashboard', '/environment/list', 'get'],
		"getEnvironment": ['dashboard', '/environment', 'get'],
		"addEnvironment": ['dashboard', '/environment/add', 'post'],
		"deleteEnvironment": ['dashboard', '/environment/delete', 'delete'],
		"editEnvironment": ['dashboard', '/environment/update', 'put'],
		"getEnvironmentProfile": ['dashboard', '/environment/profile', 'get'],
		"tenantKeyUpdate": ['dashboard', '/environment/key/update', 'put'],
		"listHosts": ['dashboard', '/hosts/list', 'get'],
		"cd": ['dashboard', '/cd', 'post'],
		"dbs": {
			"list": ['dashboard', '/environment/dbs/list', 'get'],
			"add": ['dashboard', '/environment/dbs/add', 'post'],
			"delete": ['dashboard', '/environment/dbs/delete', 'delete'],
			"update": ['dashboard', '/environment/dbs/update', 'put'],
			"updatePrefix": ['dashboard', '/environment/dbs/updatePrefix', 'put']
		},
		"platforms": {
			"getEnvironment": ['dashboard', '/environment', 'get']
		},
		"hacloud": {
			"nodes": {
				"list": ['dashboard', '/cloud/nodes/list', 'get'],
				"add": ['dashboard', '/cloud/nodes/add', 'post'],
				"remove": ['dashboard', '/cloud/nodes/remove', 'delete'],
				"update": ['dashboard', '/cloud/nodes/update', 'put'],
				"metrics": ['dashboard', '/cloud/metrics/nodes', 'get']
			},
			"services": {
				"list": ['dashboard', '/cloud/services/list', 'get'],
				"add": ['dashboard', '/cloud/services/soajs/deploy', 'post'],
				"delete": ['dashboard', '/cloud/services/delete', 'delete'],
				"scale": ['dashboard', '/cloud/services/scale', 'put'],
				"redeploy": ['dashboard', '/cloud/services/redeploy', 'put'],
				"logs": ['dashboard', '/cloud/services/instances/logs', 'get'],
				"operation": ['dashboard', '/cloud/services/maintenance', 'post'],
				"deployPlugin": ['dashboard', '/cloud/plugins/deploy', 'post'],
				"autoScale": ['dashboard', '/cloud/services/autoscale', 'put'],
				"metrics": ['dashboard', '/cloud/metrics/services', 'get']
			}
		},
		"git": {
			"listAccounts": ["dashboard", "/gitAccounts/accounts/list", "get"],
			"listAccountRepos": ["dashboard", "/gitAccounts/getRepos", "get"]
		},
		"customRegistry": {
			"list": ["dashboard", "/customRegistry/list", "get"],
			"add": ["dashboard", "/customRegistry/add", "post"],
			"update": ["dashboard", "/customRegistry/update", "put"],
			"upgrade": ["dashboard", "/customRegistry/upgrade", "put"],
			"delete": ["dashboard", "/customRegistry/delete", "delete"]
		}
	},

	providers: serviceProviders,

	recipeTypes: {
		soajs: {
			l: "SOAJS",
			'categories': {
				other: {'l': "Other"}
			}
		},
		database: {
			l: "Database",
			'categories': {
				other: {'l': "Other"}
			}
		},
		nginx: {
			l: "Nginx",
			'categories': {
				other: {'l': "Other"}
			}
		},
		service: {
			'l': "Service",
			'categories': {
				soajs: {
					l: 'SOAJS'
				},
				nodejs: {
					l: 'NodeJs'
				},
				php: {
					l: 'PHP'
				},
				java: {
					l: 'Java'
				},
				asp: {
					l: 'ASP'
				},
				other: {
					l: 'Other'
				}
			}
		},
		daemon: {
			'l': "Daemon",
			'categories': {
				soajs: {
					l: 'SOAJS'
				},
				nodejs: {
					l: 'NodeJs'
				},
				php: {
					l: 'PHP'
				},
				java: {
					l: 'Java'
				},
				asp: {
					l: 'ASP'
				},
				other: {
					l: 'Other'
				}
			}
		},
		cluster: {
			'l': "Cluster",
			'categories': {
				mongo: {'l': "Mongo"},
				elasticsearch: {'l': "ElasticSearch"},
				mysql: {'l': "MySQL"},
				oracle: {'l': "Oracle"},
				other: {'l': "Other"}
			}
		},
		server: {
			'l': "Server",
			'categories': {
				nginx: {
					'l': "Nginx"
				},
				apache: {
					'l': "Apache"
				},
				iis: {
					'l': "IIS"
				},
				other: {
					'l': "Other"
				}
			}
		},
		cdn: {
			'l': "CDN",
			'categories': {
				amazons3: {"l": "Amazon S3"},
				rackspace: {"l": "Rackspace"},
				// cloudflare: {"l": "Cloudflare"},
				other: {"l": "Other"}
			}
		},
		system: {
			'l': "System",
			'categories': {
				other: {"l": "Other"},
				heapster: {"l": "Heapster"}
			}
		},
		other: {
			'l': "Other",
			'categories': {
				other: {'l': "Other"}
			}
		}
	}
};
