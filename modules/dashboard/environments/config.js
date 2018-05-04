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
							"columns": {
								"region": {
									"label": "Region",
									"fields": [
										{
											"name": "region",
											"label": "Region"
										},
										{
											"name": "infraCodeTemplate",
											"label": "Infra Code Template"
										}
									]
								},
								"masternodes": {
									"label": "Master Node(s)",
									"fields": [
										{
											"name": "masterflavor",
											"label": "Flavor"
										},
										{
											"name": "masternumber",
											"label": "Number"
										},
										{
											"name": "masterstorage",
											"label": "Storage"
										},
										{
											"name": "masterstoragetype",
											"label": "Storage Type"
										}
									]
								},
								"workernodes": {
									"label": "Worker Node(s)",
									"fields": [
										{
											"name": "workerflavor",
											"label": "Flavor"
										},
										{
											"name": "workernumber",
											"label": "Number"
										},
										{
											"name": "workerstorage",
											"label": "Storage"
										},
										{
											"name": "workerstoragetype",
											"label": "Storage Type"
										}
									]
								}
							}
						},
						"entries": [
								{
									'name': 'region',
									'label': 'Select a Region',
									'type': 'select',
									'value': [],
									'tooltip': 'Select Deployment Region',
									"fieldMsg": "AWS deployments are based on regions; Regions differ in type & price of machines as well as data transfer charges.",
									'required': true
								},
								{
									"label": "Key Pair",
									"fieldMsg": "Enter the name of an existing EC2 KeyPair to enable SSH access on the instances to be deployed",
									'name': 'keyPair',
									"type": "text",
									"value": "",
									"placeholder": "mykeypair",
									"required": true
								},
								{
									"name": "aws",
									"label": "AWS Extra Settings",
									"type": "group",
									"collapsed": true,
									"entries": [
										{
											"label": "Enable Daily Resource Cleanup",
											"fieldMsg": "Cleans up unused images, containers, networks and volumes",
											'name': 'enableDailyResourceCleanup',
											"type": "select",
											"value": [
												{ "v": true, "l": "Yes" },
												{ "v": false, "l": "No", "selected": true }
											],
											"required": true
										},
										{
											"label": "Use Cloudwatch for Container Logging",
											"fieldMsg": "Send all Container logs to CloudWatch",
											'name': 'cloudwatchContainerLogging',
											"type": "select",
											"value": [
												{ "v": true, "l": "Yes" },
												{ "v": false, "l": "No", "selected": true }
											],
											"required": true
										},
										{
											"label": "Enable Cloudwatch Container Monitoring",
											"fieldMsg": "Enable CloudWatch detailed monitoring for all instances",
											'name': 'cloudwatchContainerMonitoring',
											"type": "select",
											"value": [
												{ "v": true, "l": "Yes" },
												{ "v": false, "l": "No", "selected": true }
											],
											"required": true
										},
										{
											"label": "Enable EBS I/O Optimization",
											"fieldMsg": "Specifies whether the launch configuration is optimized for EBS I/O",
											'name': 'ebsIO',
											"type": "select",
											"value": [
												{ "v": true, "l": "Yes" },
												{ "v": false, "l": "No", "selected": true }
											],
											"required": true
										}
									]
								},
								{
									"name": "masternodes", // cannot edit
									"label": "Master Nodes",
									"type": "group",
									"entries": [
										{
											'name': 'masternumber',
											'label': 'Number',
											'type': 'number',
											'value': 1,
											'placeholder': '1',
											'tooltip': 'Enter how many Master node machine(s) you want to deploy',
											'fieldMsg': 'Enter how many Master node machine(s) you want to deploy',
											'required': true
										},
										{
											'name': 'masterflavor',
											'label': 'Machine Type',
											'type': 'select',
											'value': [
												{
													'v': 't2.medium',
													'l': 'T2 Medium / 2 vCPUs x 4 GiB',
													'selected': true,
													'group': "General Purpose"
												},
												{
													'v': 'c4.large',
													'l': 'C4 Large / 2 vCPUs x 3.75 GiB',
													'group': "Compute Optimized"
												}
											],
											'tooltip': 'Pick the Flavor of your master node machine(s)',
											'fieldMsg': 'Pick the Flavor of your master node machine(s)',
											'required': true,
											'labelDisplay': true
										},
										{
											'name': 'masterstorage',
											'label': 'Storage',
											'type': 'number',
											'value': 30,
											'tooltip': 'Enter the amount of Storage you want for each machine in GB.',
											'fieldMsg': 'Enter the amount of Storage you want for each machine in GB.',
											'required': true
										},
										{
											'name': 'masterstoragetype',
											'label': 'Storage Type',
											'type': 'select',
											'value': [{ 'v': 'gp2', 'l': 'GP2', 'selected': true }, {
												'v': 'standard',
												'l': 'Standard'
											}],
											'tooltip': 'Select the type of Storage Drive Technology',
											'fieldMsg': 'Select the type of Storage Drive Technology',
											'required': true,
											'labelDisplay': true
										}
									]
								},
								{
									"name": "workernodes",
									"label": "Worker Nodes",
									"type": "group",
									"entries": [
										{
											'name': 'workernumber',
											'label': 'Number',
											'type': 'number',
											'value': 1,
											'placeholder': '1',
											'tooltip': 'Enter how many Worker node machine(s) you want to deploy',
											'fieldMsg': 'Enter how many Worker node machine(s) you want to deploy',
											'required': true
										},
										{
											'name': 'workerflavor',
											'label': 'Machine Type',
											'type': 'select',
											'value': [
												{
													'v': 't2.medium',
													'l': 'T2 Medium / 2 vCPUs x 4 GiB',
													'selected': true,
													'group': "General Purpose"
												},
												{ 'v': 't2.large', 'l': 'T2 Large / 2 vCPUs x 8 GiB', 'group': "General Purpose" },
												{
													'v': 't2.xlarge',
													'l': 'T2 XLarge / 4 vCPUs x 16 GiB',
													'group': "General Purpose"
												},
												{
													'v': 't2.2xlarge',
													'l': 'T2 2XLarge / 8 vCPUs x 32 GiB',
													'group': "General Purpose"
												},
												{ 'v': 'm4.large', 'l': 'M4 Large / 2 vCPUs x 8 GiB', 'group': "General Purpose" },
												{
													'v': 'm4.xlarge',
													'l': 'M4 XLarge / 4 vCPUs x 16 GiB',
													'group': "General Purpose"
												},
												{
													'v': 'm4.2xlarge',
													'l': 'M4 2XLarge / 8 vCPUs x 32 GiB',
													'group': "General Purpose"
												},
												{
													'v': 'm4.4xlarge',
													'l': 'M4 4XLarge / 16 vCPUs x 64 GiB',
													'group': "General Purpose"
												},
												
												{
													'v': 'c4.large',
													'l': 'C4 Large / 2 vCPUs x 3.75 GiB',
													'group': "Compute Optimized"
												},
												{
													'v': 'c4.xlarge',
													'l': 'C4 XLarge / 4 vCPUs x 7.5 GiB',
													'group': "Compute Optimized"
												},
												{
													'v': 'c4.2xlarge',
													'l': 'C4 2XLarge / 8 vCPUs x 15 GiB',
													'group': "Compute Optimized"
												},
												{
													'v': 'c4.4xlarge',
													'l': 'C4 4XLarge / 16 vCPUs x 30 GiB',
													'group': "Compute Optimized"
												},
												
												{
													'v': 'r4.large',
													'l': 'R4 Large / 2 vCPUs x 15.25 GiB',
													'group': "Memory Optimized"
												},
												{
													'v': 'r4.xlarge',
													'l': 'R4 XLarge / 4 vCPUs x 30.5 GiB',
													'group': "Memory Optimized"
												},
												{
													'v': 'r4.2xlarge',
													'l': 'R4 2XLarge / 8 vCPUs x 61 GiB',
													'group': "Memory Optimized"
												},
												{
													'v': 'r4.4xlarge',
													'l': 'R4 4XLarge / 16 vCPUs x 122 GiB',
													'group': "Memory Optimized"
												},
												
												{
													'v': 'r3.large',
													'l': 'R3 Large / 2 vCPUs x 15 GiB',
													'group': "Memory Optimized"
												},
												{
													'v': 'r3.xlarge',
													'l': 'R3 XLarge / 4 vCPUs x 30.5 GiB',
													'group': "Memory Optimized"
												},
												{
													'v': 'r3.2xlarge',
													'l': 'R3 2XLarge / 8 vCPUs x 61 GiB',
													'group': "Memory Optimized"
												},
												{
													'v': 'r3.4xlarge',
													'l': 'R3 4XLarge / 16 vCPUs x 122 GiB',
													'group': "Memory Optimized"
												},
												
												{
													'v': 'i3.large',
													'l': 'I3 Large / 2 vCPUs x 15.25 GiB',
													'group': "Storage Optimized"
												},
												{
													'v': 'i3.xlarge',
													'l': 'I3 XLarge / 4 vCPUs x 30.5 GiB',
													'group': "Storage Optimized"
												},
												{
													'v': 'i3.2xlarge',
													'l': 'I3 2XLarge / 8 vCPUs x 61 GiB',
													'group': "Storage Optimized"
												},
												{
													'v': 'i3.4xlarge',
													'l': 'I3 4XLarge / 16 vCPUs x 122 GiB',
													'group': "Storage Optimized"
												}
											
											],
											'tooltip': 'Pick the Flavor of your worker node machine(s)',
											'fieldMsg': 'Pick the Flavor of your worker node machine(s)',
											'required': true,
											'labelDisplay': true
										},
										{
											'name': 'workerstorage',
											'label': 'Storage',
											'type': 'number',
											'value': 30,
											'tooltip': 'Enter the amount of Storage you want for each machine in GB.',
											'fieldMsg': 'Enter the amount of Storage you want for each machine in GB.',
											'required': true
										},
										{
											'name': 'workerstoragetype',
											'label': 'Storage Type',
											'type': 'select',
											'value': [{ 'v': 'gp2', 'l': 'GP2', 'selected': true }, {
												'v': 'standard',
												'l': 'Standard'
											}],
											'tooltip': 'Select the type of Storage Drive Technology',
											'fieldMsg': 'Select the type of Storage Drive Technology',
											'required': true,
											'labelDisplay': true
										}
									]
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
							"columns": {
								"region": {
									"label": "Region",
									"fields": [
										{
											"name": "region",
											"label": "Region"
										},
										{
											"name": "infraCodeTemplate",
											"label": "Infra Code Template"
										}
									]
								},
								"workernodes": {
									"label": "Worker Node(s)",
									"fields": [
										{
											"name": "workerflavor",
											"label": "Flavor"
										},
										{
											"name": "workernumber",
											"label": "Number"
										}
									]
								}
							}
						},
						"entries": [
							{
								'name': 'region',
								'label': 'Select a Region',
								'type': 'select',
								'value': [],
								'tooltip': 'Select Deployment Region',
								'required': true,
								"fieldMsg": "Google Cloud deployments are based on regions; Regions differ in type & price of machines as well as data transfer charges."
							},
							{
								"name": "workernodes",
								"label": "Worker Nodes",
								"type": "group",
								"entries": [
									{
										'name': 'workernumber',
										'label': 'Number',
										'type': 'number',
										'value': 1,
										'placeholder': '1',
										'tooltip': 'Enter how many Worker node machine(s) you want to deploy',
										'required': true,
										'fieldMsg': 'Specify how many Work node machine(s) you want your deployment to include upon creation.'
									},
									{
										'name': 'workerflavor',
										'label': 'Machine Type',
										'type': 'select',
										'value': [
											{
												'v': 'n1-standard-2',
												'l': 'N1 Standard 2 / 2 vCPUs x 7.5 GiB',
												'selected': true,
												'group': "General Purpose"
											},
											{
												'v': 'n1-standard-4',
												'l': 'N1 Standard 4 / 4 vCPUs x 15 GiB',
												'group': "General Purpose"
											},
											{
												'v': 'n1-standard-8',
												'l': 'N1 Standard 8 / 8 vCPUs x 30 GiB',
												'group': "General Purpose"
											},
											{
												'v': 'n1-standard-16',
												'l': 'N1 Standard 16 / 16 vCPUs x 60 GiB',
												'group': "General Purpose"
											},
											
											{
												'v': 'n1-highcpu-4',
												'l': 'N1 HighCPU 4 / 4 vCPUs x 3.6 GiB',
												'group': "Compute Optimized"
											},
											{
												'v': 'n1-highcpu-8',
												'l': 'N1 HighCPU 8 / 8 vCPUs x 7.2 GiB',
												'group': "Compute Optimized"
											},
											{
												'v': 'n1-highcpu-16',
												'l': 'N1 HighCPU 16 / 16 vCPUs x 14.4 GiB',
												'group': "Compute Optimized"
											},
											
											{
												'v': 'n1-highmem-2',
												'l': 'N1 HighMEM 2 / 2 vCPUs x 13 GiB',
												'group': "Memory Optimized"
											},
											{
												'v': 'n1-highmem-4',
												'l': 'N1 HighMEM 4 / 4 vCPUs x 26 GiB',
												'group': "Memory Optimized"
											},
											{
												'v': 'n1-highmem-8',
												'l': 'N1 HighMEM 8 / 8 vCPUs x 52 GiB',
												'group': "Memory Optimized"
											},
											{
												'v': 'n1-highmem-16',
												'l': 'N1 HighMEM 16 / 16 vCPUs x 104 GiB',
												'group': "Memory Optimized"
											}
										],
										'tooltip': 'Pick the Flavor of your worker node machine(s)',
										'required': true,
										'fieldMsg': 'Pick a Machine flavor from CPU & RAM to apply to all your worker node machine(s).'
									}
								]
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
				mysql: {'l': "SQL"},
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
