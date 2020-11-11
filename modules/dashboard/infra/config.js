/*
 *  **********************************************************************************
 *   (C) Copyright Herrontech (www.herrontech.com)
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   Contributors:
 *   -
 *  **********************************************************************************
 */

'use strict';

let infraConfig = {
	permissions: {
		list: ['infra', '/account/kubernetes', 'get'],
		activate: ['infra', '/account/kubernetes', 'post'],
		edit: ['infra', '/account/kubernetes/configuration', 'put'],
		deactivate: ['infra', '/account/kubernetes', 'delete'],
		editACL: ['infra', '/account/kubernetes/acl', 'put'],
	},
	
	logos: {
		google: 'modules/dashboard/infra/main/images/google.png',
		aws: 'modules/dashboard/infra/main/images/aws.png',
		azure: 'modules/dashboard/infra/main/images/azure.png',
		docker: 'themes/default/img/docker_logo.png',
		kubernetes: 'themes/default/img/kubernetes_logo.png'
	},
	
	form: {
		providers: [
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
			}
		],
		technologies: [
			{
				'name': 'kubernetes',
				'type': 'html',
				'value': "<img height='32' src=\"modules/dashboard/infra/main/images/kubernetes.png\">&nbsp; Kubernetes Cluster"
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
				'fieldMsg': 'Provide the docker token and allow SOAJS to communicate with your docker deployment. <a href=\'https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/600539248/How+to+Get+Docker+Token\' target=\'_blank\'>Click Here</a> to learn how to create & get an authentication token for docker swarm',
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
				'name': 'url',
				'label': 'Kubernetes IP Address',
				'type': 'text',
				'value': "",
				'placeholder': '192.168.99.100',
				'fieldMsg': 'Provide the machine ip address of your local docker deployment',
				'required': true
			},
			{
				'name': 'description',
				'label': 'Description',
				'type': 'text',
				'value': "",
				'fieldMsg': 'Provide a description about this driver.',
				'required': false
			},
			{
				'name': 'port',
				'label': 'Kubernetes Port',
				'type': 'number',
				'value': "",
				'placeholder': 443,
				'fieldMsg': 'Provide the port kubernetes is using on this machine.',
				'required': true
			},
			{
				'name': 'token',
				'label': 'Kubernetes Token',
				'type': 'textarea',
				'value': "",
				'fieldMsg': 'The Kubernetes token. Must be provided to allow communication.',
				'required': true
			},
			{
				'name': 'ca',
				'label': 'Certificate information',
				'type': 'jsoneditor',
				'value': "",
				'required': false,
				'fieldMsg': 'The the Kubernetes certificate json object. It is optional but must be provided to create secure communication.',
				'height': 200
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
				'fieldMsg': 'Users need an access keys to make programmatic calls to AWS Services using the APIs, <a href="https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/729710593/AWS" target="_blank">Learn More</a>',
				'required': true
			},
			{
				'name': 'secretAccessKey',
				'label': 'Secret Access Key',
				'type': 'text',
				'value': "",
				'tooltip': 'Enter your AWS secretAccessKey',
				'fieldMsg': 'Secret Access Keys work in conjunction with Key ID to authorize calls made to AWS APIs. <a href="https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/729710593/AWS" target="_blank">Learn More</a>',
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
				'fieldMsg': 'Google Cloud allows deployment within already created projects only. Enter the Google Project Name you which to use for your deployments, <a href="https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/729546773/Google+Cloud" target="_blank">Learn More</a>',
				'required': true
			},
			{
				'name': 'token',
				'label': 'Token',
				'type': 'jsoneditor',
				'height': '200px',
				'value': "",
				'tooltip': 'Enter the token associated with this project',
				'fieldMsg': 'Tokens allow you to communicate with Google Cloud APIs to manage your deployments. Generate a Key Token in Google Cloud IAM / Service Accounts section and copy it here, <a href="https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/729546773/Google+Cloud" target="_blank">Learn More</a>',
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
				'fieldMsg': 'Client ID is required to communicate with Azure\'s API, <a href="https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/729579529/Microsoft+Azure" target="_blank">Learn More</a>',
				'required': true
			},
			{
				'name': 'secret',
				'label': 'Client Secret',
				'type': 'text',
				'value': "",
				'placeholder': 'Azure Client Secret',
				'fieldMsg': 'Client Secret is required to communicate with Azure\'s API, <a href="https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/729579529/Microsoft+Azure" target="_blank">Learn More</a>',
				'required': true
			},
			{
				'name': 'domain',
				'label': 'Tenant ID',
				'type': 'text',
				'value': "",
				'placeholder': 'Application Tenant ID',
				'fieldMsg': 'Enter the ID of the tenant that your application requires to communicate with Azure subscription, <a href="https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/729579529/Microsoft+Azure" target="_blank">Learn More</a>',
				'required': true
			},
			{
				'name': 'subscriptionId',
				'label': 'Subscription ID',
				'type': 'text',
				'value': "",
				'placeholder': 'Subscription ID',
				'fieldMsg': 'Provide the ID of the subscription you want to use, <a href="https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/729579529/Microsoft+Azure" target="_blank">Learn More</a>',
				'required': true
			}
		]
	}
};
