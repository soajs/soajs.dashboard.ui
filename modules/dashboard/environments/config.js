"use strict";
var serviceProviders = {
	aws: {
		docker: {
			ui: {
				"form": {
					"scale": {
						"entries": [
							{
								'name': 'number',
								'label': 'Worker Node(s)',
								'type': 'number',
								'value': 0,
								'tooltip': 'Enter the number of Worker Node(s) to scale your deployment to',
								'fieldMsg': 'AWS only supports scaling the worker nodes in Docker, enter the number you wish to scale to.',
								'placeholder': '1',
								'required': true
							}
						]
					},
					"deploy": {
						"grid": {
							"columns": {}
						},
						"entries": []
					}
				}
			}
		},
		terraform: {
			ui: {
				"form": {
					"deploy": {
						"grid": {
							"columns": {}
						},
						"entries": [
							{
								'name': 'name',
								'label': 'VM Layer Name',
								'type': 'text',
								'value': '',
								'tooltip': 'Provide a name for your VM Layer',
								'required': true,
								"fieldMsg": "Enter a name that will be used as a reference for this VM Layer"
							}
						]
					}
				}
			}
		}
	},
	google: {
		kubernetes: {
			ui: {
				"form": {
					"scale": {
						"entries": [
							{
								'name': 'number',
								'label': 'Worker Node(s)',
								'type': 'number',
								'value': 0,
								'tooltip': 'Enter the number of Worker Node(s) to scale your deployment to',
								'fieldMsg': 'Google Cloud only supports scaling the worker nodes in Kubernetes, enter the number you wish to scale to.',
								'placeholder': '1',
								'required': true
							}
						]
					},
					"deploy": {
						"grid": {
							"columns": {}
						},
						"entries": []
					}
				}
			}
		}
	},
	azure: {
		terraform: {
			ui: {
				"form": {
					"deploy": {
						"grid": {
							"columns": {}
						},
						"entries": [
							{
								'name': 'name',
								'label': 'VM Layer Name',
								'type': 'text',
								'value': '',
								'tooltip': 'Provide a name for your VM Layer',
								'required': true,
								"fieldMsg": "Enter a name that will be used as a reference for this VM Layer"
							}
						]
					}
				}
			}
		}
	},
	local: {
		kubernetes: {
			ui: {
				form: {
					deploy:{
						entries: []
					}
				}
			}
		},
		docker: {
			ui: {
				form: {
					deploy:{
						entries: []
					}
				}
			}
		}
	}
};

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
		},
		throttling: {
			entries: [
				{
					name: 'name',
					label: 'Strategy Name',
					type: 'text',
					value: '',
					placeholder: 'my_strategy',
					fieldMsg: 'Provide a name for your strategy',
					required: true
				},
				{
					name: 'type',
					label: 'Select Strategy Type',
					type: 'select',
					value: [
						{
							v: 0,
							l: 'Per Tenant',
							selected: true
						},
						{
							v: 1,
							l: 'Per Tenant & Per IP Address',
							selected: true
						}
					],
					fieldMsg: 'Select how this strategy should behave, per tenant OR per tenant and per IPAddress',
					required: true
				},
				{
					name: 'window',
					label: "Window (msec)",
					type: 'number',
					min: 0,
					value: 0,
					placeholder: 0,
					fieldMsg: 'Enter the throttling window size in milliseconds',
					required: true
				},
				{
					name: 'limit',
					label: "Limit",
					type: 'number',
					min: 0,
					value: 0,
					placeholder: 0,
					fieldMsg: 'Enter the maximum limit of quota per time before rejecting requests',
					required: true
				},
				{
					name: 'retries',
					label: "Number of Retries",
					type: 'number',
					min: 0,
					value: 0,
					placeholder: 0,
					fieldMsg: 'Enter the number of retries for queuing requests',
					required: true
				},
				{
					name: 'delay',
					label: "Delay (msec)",
					type: 'number',
					min: 0,
					value: 0,
					placeholder: 0,
					fieldMsg: 'Enter the delay number in milliseconds',
					required: true
				},
				{
					name: 'tip',
					type: 'html',
					value: "<br /><p class='fieldMsg'>If you are not familiar with how API Traffic Throttling works, <a href='https://soajsorg.atlassian.net/wiki/spaces/SOAJ/pages/679641089/API+Traffic+Throttling' target='_blank'>Click Here</a></p>"
				}
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
		"startHost": ['dashboard', '/hosts/start', 'post'],
		"stopHost": ['dashboard', '/hosts/stop', 'post'],
		"cd": ['dashboard', '/cd', 'post'],
		"dbs": {
			"list": ['dashboard', '/environment/dbs/list', 'get'],
			"add": ['dashboard', '/environment/dbs/add', 'post'],
			"delete": ['dashboard', '/environment/dbs/delete', 'delete'],
			"update": ['dashboard', '/environment/dbs/update', 'put'],
			"updatePrefix": ['dashboard', '/environment/dbs/updatePrefix', 'put']
		},
		"vm": {
			"list": ['dashboard', '/cloud/vm/list', 'get'],
			"create": ['dashboard', '/cloud/vm', 'post'],
			"modify": ['dashboard', '/cloud/vm', 'put'],
			"delete": ['dashboard', '/cloud/vm', 'delete'],
			"deleteInstance": ['dashboard', '/cloud/vm/instance', 'delete'],
			"maintenance": ['dashboard', '/cloud/vm/maintenance', 'post'],
			"logs": ['dashboard', '/cloud/vm/logs', 'post']
		},
		"platforms": {
			"getEnvironment": ['dashboard', '/environment', 'get'],
			"attachContainer": ['dashboard', '/environment/platforms/attach', 'post'],
			"detachContainer": ['dashboard', '/environment/platforms/detach', 'delete'],
			"createContainer": ['dashboard', '/environment/platforms/createContainer', 'post'],
			"deleteContainer": ['dashboard', '/environment/platforms/deleteContainer', 'delete']
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
				sql: {'l': "SQL"},
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
