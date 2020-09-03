'use strict';

let catalogAppConfig = {
	form: {
		add: {
			entries: [
				{
					'name': 'template',
					'label': 'Existing Recipe Template',
					'type': 'select',
					'value': [],
					'required': true
				}
			],
			new: [
				{
					'name': 'type',
					'label': "Recipe Type",
					'type': 'select',
					'tooltip': "Choose the Type of Recipe you want to create",
					'fieldMsg': "Pick the type of recipes you want to create depending on what you are aiming to deploy.",
					'value' :[
						{'v': 'soajs', 'l': "soajs"},
						{'v': 'api', 'l': "api"},
						{'v': 'daemon', 'l': "daemon"},
						{'v': 'resource', 'l': "resource"},
						{'v': 'static', 'l': "frontend"},
						{'v': 'other', 'l': "other"}
					],
					'required': true
				}
			],
			categories: {
				'name': 'subtype',
				'label': "Category",
				'type': 'text',
				'value': '',
				'required': true,
				'tooltip': 'Enter a category for your recipe',
				'fieldMsg': "Enter a category for your recipe. Ex: archive",
				"placeholder": "category"
			}
		},

		entries: [
			{
				'name': 'name',
				'label': 'Recipe Name',
				'type': 'text',
				'value': '',
				'required': true,
				'tooltip': 'Enter a name for your recipe',
				'fieldMsg': "Enter a name for your recipe",
				"placeholder": "My Recipe ..."
			},
			{
				'name': 'description',
				'label': 'Recipe Description',
				'type': 'text',
				'value': '',
				'required': false,
				'tooltip': 'Enter a description for your recipe',
				'fieldMsg': "Enter a description for your recipe",
				"placeholder": "My Recipe Description ..."
			},
			{
				'name': 'type',
				'label': 'Recipe Type',
				'type': 'text',
				'value': '',
				'required': true,
				'readonly': true
			},
			{
				'name': 'subtype',
				'label': 'Category',
				'type': 'text',
				'value': '',
                'fieldMsg' : 'To Learn more about Catalog Recipes, <a target="_blank" href = "https://soajsorg.atlassian.net/wiki/spaces/SOAJ/pages/62493834/Catalog+Recipes">Click Here</a>',
				'readonly': true
			},
			{
				'type': 'html',
				'value': '<hr><h2>Deploy Options</h2>'
			},
			{
				'type': 'tabset',
				'tabs': [
					{
						'label': 'Image',
						'entries': [
							{
								'name': 'imageBinary',
								'label': 'Binary',
								'type': 'buttonSlider',
								"value": false,
								'tooltip': "Enable/Disable deploying image with source code",
								'fieldMsg': "Enable/Disable deploying image with source code",
							},
							{
								'type': 'text',
								'value': '',
								'label': 'Image Prefix',
								'name': 'imagePrefix',
								'placeholder': 'soajsorg',
								'tooltip': "Enter the Image Prefix",
								'fieldMsg': "Enter the Image Prefix",
								'required': false
							},
							{
								'type': 'text',
								'value': '',
								'label': 'Image Name',
								'name': 'imageName',
								'placeholder': 'ImageName',
								'tooltip': "Enter the Image Name",
								'fieldMsg': "Enter the Image Name",
								'required': true
							},
							{
								'type': 'text',
								'value': '',
								'name': 'imageTag',
								'label': 'Image Tag',
								'placeholder': 'latest',
								'tooltip': "Enter the Image Tag",
								'fieldMsg': "Enter the Image Tag",
								'required': false
							},
							{
								'type': 'select',
								'label': 'Image Repository Type',
								'name': 'imageRepositoryType',
								'value': [
									{'v': 'public', 'l': 'Public', 'selected': true},
									{'v': 'private', 'l': 'Private'},
								],
								'tooltip': "Select the Update Image Policy",
								'fieldMsg': "Select the Update Image Policy",
								'required': false
							},
							{
								'type': 'select',
								'label': 'Image Pull Policy',
								'name': 'imagePullPolicy',
								'value': [
									{'v': 'IfNotPresent', 'l': 'IfNotPresent', 'selected': true},
									{'v': 'Always', 'l': 'Always'},
									{'v': 'Never', 'l': 'Never'}
								],
								'tooltip': "Select the Update Image Policy",
								'fieldMsg': "Select the Update Image Policy",
								'required': false
							},
							{
								'type': 'select',
								'label': 'Override Image during Deployment',
								'name': 'imageOverride',
								'value': [
									{'v': 'false', 'l': 'No', 'selected': true},
									{'v': 'true', 'l': 'Yes'},
								],
								'tooltip': "Define if the Image can be overridden while deploying service(s) from it",
								'fieldMsg': "Define if the Image can be overridden while deploying service(s) from it",
								'required': false
							},
							{
								'type': 'text',
								'value': '/bin/bash',
								'name': 'imageShell',
								'label': 'Image Shell Type',
								'placeholder': '/bin/bash',
								'tooltip': "Enter the Shell Type the Image Runs",
								'fieldMsg': "A shell is the user's interface to access an operating system's services. Enter the Shell Type the Image Runs:<br>Examples : /bin/bash, /bin/sh<br>  By default, SOAJS sets it as /bin/bash.",
								'required': false
							},
						]
					},
					{
                        'label': 'Source Code',
                        'name': 'Repositories',
                        "type": "group",
                        'entries': [],
					},
					{
						'label': 'Readiness',
						'entries': [
							{
								'name': 'readinessProbe',
								'label': 'Readiness Probe',
								'type': 'jsoneditor',
								'value': '',
								'required': false,
								'tooltip': 'Configure Readiness Probe, Kubernetes Only.',
								'fieldMsg': 'Configure Readiness Probe, Kubernetes Only.',
								'height': 200
							}
						]
					},
					{
						'label': 'Liveness',
						'entries': [
							{
								'name': 'livenessProbe',
								'label': 'Liveness Probe',
								'type': 'jsoneditor',
								'value': '',
								'required': false,
								'tooltip': 'Configure Liveness Probe, Kubernetes Only.',
								'fieldMsg': 'Configure Liveness Probe, Kubernetes Only.',
								'height': 200
							}
						]
					},
					{
						'label': 'Container',
						'entries': [
							{
								'type': 'text',
								'value': '',
								'label': 'Docker Swarm Network',
								'name': 'network',
								'placeholder': 'soajsnet',
								'tooltip': "Enter the Docker Swarm network name to use",
								'fieldMsg': "Enter the Docker Swarm network name to use",
								'required': false
							},
							{
								'type': 'text',
								'value': '',
								'label': 'Default Working Directory',
								'name': 'workingDir',
								'placeholder': '/opt/soajs/deployer/',
								'tooltip': "Enter a default working directory to use connected to the container via SSH",
								'fieldMsg': "Enter a default working directory to use connected to the container via SSH",
								'required': false
							},
                            {
                                'type': 'text',
                                'value': '',
                                'label': 'Restart Condition',
                                'name': 'condition',
                                'placeholder': 'any',
                                'tooltip': "Define the condition that docker base the restart container policy upon",
                                'fieldMsg': "Define the condition that docker base the restart container policy upon",
                                'required': false
                            },
                            {
                                'type': 'number',
                                'value': '',
                                'label': 'Maximum Restart Attempts',
                                'name': 'maxAttempts',
                                'placeholder': '5',
                                'tooltip': "Define how many times docker should restart the container after failure",
                                'fieldMsg': "Define how many times docker should restart the container after failure",
                                'required': false
                            }
						]
					},
					{
						'label': 'Voluming',
						'entries': [
							{
								'type': 'html',
								'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add Volume'/>",
								'name': 'addVolume'
							}
						]
					},
					{
						'label': 'Ports',
                        'description': {
                            'type': "info",
                            'content': 	"<p>Expose ports to access deployments created from this recipe directly using either <b>Load Balancer</b> or <b>Specific Port</b> strategies.<br />" +
                            "<b>Load Balancer</b> &raquo; { name: 'http', target: 80, isPublished: true, preserveClientIP: true }<br />" +
                            "<b>Specific Port</b> &raquo; { name: 'http', target: 80, isPublished: true, published: 30080, preserveClientIP: true }" +
                            "</p><br />" +
							"<label>If you wish to use a <b>Specific Port</b>, make sure that the published port is within these ranges:</label><br />" +
							"<ul>" +
							"<li>If you wish to use specific port, kubernetes only allows port to be published between 30000 & 32767 </li>" +
							"</ul>"
                        },
						'entries': [
							{
								'type': 'html',
								'value': "<input type='button' class='btn btn-sm btn-success f-right exposeNewPort' value='Expose New Port'/>",
								'name': 'addPort'
							}
						]
					},
					{
						'label': 'Labels',
						'entries': [
							{
								'type': 'html',
								'value': "<input type='button' class='btn btn-sm btn-success f-right exposeNewPort' value='Add New Labels'/>",
								'name': 'addLabel'
							}
						]
					},
					{
						'label': 'Exec',
						'entries': [
							{
								'type': 'html',
								'value': "<input type='button' class='btn btn-sm btn-success f-right exposeNewPort' value='Add Exec Commands'/>",
								'name': 'addExecCommands'
							}
						]
					}
				],
			},
			{
				'type': 'html',
				'value': '<hr><h2>Build Options</h2>'
			},
			{
				'type': 'tabset',
				'tabs': [
					{
						'label': 'Service',
						'entries': [
							{
								'name': 'command',
								'label': 'Container Command',
								'type': 'text',
								'value': '',
								'placeholder': 'bash',
								'required': false,
								'tooltip': "Enter the command that the container should run once the container of this service is created.",
								'fieldMsg': "Enter the command that the container should run once the container of this service is created."
							},
							{
								'name': 'arguments',
								'label': 'Command Arguments',
								'type': 'textarea',
								'value': '',
								'placeholder': '-c\nnode . -T service',
								'required': false,
								'tooltip': "Provide the arguments for the Container Command; one argument per line",
								'fieldMsg': "Provide the arguments for the Container Command; one argument per line"
							},
						]
					},
					{
						'label': 'Environment Variables',
						'entries': [
							{
								'type': 'html',
								'name': 'addEnvVar',
								'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add Environment Variable'/>"
							}
						]
					}
				]
			}
		],

		envVars: {
			'name': 'envVarGroup',
			'type': 'group',
			'label': "New Variable",
			'icon': 'minus',
			'entries': [
				{
					'type': 'html',
					'value': '',
				},
				{
					'name': 'envVarName',
					'label': 'Variable Name',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter the name of your environment variable',
					'fieldMsg': 'Enter the name of your environment variable',
					"placeholder": "MY_ENV_VAR"
				},
				{
					'name': 'envVarType',
					'label': 'Variable Type',
					'type': 'select',
					'value': [
						{'v': 'computed', 'l': "Computed", 'selected': true},
						{'v': 'static', 'l': "Static"},
						{'v': 'secret', 'l': "Secret"},
						{'v': 'userInput', 'l': "User Input"}
					],
					'required': true,
					'tooltip': 'Select a type for your variable',
					'fieldMsg': 'Select a type for your variable'
				},
				{
					'name': 'envVarRemove',
					'type': 'html',
					'value': "<span class='icon icon-cross'></span>"
				}
			]
		},

		computedVar: {
			'name': 'computedVar',
			'label': 'Computed Variable',
			'type': 'select',
			'groups': ['NodeJs', 'SOAJS Service', 'SOAJS Daemon', 'SOAJS Service/Daemon', 'SOAJS Deployer', 'SOAJS GCS', 'GIT Information', 'SOAJS Mongo', 'SOAJS Nginx'],
			'value':[
				{'v': '$SOAJS_SRV_PORT', 'l': "$SOAJS_SRV_PORT", "group": "SOAJS Service"},
				{'v': '$SOAJS_SRV_PORT_MAINTENANCE', 'l': "$SOAJS_SRV_PORT_MAINTENANCE", "group": "SOAJS Service"},

				{'v': '$SOAJS_DAEMON_GRP_CONF', 'l': "$SOAJS_DAEMON_GRP_CONF", "group": "SOAJS Daemon"},

				{'v': '$SOAJS_ENV', 'l': "$SOAJS_ENV", "group": "SOAJS Service/Daemon"},
				{'v': '$SOAJS_PROFILE', 'l': "$SOAJS_PROFILE", "group": "SOAJS Service/Daemon"},

				{'v': '$SOAJS_SERVICE_NAME', 'l': "$SOAJS_SERVICE_NAME", "group": "SOAJS Service/Daemon"},

				{'v': '$SOAJS_DEPLOY_HA', 'l': "$SOAJS_DEPLOY_HA", "group": "SOAJS Deployer"},
				{'v': '$SOAJS_CONTROLLER_PORT_MAINTENANCE', 'l': "$SOAJS_CONTROLLER_PORT_MAINTENANCE", "group": "SOAJS Deployer"},
				{'v': '$SOAJS_REGISTRY_API', 'l': "$SOAJS_REGISTRY_API", "group": "SOAJS Deployer"},

				{'v': '$SOAJS_GIT_OWNER', 'l': "$SOAJS_GIT_OWNER", "group": "GIT Information"},
				{'v': '$SOAJS_GIT_BRANCH', 'l': "$SOAJS_GIT_BRANCH", "group": "GIT Information"},
				{'v': '$SOAJS_GIT_COMMIT', 'l': "$SOAJS_GIT_COMMIT", "group": "GIT Information"},
				{'v': '$SOAJS_GIT_REPO', 'l': "$SOAJS_GIT_REPO", "group": "GIT Information"},
				{'v': '$SOAJS_GIT_TOKEN', 'l': "$SOAJS_GIT_TOKEN", "group": "GIT Information"},
				{'v': '$SOAJS_GIT_PROVIDER', 'l': "$SOAJS_GIT_PROVIDER", "group": "GIT Information"},
				{'v': '$SOAJS_GIT_DOMAIN', 'l': "$SOAJS_GIT_DOMAIN", "group": "GIT Information"},

				{'v': '$SOAJS_EXTKEY', 'l': "$SOAJS_EXTKEY", "group": "SOAJS Nginx"},
				{'v': '$SOAJS_NX_DOMAIN', 'l': "$SOAJS_NX_DOMAIN", "group": "SOAJS Nginx"},
				{'v': '$SOAJS_NX_API_DOMAIN', 'l': "$SOAJS_NX_API_DOMAIN", "group": "SOAJS Nginx"},
				{'v': '$SOAJS_NX_SITE_DOMAIN', 'l': "$SOAJS_NX_SITE_DOMAIN", "group": "SOAJS Nginx"},
				{'v': '$SOAJS_NX_CONTROLLER_IP', 'l': "$SOAJS_NX_CONTROLLER_IP", "group": "SOAJS Nginx"},
				{'v': '$SOAJS_NX_CONTROLLER_PORT', 'l': "$SOAJS_NX_CONTROLLER_PORT", "group": "SOAJS Nginx"}
			],
			'required': true,
			'tooltip': 'Select which entry this variable should be mapped to.',
			'fieldMsg': 'Select which entry this variable should be mapped to.'
		},
		
		secretVar: {
			'type': 'group',
			'name': 'secretVar',
			'label': 'Secret Variable Options',
			'icon': 'minus',
			'entries': [
				{
					'name': 'secretName',
					'label': 'Default Secret Variable Name',
					'type': 'text',
					'value': '',
					'required': false,
					'tooltip': 'Enter the default secret name for your environment variable',
					'fieldMsg': 'Enter the default secret name for your environment variable',
					"placeholder": "secret"
				},
				{
					'name': 'secretKey',
					'label': 'Secret Variable Key',
					'type': 'text',
					'value': '',
					'required': false,
					'tooltip': 'Enter a default secret key your environment variable',
					'fieldMsg': 'Enter a default secret key of your environment variable',
					"placeholder": "key"
				}
			]
		},
		
		staticVar: {
			'name': 'staticVar',
			'label': 'Static Variable Value',
			'type': 'text',
			'value': '',
			'required': true,
			'tooltip': 'Enter the value of your environment variable',
			'fieldMsg': 'Enter the value of your environment variable',
			"placeholder": "My Var Value"
		},

		userInputVar: {
			'type': 'group',
			'name': 'userInputVar',
			'label': 'User Input Variable Options',
			'icon': 'minus',
			'entries': [
				{
					'name': 'userInputLabel',
					'label': 'User Input Variable Label',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter the label for your environment variable',
					'fieldMsg': 'Enter the label for your environment variable',
					"placeholder": "My Var Label"
				},
				{
					'name': 'userInputDefault',
					'label': 'User Input Variable Default Value',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter a default value of your environment variable',
					'fieldMsg': 'Enter a default value of your environment variable',
					"placeholder": "My Var Value"
				},
				{
					'name': 'userInputFieldMsg',
					'label': 'User Input Variable Tip',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter a tip message for your environment variable',
					'fieldMsg': 'Enter a tip message for your environment variable',
					"placeholder": "My Var Tip Message"
				}
			]
		},

		volumeInput: {
			'name': 'volumeGroup',
			"type": "group",
			"label": "New Volume",
			"entries": [
				{
					'name': 'docker',
					'label': 'Docker Volume',
					'type': 'jsoneditor',
					'value': '',
					'required': true,
					'tooltip': 'Enter the docker configuration.',
					'fieldMsg': "<div class='fieldMsg'>For more info about Docker volumes click <a target='_blank'  href='https://soajsorg.atlassian.net/wiki/spaces/SOAJ/pages/62493834/Catalog+Recipes#CatalogRecipes-dockerVoluming'>Here</a></div>",
					'height': 100
				},
				{
					'name': 'kubernetes',
					'label': 'Kubernetes Volume',
					'type': 'jsoneditor',
					'value': '',
					'required': true,
					'tooltip': 'Enter the Kubernetes configuration; Volume and Volume mount.',
					'fieldMsg': "<div class='fieldMsg'>For more info about Kubernetes volumes click <a target='_blank'  href='https://soajsorg.atlassian.net/wiki/spaces/SOAJ/pages/62493834/Catalog+Recipes#CatalogRecipes-kubernetesVoluming'>Here</a></div>",
					'height': 100
				},
				{
					'type': 'html',
					'name': 'rVolume',
					'value': '<span class="icon icon-cross"></span>'
				}
			]
		},

		portInput: {
			'name': 'portGroup',
			'type': 'group',
			'label': 'New Port',
			'entries': [
				{
					'name': 'port',
					'label': 'Port',
					'type': 'jsoneditor',
					'value': '',
					'required': true,
					'tooltip': 'Enter the port configuration.',
					'height': 100
				},
				{
					'type': 'html',
					'name': 'rPort',
					'value': '<span class="icon icon-cross"></span>'
				}
			]
		},

		labelInput: {
			'name': 'labelGroup',
			'type': 'group',
			'label': 'New Label',
			'entries': [
				{
					'name': 'labelName',
					'label': 'Label Name',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter the name of the label',
					'fieldMsg': 'Enter the name of the label',
					'placeholder': "My Label"
				},
				{
					'name': 'labelValue',
					'label': 'Label Value',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter the value of the label',
					'fieldMsg': 'Enter the value of the label',
					'placeholder': "My Label Value"
				},
				{
					'type': 'html',
					'name': 'rLabel',
					'value': '<span class="icon icon-cross"></span>'
				}
			]
		},
		execCommand: {
			'name': 'ExecCommandGroup',
			'type': 'group',
			'label': 'New Exec Command',
			'entries': [
				{
					'name': 'ExeclabelName',
					'label': 'Exec Command Label',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter the label of the Exec Command',
					'fieldMsg': 'Enter the name of the Exec Command ',
					'placeholder': "My Label"
				},
				{
					'name': 'ExeclabelValue',
					'label': 'Exec Command Value',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter the value of the Exec Command',
					'fieldMsg': 'Enter the value of the Exec Command',
					'placeholder': "My command"
				},
				{
					'type': 'html',
					'name': 'execLabel',
					'value': '<span class="icon icon-cross"></span>'
				}
			]
		}
	},
	templates: {
		recipe: {
			"name": "",
			"type": "",
			"description": "",
			"recipe": {
				"deployOptions": {
					"image": {
						"prefix": "",
						"name": "",
						"tag": "",
						"pullPolicy": "",
						"override": false
					},
					"readinessProbe": {
						"httpGet": {
							"path": "",
							"port": ""
						},
						"initialDelaySeconds": 0,
						"timeoutSeconds": 0,
						"periodSeconds": 0,
						"successThreshold": 0,
						"failureThreshold": 0
					},
					"livenessProbe": {
						"httpGet": {
							"path": "",
							"port": ""
						},
						"initialDelaySeconds": 0,
						"timeoutSeconds": 0,
						"periodSeconds": 0,
						"successThreshold": 0,
						"failureThreshold": 0
					},
					"ports": [],
					"voluming": [],
					"restartPolicy": {
						"condition": "",
						"maxAttempts": 0
					},
					"container": {
						"network": "",
						"workingDir": ""
					}
				},
				"buildOptions": {
					"env": {},
					"cmd": {
						"deploy": {
							"command": [],
							"args": []
						}
					}
				}
			}
		}
	},
	permissions: {
		list: ['marketplace', '/recipes', 'get'],
		add: ['marketplace', '/recipe', 'post'],
		update: ['marketplace', '/recipe', 'put'],
		delete: ['marketplace', '/recipe', 'delete'],
		import: ['dashboard', '/templates/import', 'post'],
		export: ['dashboard', '/templates/export', 'post']
	}

};
