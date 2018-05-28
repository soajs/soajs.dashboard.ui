'use strict';

let infraConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		activate: ['dashboard', '/infra', 'post'],
		edit: ['dashboard', '/infra', 'put'],
		deactivate: ['dashboard', '/infra', 'del'],
		removeDeployment: ['dashboard', '/infra/deployment', 'del'],
		removeTemplates: ['dashboard', '/infra/template', 'del'],
		addTEmplate: ['dashboard', '/infra/template', 'post'],
	},

	form: {
		providers :[
			{
				'name': 'google',
				'type': 'html',
				'value': "<img height='32' src=\"modules/dashboard/environments/images/google.png\">&nbsp; Google Cloud"
			},
			{
				'name': 'aws',
				'type': 'html',
				'value': "<img height='32' src=\"modules/dashboard/environments/images/aws.png\">&nbsp; Amazon Web Services"
			},
			{
				'name': 'azure',
				'type': 'html',
				'value': "<img height='32' src=\"modules/dashboard/environments/images/azure.png\">&nbsp; Microsoft Azure"
			},
			{
				'name': 'docker',
				'type': 'html',
				'value': "<img height='32' src=\"themes/default/img/docker_logo.png\">&nbsp; Docker Machine"
			},
			{
				'name': 'kubernetes',
				'type': 'html',
				'value': "<img height='32' src=\"themes/default/img/kubernetes_logo.png\">&nbsp; Kubernetes Machine"
			}
		],
		docker: [
			{
				'name': 'label',
				'label': 'Label',
				'type': 'text',
				'value': "",
				'placeholder': 'Docker Machine',
				'fieldMsg': 'Enter a label for this provider, the accordion in the list will use it.',
				'required': true
			},
			{
				'name': 'ipaddress',
				'label': 'Machine IP Address',
				'type': 'text',
				'value': "",
				'placeholder': '127.0.0.1',
				'fieldMsg': 'Provide the machine ip address of your local docker deployment',
				'required': true
			},
			{
				'name': 'token',
				'label': 'Docker Token',
				'type': 'textarea',
				'value': "",
				'fieldMsg': 'Provide the docker token and allow SOAJS to communicate with your docker deployment',
				'required': true
			}
		],
		kubernetes: [
			{
				'name': 'label',
				'label': 'Label',
				'type': 'text',
				'value': "",
				'placeholder': 'Kubernetes Machine',
				'fieldMsg': 'Enter a label for this provider, the accordion in the list will use it.',
				'required': true
			},
			{
				'name': 'ipaddress',
				'label': 'Kubernetes IP Address',
				'type': 'text',
				'value': "",
				'placeholder': '192.168.99.100',
				'fieldMsg': 'Provide the machine ip address of your local docker deployment',
				'required': true
			},
			{
				'name': 'port',
				'label': 'Kubernetes Port',
				'type': 'text',
				'value': "",
				'placeholder': '6443',
				'fieldMsg': 'Provide the port kubernetes is using on this machine.',
				'required': true
			},
			{
				'name': 'token',
				'label': 'Kubernetes Token',
				'type': 'textarea',
				'value': "",
				'fieldMsg': 'Provide the Kubernetes token and allow SOAJS to communicate with your Kubernetes deployment',
				'required': true
			}
		],

		aws: [
			{
				'name': 'label',
				'label': 'Label',
				'type': 'text',
				'value': "",
				'placeholder': 'My AWS Infra Provider',
				'fieldMsg': 'Enter a label for this provider, the accordion in the list will use it.',
				'required': true
			},
			{
				'name': 'keyId',
				'label': 'Key ID',
				'type': 'text',
				'value': "",
				'tooltip': 'Enter your AWS Key Id',
				'fieldMsg': 'Users need an access keys to make programmatic calls to AWS Services using the APIs.',
				'required': true
			},
			{
				'name': 'secretAccessKey',
				'label': 'Secret Access Key',
				'type': 'text',
				'value': "",
				'tooltip': 'Enter your AWS secretAccessKey',
				'fieldMsg': 'Secret Access Keys work in conjunction with Key ID to authorize calls made to AWS APIs.',
				'required': true
			}
		],
		google: [
			{
				'name': 'label',
				'label': 'Label',
				'type': 'text',
				'value': "",
				'placeholder': 'My Google Infra Provider',
				'fieldMsg': 'Enter a label for this provider, the accordion in the list will use it.',
				'required': true
			},
			{
				'name': 'project',
				'label': 'Project Id',
				'type': 'text',
				'value': "",
				'tooltip': 'Enter your Google Project Id',
				'fieldMsg': 'Google Cloud allows deployment within already created projects only. Enter the Google Project Name you which to use for your deployments.',
				'required': true
			},
			{
				'name': 'token',
				'label': 'Token',
				'type': 'jsoneditor',
				'height': '200px',
				'value': "",
				'tooltip': 'Enter the token associated with this project',
				'fieldMsg': 'Tokens allow you to communicate with Google Cloud APIs to manage your deployments. Generate a Key Token in Google Cloud IAM / Service Accounts section and copy it here.',
				'required': true
			}
		],
		azure: [
			{
				'name': 'label',
				'label': 'Label',
				'type': 'text',
				'value': "",
				'placeholder': 'My Azure Infra Provider',
				'fieldMsg': 'Enter a label for this provider, the accordion in the list will use it.',
				'required': true
			},
			{
				'name': 'clientId',
				'label': 'Client ID',
				'type': 'text',
				'value': "",
				'placeholder': 'Azure Client ID',
				'fieldMsg': 'Client ID is required to communicate with Azure\'s API',
				'required': true
			},
			{
				'name': 'secret',
				'label': 'Client Secret',
				'type': 'text',
				'value': "",
				'placeholder': 'Azure Client Secret',
				'fieldMsg': 'Client Secret is required to communicate with Azure\'s API',
				'required': true
			},
			{
				'name': 'domain',
				'label': 'Tenant ID',
				'type': 'text',
				'value': "",
				'placeholder': 'Application Tenant ID',
				'fieldMsg': 'Enter the ID of the tenant that your application requires to communicate with Azure subscription',
				'required': true
			},
			{
				'name': 'subscriptionId',
				'label': 'Subscription ID',
				'type': 'text',
				'value': "",
				'placeholder': 'Subscription ID',
				'fieldMsg': 'Provide the ID of the subscription you want to use',
				'required': true
			}
		],

		templates: [
			{
				'name': 'name',
				'label': 'Name',
				'type': 'text',
				'value': "",
				'placeholder': 'My Template',
				'fieldMsg': 'Enter a name for your template',
				'required': true
			},
			{
				'name': 'description',
				'label': 'Description',
				'type': 'textarea',
				'value': "",
				'placeholder': 'My Template Description',
				'fieldMsg': 'Provide  a description for your template',
				'required': false
			},
			{
				'name': 'location',
				'label': 'Location',
				'type': 'select',
				'value': [],
				'fieldMsg': 'Select where to store this template.',
				'required': true
			},
			{
				'name': 'driver',
				'label': 'Driver',
				'type': 'select',
				'value': [],
				'fieldMsg': 'Select where to store this template.',
				'required': true
			}
		]
	}
};
