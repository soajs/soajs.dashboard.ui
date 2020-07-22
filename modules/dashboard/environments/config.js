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
					deploy: {
						entries: []
					}
				}
			}
		},
		docker: {
			ui: {
				form: {
					deploy: {
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
	
	predefinedPortalTemplateName: "SOAJS Portal Environment",
	
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
							'value': 0,
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
							'value': 0,
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
		},
		addResource: {
			entries: [
				{
					'name': 'type',
					'label': "Resource Type",
					'type': 'select',
					'fieldMsg': "Pick the type of resource you want to create depending on its purpose.",
					'value': [],
					'required': true
				},
				{
					'name': 'category',
					'label': "Resource Category",
					'type': 'select',
					'value': [],
					'required': true,
					'hidden': true
				}
			],
			data: {
				types: [
					{'v': 'cluster', 'l': "Cluster"},
					//{'v': 'server', 'l': "Server"},
					{'v': 'cdn', 'l': "CDN"},
					{'v': 'system', 'l': "System"},
					{'v': 'authorization', 'l': "Authorization"},
					{'v': 'other', 'l': "Other"}
				],
				categories: [
					{'v': 'mongo', 'l': "Local/External Mongo", "group": "cluster"},
					{'v': 'elasticsearch', 'l': "Local/External ElasticSearch", "group": "cluster"},
					
					{'v': 'objectrocket_mongo', 'l': "Object Rocket - Mongo SAAS", "group": "cluster"},
					{'v': 'objectrocket_elasticsearch', 'l': "Object Rocket - ElasticSearch SAAS", "group": "cluster"},
					
					{'v': 'mysql', 'l': "MySQL", "group": "cluster"},
					{'v': 'sql', 'l': "SQL", "group": "cluster"},
					{'v': 'oracle', 'l': "Oracle", "group": "cluster"},
					{'v': 'other', 'l': "Other", "group": "cluster"},
					
					{'v': 'nginx', 'l': "Nginx", "group": "server"},
					{'v': 'apache', 'l': "Apache", "group": "server"},
					{'v': 'iis', 'l': "IIS", "group": "server"},
					{'v': 'other', 'l': "Other", "group": "server"},
					
					{'v': 'amazons3', 'l': "Amazon S3", "group": "cdn"},
					{'v': 'rackspace', 'l': "Rackspace", "group": "cdn"},
					{'v': 'other', 'l': "Other", "group": "cdn"},
					
					{'v': 'other', 'l': "Other", "group": "system"},
					
					{'v': 'basicauth', 'l': "Basic Auth", "group": "authorization"},
					{'v': 'soapbasicauth', 'l': "SOAP Basic Auth", "group": "authorization"},
					{'v': 'digestauth', 'l': "Digest Auth", "group": "authorization"},
					{'v': 'oauth1', 'l': "Oauth 1", "group": "authorization"},
					{'v': 'oauth2', 'l': "Oauth 2", "group": "authorization"},
					{'v': 'hawkauth', 'l': "Hawk Auth", "group": "authorization"},
					{'v': 'awssignature', 'l': "AWS Signature", "group": "authorization"},
					{'v': 'custom', 'l': "Custom", "group": "authorization"},
					
					{'v': 'other', 'l': "Other", "group": "other"}
				]
			}
		},
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
		
		kubernetes: {
			secret: {
				"list": ['infra', "/kubernetes/configurations/Secret", "get"],
				"addItem": ['infra', "/kubernetes/configuration/Secret", "post"],
				"add": ["infra", "/kubernetes/secret", "post"],
				"addRegistry": ["infra", "/kubernetes/secret/registry", "post"],
				"delete": ["infra", "/kubernetes/Secret", "delete"],
			},
			pvc: {
				"list": ['infra', "/kubernetes/storages/PVC", "get"],
				"addItem": ['infra', "/kubernetes/storage/PVC", "post"],
				"add": ["infra", "/kubernetes/pvc", "post"],
				"delete": ["infra", "/kubernetes/storage/PVC", "delete"],
			},
			pv: {
				"list": ['infra', "/kubernetes/storages/PV", "get"],
				"addItem": ['infra', "/kubernetes/storage/PV", "post"],
				"edit": ["infra", "/kubernetes/storage/PV", "put"],
				"delete": ["infra", "/kubernetes/storage/PV", "delete"],
			},
			service: {
				"list": ['infra', "/kubernetes/services/Service", "get"],
				"addItem": ['infra', "/kubernetes/service/Service", "post"],
				"edit": ["infra", "/kubernetes/service/Service", "put"],
				"delete": ["infra", "/kubernetes/service/Service", "delete"],
			},
			deployment: {
				"list": ['infra', "/kubernetes/workloads/Deployment", "get"],
				"addItem": ['infra', "/kubernetes/workload/Deployment", "post"],
				"edit": ["infra", "/kubernetes/workload/Deployment", "put"],
				"delete": ["infra", "/kubernetes/workload/Deployment", "delete"],
			},
			daemonSet: {
				"list": ['infra', "/kubernetes/workloads/DaemonSet", "get"],
				"addItem": ['infra', "/kubernetes/resources/DaemonSet", "post"],
				"edit": ["infra", "/kubernetes/workload/DaemonSet", "put"],
				"delete": ["infra", "/kubernetes/resource/DaemonSet", "delete"],
			},
			cronJob: {
				"list": ['infra', "/kubernetes/workloads/CronJob", "get"],
				"addItem": ['infra', "/kubernetes/workload/CronJob", "post"],
				"edit": ["infra", "/kubernetes/workload/CronJob", "put"],
				"delete": ["infra", "/kubernetes/workload/CronJob", "delete"],
			},
			hpa: {
				"list": ['infra', "/kubernetes/workloads/HPA", "get"],
				"addItem": ['infra', "/kubernetes/workload/HPA", "post"],
				"edit": ["infra", "/kubernetes/workload/HPA", "put"],
				"delete": ["infra", "/kubernetes/workload/HPA", "delete"],
			},
			storageClass: {
				"list": ['infra', "/kubernetes/storages/StorageClass", "get"],
				"addItem": ['infra', "/kubernetes/storage/StorageClass", "post"],
				"edit": ["infra", "/kubernetes/storage/StorageClass", "put"],
				"delete": ["infra", "/kubernetes/storage/StorageClass", "delete"],
			},
			pod: {
				"list": ['infra', "/kubernetes/workloads/Pod", "get"],
				"addItem": ['infra', "/kubernetes/workload/Pod", "post"],
				"delete": ['infra', "/kubernetes/pods", "delete"],
				"singleExec": ['infra', "/kubernetes/pod/exec", "put"],
				"multipleExec": ['infra', "/kubernetes/pods/exec", "put"],
				"logs": ['infra', "/kubernetes/pod/log", "get"],
				"metrics": ['infra', "/kubernetes/pods/metrics", "get"],
			},
			node: {
				"list": ['infra', "/kubernetes/clusters/Node", "get"],
			},
			clusterRole: {
				"list": ['infra', "/kubernetes/rbacs/ClusterRole", "get"],
				"addItem": ['infra', "/kubernetes/rbac/ClusterRole", "post"],
				"delete": ["infra", "/kubernetes/rbac/ClusterRole", "delete"],
			},
			clusterRoleBinding: {
				"list": ['infra', "/kubernetes/rbacs/ClusterRoleBinding", "get"],
				"addItem": ['infra', "/kubernetes/rbac/ClusterRoleBinding", "post"],
				"delete": ["infra", "/kubernetes/rbac/ClusterRoleBinding", "delete"],
			},
			roleBinding: {
				"list": ['infra', "/kubernetes/rbacs/RoleBinding", "get"],
				"addItem": ['infra', "/kubernetes/rbac/RoleBinding", "post"],
				"delete": ["infra", "/kubernetes/rbac/RoleBinding", "delete"],
			},
			apiService: {
				"list": ['infra', "/kubernetes/rbacs/APIService", "get"],
				"addItem": ['infra', "/kubernetes/rbac/APIService", "post"],
				"delete": ["infra", "/kubernetes/rbac/APIService", "delete"],
			},
			serviceAccount: {
				"list": ['infra', "/kubernetes/rbacs/ServiceAccount", "get"],
				"addItem": ['infra', "/kubernetes/rbac/ServiceAccount", "post"],
				"delete": ["infra", "/kubernetes/rbac/ServiceAccount", "delete"],
			}
		},
		
		//resources
		"listResources": ['dashboard', '/resources', 'get'],
		"addResources": ['dashboard', '/resources', 'post'],
		"updateResources": ['dashboard', '/resources/update', 'put'],
		"deleteResources": ['dashboard', '/resources', 'delete'],
		"upgradeResources": ['dashboard', '/resources/upgrade', 'get'],
		"getConfig": ['dashboard', '/resources/config', 'get'],
		"setConfig": ['dashboard', '/resources/config/update', 'put'],
		
		
		"listEnvironments": ['console', '/environment', 'get'],
		"getEnvironment": ['console', '/environment', 'get'],
		"addEnvironment": ['console', '/environment', 'post'],
		"deleteEnvironment": ['console', '/environment', 'delete'],
		"editEnvironment": ['console', '/environment', 'put'],
		
		"editRegistry": ['console', '/registry', 'put'],
		
		
		"getEnvironmentProfile": ['dashboard', '/environment/profile', 'get'],
		"tenantKeyUpdate": ['dashboard', '/environment/key/update', 'put'],
		"listHosts": ['dashboard', '/hosts/list', 'get'],
		"startHost": ['dashboard', '/hosts/start', 'post'],
		"stopHost": ['dashboard', '/hosts/stop', 'post'],
		"cd": ['dashboard', '/cd', 'post'],
		"dbs": {
			"list": ['console', '/registry', 'get'],
			"add": ['console', '/registry/db/custom', 'post'],
			"delete": ['console', '/registry/db/custom', 'delete'],
			"update": ['console', '/environment/dbs/update', 'put'],
			"updatePrefix": ['console', '/registry/db/prefix', 'put']
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
			"getEnvironment": ['console', '/registry/deployer', 'get'],
			
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
			"list": ["console", "/registry/custom", "get"],
			"add": ["console", "/registry/custom", "post"],
			"update": ["console", "/registry/custom", "put"],
			"delete": ["console", "/registry/custom", "delete"],
			"editAcl": ["console", "/registry/custom/acl", "put"],
		},
		"resource": {
			"list": ["console", "/registry/resource", "get"],
			"add": ["console", "/registry/resource", "post"],
			"update": ["console", "/registry/resource", "put"],
			"delete": ["console", "/registry/resource", "delete"],
			"editAcl": ["console", "/registry/resource/acl", "put"],
		}
	},
	
	providers: serviceProviders,
};

var iconsAllowed = {
	'heartbeat': 'icon icon-heart',
	'awareness': 'icon icon-connection',
	'registry': 'icon icon-undo',
	'provision': 'icon icon-download3',
	'info': 'icon icon-search',
	'statistic': 'icon-stats-dots',
	'Configuration': 'icon icon-equalizer'
};
