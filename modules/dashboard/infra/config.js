'use strict';

let infraConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		activate: ['dashboard', '/infra', 'post'],
		edit: ['dashboard', '/infra', 'put'],
		deactivate: ['dashboard', '/infra', 'del'],
		removeDeployment: ['dashboard', '/infra/deployment', 'del'],
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
		],
		aws: [
			{
				'name': 'label',
				'label': 'Label',
				'type': 'string',
				'value': "",
				'placeholder': 'My AWS Infra Provider',
				'fieldMsg': 'Enter a label for this provider, the accordion in the list will use it.',
				'required': true
			},
			{
				'name': 'keyId',
				'label': 'Key ID',
				'type': 'string',
				'value': "",
				'tooltip': 'Enter your AWS Key Id',
				'fieldMsg': 'Users need an access keys to make programmatic calls to AWS Services using the APIs.',
				'required': true
			},
			{
				'name': 'secretAccessKey',
				'label': 'Secret Access Key',
				'type': 'string',
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
				'type': 'string',
				'value': "",
				'placeholder': 'My Google Infra Provider',
				'fieldMsg': 'Enter a label for this provider, the accordion in the list will use it.',
				'required': true
			},
			{
				'name': 'project',
				'label': 'Project Id',
				'type': 'string',
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
				'type': 'string',
				'value': "",
				'placeholder': 'My Azure Infra Provider',
				'fieldMsg': 'Enter a label for this provider, the accordion in the list will use it.',
				'required': true
			},
			{
				'name': 'clientId',
				'label': 'Client ID',
				'type': 'string',
				'value': "",
				'placeholder': 'Azure Client ID',
				'fieldMsg': 'Client ID is required to communicate with Azure\'s API',
				'required': true
			},
			{
				'name': 'secret',
				'label': 'Client Secret',
				'type': 'string',
				'value': "",
				'placeholder': 'Azure Client Secret',
				'fieldMsg': 'Client Secret is required to communicate with Azure\'s API',
				'required': true
			},
			{
				'name': 'domain',
				'label': 'Tenant ID',
				'type': 'string',
				'value': "",
				'placeholder': 'Application Tenant ID',
				'fieldMsg': 'Enter the ID of the tenant that your application requires to communicate with Azure subscription',
				'required': true
			},
			{
				'name': 'subscriptionId',
				'label': 'Subscription ID',
				'type': 'string',
				'value': "",
				'placeholder': 'Subscription ID',
				'fieldMsg': 'Provide the ID of the subscription you want to use',
				'required': true
			}
		]
	}
};
