"use strict";
var cloudsDeploymentConfig = {
	form: {
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
		},  //
		addSecret: [
			{
				'name': 'secretName',
				'label': 'Name',
				'type': 'text',
				'required': true
			},
			{
				"type": "tabset",
				"tabs": [
					{
						"label": "Text Content",
						"description": "",
						"entries": [
							{
								'name': 'secretLabel',
								'label': 'Label',
								'type': 'text',
								'required': true
							},
							{
								'name': 'textMode',
								'label': 'I am adding a text value',
								'fieldMsg': "Turn on this mode if the value you are about to enter is made up of text only (Default mode does not support text only)",
								'type': 'buttonSlider',
								'value': false,
								'required': true
							},
							{
								'name': 'secretData',
								'value': '',
								'label': 'Secret Content Data',
								'type': 'jsoneditor',
								'required': true,
								'fieldMsg': "Provide the content of the secret as text/json",
								'height': 100
							}
						],
						"onAction": function (id, data, form) {
							form.formData.secretType = "Opaque";
						}
					},
					{
						"label": "File Content",
						"description": "",
						"entries": [
							{
								'name': 'secretLabel',
								'label': 'Label',
								'type': 'text',
								'required': true
							},
							{
								"label": "File Upload",
								"fieldMsg": "Select a file to create the secret content from it",
								'name': 'secretFile',
								"directive": "modules/dashboard/secrets/directives/file.tmpl",
								"required": false
							}
						],
						"onAction": function (id, data, form) {
							form.formData.secretType = "Opaque";
						}
					},
					{
						"label": "Registry Secret",
						"description": "",
						"entries": [
							{
								'type': 'text',
								'value': '',
								'name': 'registryServer',
								'label': 'Registry Server',
								'placeholder': 'https://index.docker.io/v1/',
								'tooltip': "Enter the Registry Server",
								'fieldMsg': "Enter the  Registry Server",
								'required': true
							},
							{
								'type': 'text',
								'value': '',
								'name': 'registryEmail',
								'label': 'registryEmail',
								'placeholder': 'email',
								'tooltip': "Enter your Registry Email",
								'fieldMsg': "Enter the  Registry Email",
								'required': true
							},
							{
								'type': 'text',
								'value': '',
								'name': 'registryUsername',
								'label': 'Registry Username',
								'placeholder': 'username',
								'tooltip': "Enter the Registry Username",
								'fieldMsg': "Enter the  Registry Username",
								'required': true
							},
							{
								'type': 'password',
								'value': '',
								'name': 'registryPassword',
								'label': 'Registry Password',
								'placeholder': 'password',
								'tooltip': "Enter the Registry Password",
								'fieldMsg': "Enter the  Registry Password",
								'required': true
							}
						],
						"onAction": function (id, data, form) {
							form.formData.secretType = "kubernetes.io/dockercfg";
						}
					}
				]
			}
		],
		addVolume: [
			{
				'name': 'name',
				'label': 'Name',
				'type': 'text',
				'required': true,
				'pattern': '^[A-Za-z0-9]+$'
			},
			{
				'name': 'storage',
				'label': 'Storage',
				'fieldMsg': "Size is in GB (GigaBytes)",
				'value': '1',
				'type': 'number',
				'required': true
			},
			{
				'name': 'storageClassName',
				'label': 'Storage Class Name',
				'type': 'text',
				'required': false,
				'pattern': '^[A-Za-z0-9]+$'
			},
			{
				'name': 'accessModes',
				'label': 'Access Modes',
				'type': 'checkbox',
				'required': true,
				'value': [
					{l: 'ReadWriteOnce', v: 'ReadWriteOnce', selected: true},
					{l: 'ReadOnlyMany', v: 'ReadOnlyMany'},
					{l: 'ReadWriteMany', v: 'ReadWriteMany'}
				],
				'tooltip': 'Choose access mode',
				'fieldMsg':
					`<div>ReadWriteOnce – the pvc can be mounted as readwrite by a single node.<br>
					ReadOnlyMany – the pvc can be mounted readonly by many nodes.<br>
					ReadWriteMany – the pvc can be mounted as readwrite by many nodes.</div>`
			},
			{
				'name': 'volumeMode',
				'label': 'Volume Modes',
				'type': 'radio',
				'required': false,
				'value': [
					{l: 'Filesystem', v: 'Filesystem'},
					{l: 'Block', v: 'Block'}
				],
				'tooltip': 'Choose volume mode'
			}
		], //
		addExecCommand :[{
			'name': 'execCommands',
			'label': 'Commands',
			'type': 'textarea',
			'required': true
		},
			{
				'name': 'response',
				'label': 'Response',
				'type': 'textarea',
				'required': false
			}] //
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
	},
};
