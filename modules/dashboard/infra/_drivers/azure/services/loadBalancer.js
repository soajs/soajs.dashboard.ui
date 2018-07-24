"use strict";

var closeModalUsingJs;

var azureInfraLoadBalancerSrv = soajsApp.components;
azureInfraLoadBalancerSrv.service('azureInfraLoadBalancerSrv', ['ngDataApi', '$localStorage', '$timeout', '$modal', '$window', '$cookies', 'Upload', function (ngDataApi, $localStorage, $timeout, $modal, $window, $cookies, Upload) {

	let infraLoadBalancerConfig = {
		permissions: {
			list: ['dashboard', '/infra', 'get'],
			removeLoadBalancer: ['dashboard', '/infra/extra', 'delete'],
			addLoadBalancer: ['dashboard', '/infra/extra', 'post'],
			editLoadBalancer: ['dashboard', '/infra/extra', 'put']
		},

		form: {
			addLoadBalancer: [
				{
					'name': 'name',
					'label': 'Name',
					'type': 'text',
					'value': "",
					'placeholder': 'My Load Balancer',
					'fieldMsg': 'Enter a name for the load balancer',
					'required': true
				},
				{
					'name': 'region',
					'label': 'Region',
					'type': 'readonly',
					'value': "",
					'fieldMsg': 'Region where the resource group will be located',
					'required': true
				},
				{
					'type': 'group',
					'label': 'Address Pools',
					'entries': [
						{
							'type': 'html',
							'name': 'addAddressPool',
							'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add Address Pool'/>"
						}
					]
				},
				{
					'type': 'group',
					'label': 'IP Rules',
					'entries': [
						{
							'type': 'html',
							'name': 'ipRule',
							'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add IP Rule'/>"
						}
					]
				}
			],

			addressPoolInput: {
				'name': 'addressPoolGroup',
				'type': 'group',
				'label': 'New Address Pool ',
				'entries': [
					{
						'name': 'addressPoolName',
						'label': 'Address Pool Name',
						'type': 'text',
						'value': '',
						'required': true,
						'tooltip': 'Enter a name for the address pool',
						'fieldMsg': 'Enter a name for the address pool',
						'placeholder': "My Address Pool",
						'onAction': function(name, value, form) {
							let tempArray = [];
							for (let i = 0; i < form.addressPoolCounter; i++) {
								if (form.formData['addressPoolName'+i]) {
									tempArray.push({
										'v': form.formData['addressPoolName'+i],
										'l': form.formData['addressPoolName'+i]
									});
								}
							}
							form.availableAddressPools = angular.copy(tempArray);

							form.entries[3].entries.forEach((oneIPRuleGroup) => {
								if (['ipRuleGroup'].indexOf(oneIPRuleGroup.name)) {
									if (oneIPRuleGroup.entries && oneIPRuleGroup.entries[6] && oneIPRuleGroup.entries[6].entries) {
										oneIPRuleGroup.entries[6].entries.forEach((oneEntry) => {
											if(oneEntry.entries && oneEntry.entries[1]) {
												oneEntry.entries[1].value = form.availableAddressPools;
											}
										});
									}
								}
							});
						}
					},
					{
						'type': 'html',
						'name': 'rAddressPool',
						'value': '<span class="icon icon-cross"></span>'
					}
				]
			},

			ipRuleInput: {
				'name': 'ipRuleGroup',
				'type': 'group',
				'label': 'New IP Rule ',
				'entries': [
					{
						'name': 'ipRuleName',
						'label': 'IP Rule Name',
						'type': 'text',
						'value': '',
						'required': true,
						'tooltip': 'Enter a name for the IP rule',
						'fieldMsg': 'Enter a name for the IP rule',
						'placeholder': "My IP Rule"
					},
					{
						'name': 'privateIpAllocationMethod',
						'label': 'Private IP Allocation Method',
						'type': 'select',
						'value': [
							{
								'l': 'Static',
								'v': 'static'
							},
							{
								'l': 'Dynamic',
								'v': 'dynamic'
							}
						],
						'required': true,
						'tooltip': 'Select a public IP allocation mehod',
						'fieldMsg': 'Select a public IP allocation mehod',
						onAction: function (name, value, form) {
							let ipRulesGroup = form.entries.find((oneEntry) => {
								return oneEntry.label === 'IP Rules';
							});
							if (ipRulesGroup && ipRulesGroup.entries) {
								let currentRule = ipRulesGroup.entries.find((oneEntry) => {
									return oneEntry.name.replace('ipRuleGroup', '') === name.replace('privateIpAllocationMethod', '');
								});
								if (currentRule && currentRule.entries) {
									let privateIpField = currentRule.entries.find((oneEntry) => {
										if(oneEntry.name.indexOf('privateIpAddress') !== -1){
											return oneEntry;
										}
									});

									privateIpField.value = '';
									privateIpField.hidden = (value === 'dynamic');
									privateIpField.required = (value !== 'dynamic');
								}
							}
						}
					},
					{
						'name': 'privateIpAddress',
						'label': 'Private IP Address',
						'type': 'text',
						'value': '',
						'required': false,
						'hidden': true,
						'tooltip': 'Enter a private IP address',
						'fieldMsg': 'Enter a private IP address',
						'placeholder': ""
					},
					{
						'name': 'isPublic',
						'label': 'I want the IP to be public',
						'fieldMsg': "Turn this slider on to make the IP public",
						'type': 'buttonSlider',
						'value': false,
						'required': true,
						onAction: function (name, value, form) {
							let ipRulesGroup = form.entries.find((oneEntry) => {
								return oneEntry.label === 'IP Rules';
							});

							if (ipRulesGroup && ipRulesGroup.entries) {
								let currentRule = ipRulesGroup.entries.find((oneEntry) => {
									return oneEntry.name.replace('ipRuleGroup', '') === name.replace('isPublic', '');
								});
								if (currentRule && currentRule.entries) {
									let publicIpField = currentRule.entries.find((oneEntry) => {
										if(oneEntry.name.indexOf('publicIpAddressId') !== -1){
											return oneEntry;
										}

									});
									let subnetIdField = currentRule.entries.find((oneEntry) => {
										if(oneEntry.name.indexOf('subnetId') !== -1){
											return oneEntry;
										}
									});
									publicIpField.hidden = !value;
									subnetIdField.hidden = value;

									publicIpField.required = value;
									subnetIdField.required = !value;
								}
							}
						}
					},
					{
						'name': 'publicIpAddressId',
						'label': 'Public IP Address',
						'type': 'select',
						'value': [],
						'required': false,
						'hidden': true,
						'tooltip': 'Choose a public IP address',
						'fieldMsg': 'Choose a public IP address'
					},
					{
						'name': 'subnetId',
						'label': 'Subnet',
						'type': 'select',
						'value': [],
						'required': false,
						'tooltip': 'Choose a subnet for the IP address',
						'fieldMsg': 'Choose an existing subnet for the IP address'
					},
					{
						'type': 'group',
						'label': 'Ports',
						'entries': [
							{
								'type': 'html',
								'name': 'port',
								'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add Port'/>"
							}
						]
					},
					{
						'type': 'group',
						'label': 'NAT Rules',
						'entries': [
							{
								'type': 'html',
								'name': 'natRule',
								'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add NAT Rule'/>"
							}
						]
					},
					{
						'type': 'group',
						'label': 'NAT Pools',
						'entries': [
							{
								'type': 'html',
								'name': 'natPool',
								'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add NAT Pool'/>"
							}
						]
					},
					{
						'type': 'html',
						'name': 'rIpRule',
						'value': '<span class="icon icon-cross"></span>'
					}
				]
			},

			portsInput: {
				'name': 'ipRulePortsGroup',
				'type': 'group',
				'label': 'New Port ',
				'entries': [
					{
						'name': 'portName',
						'label': 'Port Name',
						'type': 'text',
						'value': '',
						'required': true,
						'tooltip': 'Enter a name for the port',
						'fieldMsg': 'Enter a name for the port',
						'placeholder': "My Port"
					},
					{
						'name': 'portAddressPoolName',
						'label': 'Address Pool',
						'type': 'select',
						'value': [],
						'required': true,
						'tooltip': '',
						'fieldMsg': ''
					},
					{
						'name': 'portProtocol',
						'label': 'Protocol',
						'type': 'select',
						'value': [{'v': 'tcp','l': 'TCP', 'selected': true}, {'v': 'udp', 'l': 'UDP'}, {'v': '*', 'l': 'Any'}],
						'required': true,
						'tooltip': 'Select the port Protocol',
						'fieldMsg': 'Select the port Protocol'
					},
					{
						'name': 'portPublished',
						'label': 'Source Value',
						'type': 'number',
						'value': 0,
						'placeholder': '80',
						'required': true,
						'tooltip': 'Select the source port value',
						'fieldMsg': 'Select the source port value'
					},
					{
						'name': 'portTarget',
						'label': 'Destination Value',
						'type': 'number',
						'value': 0,
						'placeholder': '80',
						'required': true,
						'tooltip': 'Select the destination port value',
						'fieldMsg': 'Select the destination port value'
					},
					{
						'name': 'portIdleTimeout',
						'label': 'Idle Timeout in Seconds',
						'type': 'number',
						'value': 1,
						'placeholder': '1',
						'required': true,
						'tooltip': '',
						'fieldMsg': 'Idle timeout should be 240 and 1800'
					},
					{
						'name': 'portEnableFloatingIP',
						'label': 'Enable Floating IP',
						'type': 'select',
						'value': [{'v': false,'l': 'NO', 'selected': true}, {'v': true, 'l': 'YES'}],
						'placeholder': '1',
						'required': true,
						'tooltip': '',
						'fieldMsg': ''
					},
					{
						'name': 'portLoadDistribution',
						'label': 'Load Distrubution',
						'type': 'select',
						'value': [
							{
								'v': 'default',
								'l': 'Default'
							},
							{
								'v': 'sourceIP',
								'l': 'Source IP'
							},
							{
								'v': 'sourceIPProtocol',
								'l': 'Source IP Protocol'
							}
						],
						'required': true,
						'tooltip': '',
						'fieldMsg': ''
					},
					{
						'name': 'portHealthProbePort',
						'label': 'Health Probe Port',
						'type': 'number',
						'value': '',
						'required': false,
						'fieldMsg': ''
					},
					{
						'name': 'portHealthProbeProtocol',
						'label': 'Health Probe Port Protocol',
						'type': 'select',
						'value': [
							{
								'v': 'http',
								'l': 'HTTP'
							},
							{
								'v': 'https',
								'l': 'HTTPS'
							},
							{
								'v': 'tcp',
								'l': 'TCP'
							}
						],
						'required': true,
						'fieldMsg': ''
					},
					{
						'name': 'portHealthProbeRequestPath',
						'label': 'Health Probe Request Path',
						'type': 'text',
						'value': '',
						'required': true,
						'fieldMsg': ''
					},
					{
						'name': 'portMaxFailureAttempts',
						'label': 'Max Failure Attempts',
						'type': 'number',
						'value': '',
						'required': false,
						'fieldMsg': ''
					},
					{
						'name': 'portHealthProbeInterval',
						'label': 'Health Probe Interval',
						'type': 'number',
						'value': '',
						'required': false,
						'fieldMsg': ''
					},
					{
						'type': 'html',
						'name': 'rIPRulePort',
						'value': '<span class="icon icon-cross"></span>'
					}
				]
			},

			NATRule: {
				'name': 'ipRuleNATRuleGroup',
				'type': 'group',
				'label': 'New NAT Rule ',
				'entries': [
					{
						'name': 'natRuleName',
						'label': 'Rule Name',
						'type': 'text',
						'value': '',
						'required': true,
						'tooltip': 'Enter a name for the rule',
						'fieldMsg': 'Enter a name for the rule',
						'placeholder': "My NAT Rule"
					},
					{
						'name': 'natRuleProtocol',
						'label': 'Protocol',
						'type': 'select',
						'value': [{'v': 'tcp','l': 'TCP', 'selected': true}, {'v': 'udp', 'l': 'UDP'}, {'v': '*', 'l': 'Any'}],
						'required': true,
						'tooltip': 'Select the rule Protocol',
						'fieldMsg': 'Select the rule Protocol'
					},
					{
						'name': 'natRuleFrontendPort',
						'label': 'Frontend Port',
						'type': 'number',
						'value': 0,
						'placeholder': '80',
						'required': true,
						'tooltip': 'Select the frontend port value',
						'fieldMsg': 'Select the frontend port value'
					},
					{
						'name': 'natRuleBackendPort',
						'label': 'Backend Port',
						'type': 'number',
						'value': 0,
						'placeholder': '80',
						'required': true,
						'tooltip': 'Select the backend port value',
						'fieldMsg': 'Select the backend port value'
					},
					{
						'name': 'natRuleIdleTimeout',
						'label': 'Idle Timeout in Seconds',
						'type': 'number',
						'value': 1,
						'placeholder': '1',
						'required': true,
						'tooltip': '',
						'fieldMsg': 'Idle timeout should be 240 and 1800'
					},
					{
						'name': 'natRuleEnableFloatingIP',
						'label': 'Enable Floating IP',
						'type': 'select',
						'value': [{'v': false,'l': 'NO', 'selected': true}, {'v': true, 'l': 'YES'}],
						'placeholder': '1',
						'required': true,
						'tooltip': '',
						'fieldMsg': ''
					},
					{
						'type': 'html',
						'name': 'rIPRuleNatRule',
						'value': '<span class="icon icon-cross"></span>'
					}
				]
			},

			NATPool: {
				'name': 'ipRuleNATPoolGroup',
				'type': 'group',
				'label': 'New NAT Pool ',
				'entries': [
					{
						'name': 'natPoolName',
						'label': 'Pool Name',
						'type': 'text',
						'value': '',
						'required': true,
						'tooltip': 'Enter a name for the pool',
						'fieldMsg': 'Enter a name for the Pool',
						'placeholder': "My NAT Pool"
					},
					{
						'name': 'natPoolProtocol',
						'label': 'Protocol',
						'type': 'select',
						'value': [{'v': 'tcp','l': 'TCP', 'selected': true}, {'v': 'udp', 'l': 'UDP'}, {'v': '*', 'l': 'Any'}],
						'required': true,
						'tooltip': 'Select the pool Protocol',
						'fieldMsg': 'Select the pool Protocol'
					},
					{
						'name': 'natPoolFrontendPort',
						'label': 'Frontend Port Range',
						'type': 'text',
						'value': '80-81',
						'placeholder': '80-81',
						'required': true,
						'tooltip': 'Select the frontend port range',
						'fieldMsg': 'Select the frontend port range'
					},
					{
						'name': 'natPoolBackendPort',
						'label': 'Backend Port',
						'type': 'number',
						'value': 0,
						'placeholder': '80',
						'required': true,
						'tooltip': 'Select the backend port value',
						'fieldMsg': 'Select the backend port value'
					},
					{
						'name': 'natPoolIdleTimeout',
						'label': 'Idle Timeout in Seconds',
						'type': 'number',
						'value': 1,
						'placeholder': '1',
						'required': true,
						'tooltip': '',
						'fieldMsg': 'Idle timeout should be 240 and 1800'
					},
					{
						'name': 'natPoolEnableFloatingIP',
						'label': 'Enable Floating IP',
						'type': 'select',
						'value': [{'v': false,'l': 'NO', 'selected': true}, {'v': true, 'l': 'YES'}],
						'placeholder': '1',
						'required': true,
						'tooltip': '',
						'fieldMsg': ''
					},
					{
						'type': 'html',
						'name': 'rIPRuleNatPool',
						'value': '<span class="icon icon-cross"></span>'
					}
				]
			},
		},

		grid: {
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{'label': 'Load Balancer Name', 'field': 'name'},
				{'label': 'Load Balancer Region', 'field': 'region'},
				{'label': 'Load Balancer Ports', 'field': 'ports'},
				{'label': 'Load Balancer Ports', 'field': 'ipAddresses'},
				{'label': 'Load Balancer Ports', 'field': 'ipConfigs'},
				{'label': 'Load Balancer Ports', 'field': 'natPools'},
				{'label': 'Load Balancer Ports', 'field': 'natRules'},
			],
			'leftActions': [],
			'topActions': [],
			'defaultSortField': '',
			'defaultLimit': 10
		},
	};

	function loadAndReturnSubnets(currentScope, cb){
		let subnets = [], processed = [];
		if(currentScope.networks) {
			currentScope.networks.forEach((oneNetwork) => {
				if(oneNetwork && oneNetwork.subnets && Array.isArray(oneNetwork.subnets) && oneNetwork.subnets.length > 0) {
					oneNetwork.subnets.forEach((oneSubnet) => {
						if(processed.indexOf(oneSubnet.id) === -1){
							processed.push(oneSubnet.id);
							subnets.push({v: oneSubnet.id, l: oneSubnet.name, group: `${oneNetwork.name} network`});
						}
					});
				}
			});
		}
		// currentScope.vmlayers.forEach((oneVMLayer) => {
		//
		// 	if(oneVMLayer.labels && oneVMLayer.labels['soajs.service.vm.group'].toLowerCase() === currentScope.selectedGroup.name.toLowerCase()){
		// 		if(processed.indexOf(oneVMLayer.layer) === -1){
		// 			processed.push(oneVMLayer.layer);
		// 			subnets.push({v: oneVMLayer.layer, l: oneVMLayer.layer});
		// 		}
		// 	}
		// });

		return cb(subnets);
	}

	function loadAndReturnExtras(currentScope, cb){
		let listOptions = {
			method: 'get',
			routeName: '/dashboard/infra/extras',
			params: {
				'id': currentScope.currentSelectedInfra._id,
				'group': currentScope.selectedGroup.name,
				'extras[]': ['publicIps', 'networks']
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, listOptions, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.form.displayAlert('danger', error.message);
			}
			else {
				let infraPublicIps = [], processed = [];
				if (response.publicIps && response.publicIps.length > 0) {
					response.publicIps.forEach((onePublicIP) => {
						if(processed.indexOf(onePublicIP.name) === -1){
							processed.push(onePublicIP.name);
							infraPublicIps.push({'v': onePublicIP.id, 'l': onePublicIP.name});
						}
					});
				}

				if(response.networks && Array.isArray(response.networks) && response.networks.length > 0) {
					currentScope.networks = response.networks;
				}
				return cb(infraPublicIps);
			}
		});
	}

	function addNewPort(currentScope, ipRuleCounter, defaultValues){
		let ipRulePortsCounter = currentScope.ipRuleCounter['iprule_' + ipRuleCounter].portCounter;
		let tmp = angular.copy(infraLoadBalancerConfig.form.portsInput);
		let counterLabel = ipRuleCounter + '-' + ipRulePortsCounter;

		tmp.name += counterLabel;
		tmp.entries.forEach((oneEntry) => {
			oneEntry.name += counterLabel;
		});

		//add available address Pools
		tmp.entries[1].value = currentScope.form.availableAddressPools;

		//rIPRulePort
		tmp.entries[tmp.entries.length -1].onAction = function (id, value, form) {
			let count = id.replace('rIPRulePort', '');
			for (let i = form.entries[3].entries[ipRuleCounter].entries[6].entries.length - 1; i >= 0; i--) {
				if (form.entries[3].entries[ipRuleCounter].entries[6].entries[i].name === 'ipRulePortsGroup' + count) {

					//remove from formData
					form.entries[3].entries[ipRuleCounter].entries[6].entries[i].entries.forEach((oneEntry) => {
						delete form.formData[oneEntry.name + count];
					});

					//remove from formEntries
					form.entries[3].entries[ipRuleCounter].entries[6].entries.splice(i, 1);
					break;
				}
			}
		};

		if(defaultValues) {
			currentScope.form.formData['portName' + counterLabel] = defaultValues.name;
			currentScope.form.formData['portAddressPoolName' + counterLabel] = defaultValues.addressPoolName;
			currentScope.form.formData['portProtocol' + counterLabel] = defaultValues.protocol;
			currentScope.form.formData['portPublished' + counterLabel] = defaultValues.published;
			currentScope.form.formData['portTarget' + counterLabel] = defaultValues.target;
			currentScope.form.formData['portIdleTimeout' + counterLabel] = defaultValues.idleTimeout;
			currentScope.form.formData['portEnableFloatingIP' + counterLabel] = defaultValues.enableFloatingIP;
			currentScope.form.formData['portLoadDistribution' + counterLabel] = defaultValues.loadDistribution;

			currentScope.form.formData['portHealthProbePort' + counterLabel] = defaultValues.healthProbePort;
			currentScope.form.formData['portHealthProbeProtocol' + counterLabel] = defaultValues.healthProbeProtocol;
			currentScope.form.formData['portHealthProbeRequestPath' + counterLabel] = defaultValues.healthProbeRequestPath;
			currentScope.form.formData['portMaxFailureAttempts' + counterLabel] = defaultValues.maxFailureAttempts;
			currentScope.form.formData['portHealthProbeInterval' + counterLabel] = defaultValues.healthProbeInterval;
		}

		if (currentScope.form && currentScope.form.entries) {
			currentScope.form.entries[3].entries[ipRuleCounter].entries[6].entries.splice(currentScope.form.entries[3].entries[ipRuleCounter].entries[6].entries.length - 1, 0, tmp);
		}
		currentScope.ipRuleCounter['iprule_' + ipRuleCounter].portCounter++;
	}

	function addNewNATRule(currentScope, ipRuleCounter, defaultValues){
		let ipRuleNatRulesCounter = currentScope.ipRuleCounter['iprule_' + ipRuleCounter].natRuleCounter;
		let tmp = angular.copy(infraLoadBalancerConfig.form.NATRule);
		let counterLabel = ipRuleCounter + '-' + ipRuleNatRulesCounter;

		tmp.name += counterLabel;
		tmp.entries.forEach((oneEntry) => {
			oneEntry.name += counterLabel;
		});

		//rIPRulePort
		tmp.entries[tmp.entries.length -1].onAction = function (id, value, form) {
			let count = id.replace('rIPRuleNatRule', '');

			for (let i = form.entries[3].entries[ipRuleCounter].entries[7].entries.length - 1; i >= 0; i--) {
				if (form.entries[3].entries[ipRuleCounter].entries[7].entries[i].name === 'ipRuleNATRuleGroup' + count) {

					//remove from formData
					form.entries[3].entries[ipRuleCounter].entries[7].entries[i].entries.forEach((oneEntry) => {
						delete form.formData[oneEntry.name + count];
					});

					//remove from formEntries
					form.entries[3].entries[ipRuleCounter].entries[7].entries.splice(i, 1);

					//if this is the last NAT Rule in the array, re-enable NAT Pool section
					if (form.entries[3].entries[ipRuleCounter].entries[7].entries.length === 1) {
						delete currentScope.form.entries[3].entries[ipRuleCounter].entries[8].description;
						currentScope.form.entries[3].entries[ipRuleCounter].entries[8].entries = infraLoadBalancerConfig.form.ipRuleInput.entries[8].entries;
						currentScope.form.entries[3].entries[ipRuleCounter].entries[8].entries[0].onAction = function (id, value, form) {
							addNewNATPool(currentScope, ipRuleCounter);
						}
					}

					break;
				}
			}
		};

		if(defaultValues) {
			currentScope.form.formData['natRuleName' + counterLabel] = defaultValues.name;
			currentScope.form.formData['natRuleProtocol' + counterLabel] = defaultValues.protocol;
			currentScope.form.formData['natRuleFrontendPort' + counterLabel] = defaultValues.frontendPort;
			currentScope.form.formData['natRuleBackendPort' + counterLabel] = defaultValues.backendPort;
			currentScope.form.formData['natRuleIdleTimeout' + counterLabel] = defaultValues.idleTimeout;
			currentScope.form.formData['natRuleEnableFloatingIP' + counterLabel] = defaultValues.enableFloatingIP;
		}

		//show note in NAT Pools section and remove Add NAT Pool button
		currentScope.form.entries[3].entries[ipRuleCounter].entries[8].description = {
			type: 'warning',
			content: "<strong>Note: </strong> You will not be able to add any NAT Pools since you added a NAT Rule. Remove all NAT Rules to enable adding NAT Pools."
		};
		currentScope.form.entries[3].entries[ipRuleCounter].entries[8].entries = [];

		if (currentScope.form && currentScope.form.entries) {
			currentScope.form.entries[3].entries[ipRuleCounter].entries[7].entries.splice(currentScope.form.entries[3].entries[ipRuleCounter].entries[7].entries.length - 1, 0, tmp);
		}
		currentScope.ipRuleCounter['iprule_' + ipRuleCounter].natRuleCounter++;
	}

	function addNewNATPool(currentScope, ipRuleCounter, defaultValues){
		let ipRuleNatPoolsCounter = currentScope.ipRuleCounter['iprule_' + ipRuleCounter].natPoolCounter;
		let tmp = angular.copy(infraLoadBalancerConfig.form.NATPool);
		let counterLabel = ipRuleCounter + '-' + ipRuleNatPoolsCounter;

		tmp.name += counterLabel;
		tmp.entries.forEach((oneEntry) => {
			oneEntry.name += counterLabel;
		});

		//rIPRulePort
		tmp.entries[tmp.entries.length -1].onAction = function (id, value, form) {
			let count = id.replace('rIPRuleNatPool', '');

			for (let i = form.entries[3].entries[ipRuleCounter].entries[8].entries.length - 1; i >= 0; i--) {
				if (form.entries[3].entries[ipRuleCounter].entries[8].entries[i].name === 'ipRuleNATPoolGroup' + count) {

					//remove from formData
					form.entries[3].entries[ipRuleCounter].entries[8].entries[i].entries.forEach((oneEntry) => {
						delete form.formData[oneEntry.name + count];
					});

					//remove from formEntries
					form.entries[3].entries[ipRuleCounter].entries[8].entries.splice(i, 1);

					//if this is the last NAT Pool in the array, re-enable NAT Rule section
					if (form.entries[3].entries[ipRuleCounter].entries[8].entries.length === 1) {
						delete currentScope.form.entries[3].entries[ipRuleCounter].entries[7].description;
						currentScope.form.entries[3].entries[ipRuleCounter].entries[7].entries = infraLoadBalancerConfig.form.ipRuleInput.entries[7].entries;
						currentScope.form.entries[3].entries[ipRuleCounter].entries[7].entries[0].onAction = function (id, value, form) {
							addNewNATRule(currentScope, ipRuleCounter);
						}
					}

					break;
				}
			}
		};

		if(defaultValues) {
			currentScope.form.formData['natPoolName' + counterLabel] = defaultValues.name;
			currentScope.form.formData['natPoolProtocol' + counterLabel] = defaultValues.protocol;
			currentScope.form.formData['natPoolFrontendPort' + counterLabel] = defaultValues.frontendPortRangeStart + "-" + defaultValues.frontendPortRangeEnd;
			currentScope.form.formData['natPoolBackendPort' + counterLabel] = defaultValues.backendPort;
			currentScope.form.formData['natPoolIdleTimeout' + counterLabel] = defaultValues.idleTimeout;
			currentScope.form.formData['natPoolEnableFloatingIP' + counterLabel] = defaultValues.enableFloatingIP;
		}

		//show note in NAT Rules section and remove Add NAT Rule button
		currentScope.form.entries[3].entries[ipRuleCounter].entries[7].description = {
			type: 'warning',
			content: "<strong>Note: </strong> You will not be able to add any NAT Rules since you added a NAT Pool. Remove all NAT Pools to enable adding NAT Rules."
		};
		currentScope.form.entries[3].entries[ipRuleCounter].entries[7].entries = [];

		if (currentScope.form && currentScope.form.entries) {
			currentScope.form.entries[3].entries[ipRuleCounter].entries[8].entries.splice(currentScope.form.entries[3].entries[ipRuleCounter].entries[8].entries.length - 1, 0, tmp);
		}
		currentScope.ipRuleCounter['iprule_' + ipRuleCounter].natPoolCounter++;
	}

	function addNewIpRule(currentScope, subnets, publicIps, oneDefaultIPRuleValue) {
		let ipRuleCounter = Object.keys(currentScope.ipRuleCounter).length;
		let tmp = angular.copy(infraLoadBalancerConfig.form.ipRuleInput);
		tmp.name += ipRuleCounter;
		tmp.entries.forEach((oneipRuleEntry) => {
			let originalName = oneipRuleEntry.name;
			oneipRuleEntry.name += ipRuleCounter;
		});

		currentScope.closeModalUsingJs = function(){
			currentScope.modalInstance.close();
		};
		closeModalUsingJs = currentScope.closeModalUsingJs;

		tmp.entries[5].value = angular.copy(subnets);
		if(tmp.entries[5].value.length > 0){
			tmp.entries[5].value[0].selected = true;
		}
		else if (tmp.entries[5].value.length === 0) {
			tmp.entries[5].fieldMsg = `<strong style="color:red">No subnets detected in this resource group! </strong> <a onclick="closeModalUsingJs()" href = "#/infra-networks?group=${currentScope.selectedGroup.name}">Click here</a> to create a new Network with subnets.`;
			tmp.entries[5].disabled = true;
		}

		tmp.entries[4].value = angular.copy(publicIps);
		if(tmp.entries[4].value.length > 0){
			tmp.entries[4].value[0].selected = true;
		}
		else if (tmp.entries[4].value.length === 0) {
			tmp.entries[4].fieldMsg = `<strong style="color:red">No public IPs detected in this resource group! </strong> <a onclick="closeModalUsingJs()" href = "#/infra-ip?group=${currentScope.selectedGroup.name}">Click here</a> to create a Public IP.`;
			tmp.entries[4].disabled = true;
		}

		//ports
		tmp.entries[6].entries[0].onAction = function (id, value, form) {
			addNewPort(currentScope, ipRuleCounter);
		};

		//nat rules
		tmp.entries[7].entries[0].onAction = function (id, value, form) {
			addNewNATRule(currentScope, ipRuleCounter);
		};

		//nat pool
		tmp.entries[8].entries[0].onAction = function (id, value, form) {
			addNewNATPool(currentScope, ipRuleCounter);
		};

		//delete rule
		tmp.entries[9].onAction = function (id, value, form) {
			let count = parseInt(id.replace('rIpRule', ''));
			for (let i = form.entries[3].entries.length - 1; i >= 0; i--) {
				if (form.entries[3].entries[i].name === 'ipRuleGroup' + count) {

					for (let j = form.entries[3].entries[i].entries[6].entries.length - 1; j >= 0; j--) {
						//remove ports from formData
						if (form.entries[3].entries[i].entries[6] &&
							form.entries[3].entries[i].entries[6].entries &&
							form.entries[3].entries[i].entries[6].entries[j] &&
							form.entries[3].entries[i].entries[6].entries[j].name === 'ipRulePortsGroup' + count) {
							form.entries[3].entries[i].entries[6].entries[j].entries.forEach((oneEntry) => {
								delete form.formData[oneEntry.name];
							});
						}

						//remove NAT Rules from formData
						if (form.entries[3].entries[i].entries[7] &&
							form.entries[3].entries[i].entries[7].entries &&
							form.entries[3].entries[i].entries[7].entries[j] &&
							form.entries[3].entries[i].entries[7].entries[j].name === 'ipRuleNATRuleGroup' + count) {
							form.entries[3].entries[i].entries[7].entries[j].entries.forEach((oneEntry) => {
								delete form.formData[oneEntry.name];
							});
						}

						//remove NAT Pools from formData
						if (form.entries[3].entries[i].entries[8] &&
							form.entries[3].entries[i].entries[8].entries &&
							form.entries[3].entries[i].entries[8].entries[j] &&
							form.entries[3].entries[i].entries[8].entries[j].name === 'ipRuleNATPoolGroup' + count) {
							form.entries[3].entries[i].entries[8].entries[j].entries.forEach((oneEntry) => {
								delete form.formData[oneEntry.name];
							});
						}
					}

					//remove from formData
					for (let fieldname in form.formData) {
						if (['ipRuleName' + count].indexOf(fieldname) !== -1) {
							delete form.formData[fieldname];
						}
					}

					//remove from formEntries
					form.entries[3].entries.splice(i, 1);
					break;
				}
			}

			delete currentScope.ipRuleCounter['iprule_' + ipRuleCounter];
		};

		currentScope.ipRuleCounter['iprule_' + ipRuleCounter] = {
			portCounter: 0,
			natPoolCounter: 0,
			natRuleCounter: 0
		};

		if (currentScope.form && currentScope.form.entries) {
			currentScope.form.entries[3].entries.splice(currentScope.form.entries[3].entries.length - 1, 0, tmp);
		}

		if(oneDefaultIPRuleValue && oneDefaultIPRuleValue.config){
			//rule name
			currentScope.form.formData['ipRuleName' + ipRuleCounter] = oneDefaultIPRuleValue.name;

			//priate ip allocation method
			currentScope.form.formData['privateIpAllocationMethod' + ipRuleCounter] = oneDefaultIPRuleValue.config.privateIPAllocationMethod;
			let privateIPAllocationEntry = infraLoadBalancerConfig.form.ipRuleInput.entries.find((oneEntry) => {
				return oneEntry.name === 'privateIpAllocationMethod';
			});
			if(privateIPAllocationEntry && privateIPAllocationEntry.onAction) {
				privateIPAllocationEntry.onAction('privateIpAllocationMethod' + ipRuleCounter, currentScope.form.formData['privateIpAllocationMethod' + ipRuleCounter], currentScope.form);
			}

			//private ip address, if any
			if(oneDefaultIPRuleValue.config && oneDefaultIPRuleValue.config.privateIpAddress) {
				currentScope.form.formData['privateIpAddress' + ipRuleCounter] = oneDefaultIPRuleValue.config.privateIpAddress;
			}

			//rule isPublic or not
			currentScope.form.formData['isPublic' + ipRuleCounter] = oneDefaultIPRuleValue.config.isPublic;
			let publicIpEntry = infraLoadBalancerConfig.form.ipRuleInput.entries.find((oneEntry) => {
				return oneEntry.name === 'isPublic';
			});
			if(publicIpEntry && publicIpEntry.onAction) {
				publicIpEntry.onAction('isPublic' + ipRuleCounter, currentScope.form.formData['isPublic' + ipRuleCounter], currentScope.form);
			}

			//public ip address if any
			if(oneDefaultIPRuleValue.config.isPublic && oneDefaultIPRuleValue.config.publicIpAddress && oneDefaultIPRuleValue.config.publicIpAddress.id) {
				if(publicIps && Array.isArray(publicIps) && publicIps.length > 0) {
					let foundIp = publicIps.find((onePublicIp) => {
						return onePublicIp.v === oneDefaultIPRuleValue.config.publicIpAddress.id;
					});

					if(foundIp) {
						currentScope.form.formData['publicIpAddressId' + ipRuleCounter] = foundIp.v;
					}
				}
			}
			//subnet if any
			else if(!oneDefaultIPRuleValue.config.isPublic && oneDefaultIPRuleValue.config.subnet && oneDefaultIPRuleValue.config.subnet.id) {
				if(subnets && Array.isArray(subnets) && subnets.length > 0) {
					let foundSubnet = subnets.find((oneSubnet) => {
						return oneSubnet.v === oneDefaultIPRuleValue.config.subnet.id;
					});

					if(foundSubnet) {
						currentScope.form.formData['subnetId' + ipRuleCounter] = foundSubnet.v;
					}
				}
			}

			if(oneDefaultIPRuleValue.ports && Array.isArray(oneDefaultIPRuleValue.ports) && oneDefaultIPRuleValue.ports.length > 0){
				oneDefaultIPRuleValue.ports.forEach((oneDefaultPort) => {
					addNewPort(currentScope, ipRuleCounter, oneDefaultPort);
				});
			}
			if(oneDefaultIPRuleValue.natPools && Array.isArray(oneDefaultIPRuleValue.natPools) && oneDefaultIPRuleValue.natPools.length > 0) {
				oneDefaultIPRuleValue.natPools.forEach((oneDefaultPool) => {
					addNewNATPool(currentScope, ipRuleCounter, oneDefaultPool);
				});
			}

			if(oneDefaultIPRuleValue.natRules && Array.isArray(oneDefaultIPRuleValue.natRules) && oneDefaultIPRuleValue.natRules.length > 0) {
				oneDefaultIPRuleValue.natRules.forEach((oneDefaultRule) => {
					addNewNATRule(currentScope, ipRuleCounter, oneDefaultRule);
				});
			}
		}
	}

	function addNewAddressPool(currentScope, oneAddressPoolValue) {
		let addressPoolCounter = currentScope.addressPoolCounter;
		let tmp = angular.copy(infraLoadBalancerConfig.form.addressPoolInput);
		tmp.name += addressPoolCounter;
		tmp.entries[0].name += addressPoolCounter;
		tmp.entries[1].name += addressPoolCounter;

		tmp.entries[1].onAction = function (id, value, form) {
			let count = id.replace('rAddressPool', '');

			for (let i = form.entries[2].entries.length - 1; i >= 0; i--) {
				if (form.entries[2].entries[i].name === 'addressPoolGroup' + count) {
					//remove from formData
					for (let fieldname in form.formData) {
						if (['addressPoolName' + count].indexOf(fieldname) !== -1) {
							delete form.formData[fieldname];
						}
					}

					//clear all selected addressPools from all ipRules
					for (let k = 0; k < form.ipRuleTotalCount; k++) {
						for (let fieldData in form.formData) {
							let pattern = new RegExp(`portAddressPoolName${k}-[0-9]+`, 'g');
							if(fieldData.match(pattern)) {
								delete form.formData[fieldData];
							}
						}
					}

					//remove from formEntries
					form.entries[2].entries.splice(i, 1);
					break;
				}
			}

			//update form.availableAddressPools
			let tempArray = [];
			for (let i = 0; i < form.addressPoolCounter; i++) {
				if (form.formData['addressPoolName'+i]) {
					tempArray.push({
						'v': form.formData['addressPoolName'+i],
						'l': form.formData['addressPoolName'+i]
					});
				}
			}
			form.availableAddressPools = angular.copy(tempArray);

			//refresh array of address pool to choose from in all ipRules
			form.entries[3].entries.forEach((oneIPRuleGroup) => {
				if (['ipRuleGroup'].indexOf(oneIPRuleGroup.name)) {
					if (oneIPRuleGroup.entries && oneIPRuleGroup.entries[6] && oneIPRuleGroup.entries[6].entries) {
						oneIPRuleGroup.entries[6].entries.forEach((oneEntry) => {
							if(oneEntry.entries && oneEntry.entries[1]) {
								oneEntry.entries[1].value = form.availableAddressPools;
							}
						});
					}
				}
			});

		};

		if (currentScope.form && currentScope.form.entries) {
			currentScope.form.entries[2].entries.splice(currentScope.form.entries[2].entries.length - 1, 0, tmp);
		}
		else {
			// formConfig[5].tabs[7].entries.splice(currentScope.form.entries[2].entries.length - 1, 0, tmp);
		}

		currentScope.form.formData['addressPoolName' + addressPoolCounter] = oneAddressPoolValue;
		currentScope.form.addressPoolCounter = ++currentScope.addressPoolCounter;
		currentScope.form.entries[2].entries[0].entries[0].onAction('addressPoolName' + addressPoolCounter, currentScope.form.formData['addressPoolName' + addressPoolCounter], currentScope.form);
	}

	function addLoadBalancer(currentScope) {
		currentScope.addressPoolCounter = 0;
		currentScope.ipRuleCounter = {};
		currentScope.availableAddressPools = [];

		//load public ips
		loadAndReturnExtras(currentScope, (publicIps) => {
			//load subnets
			loadAndReturnSubnets(currentScope, (subnets) => {

				let options = {
					timeout: $timeout,
					form: {
						"entries": angular.copy(infraLoadBalancerConfig.form.addLoadBalancer)
					},
					name: 'addLoadBalancer',
					label: 'Add New Load Balancer',
					actions: [
						{
							'type': 'submit',
							'label': "Create Load Balancer",
							'btn': 'primary',
							'action': function (formData) {
								let data = angular.copy(formData);

								let postOpts = {
									"method": "post",
									"routeName": "/dashboard/infra/extras",
									"params": {
										"infraId": currentScope.currentSelectedInfra._id,
										"technology": "vm"
									},
									"data": {
										"params": populatePostData(currentScope, data)
									}
								};

								overlayLoading.show();
								getSendDataFromServer(currentScope, ngDataApi, postOpts, function (error) {
									overlayLoading.hide();
									if (error) {
										currentScope.form.displayAlert('danger', error.message);
									}
									else {
										currentScope.displayAlert('success', "Load balancer created successfully. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.");
										currentScope.modalInstance.close();
										$timeout(() => {
											listLoadBalancers(currentScope, currentScope.selectedGroup);
										}, 2000);
									}
								});
							}
						},
						{
							'type': 'reset',
							'label': 'Cancel',
							'btn': 'danger',
							'action': function () {
								delete currentScope.form.formData;
								currentScope.modalInstance.close();
							}
						}
					]
				};

				options.form.entries[2].entries[0].onAction = function (id, value, form) {
					addNewAddressPool(currentScope);
				};

				options.form.entries[3].entries[0].onAction = function (id, value, form) {
					addNewIpRule(currentScope, subnets, publicIps);
					form.ipRuleTotalCount = Object.keys(currentScope.ipRuleCounter).length;
				};

				//set value of region to selectedRegion
				options.form.entries[1].value = currentScope.selectedGroup.region;

				buildFormWithModal(currentScope, $modal, options);
			});
		});
	}

	function editLoadBalancer(currentScope, originalLoadBalancer) {
		let oneLoadBalancer = angular.copy(originalLoadBalancer);

		currentScope.addressPoolCounter = 0;
		currentScope.ipRuleCounter = {};

		//load public ips
		loadAndReturnExtras(currentScope, (publicIps) => {
			//load subnets
			loadAndReturnSubnets(currentScope, (subnets) => {

				let options = {
					timeout: $timeout,
					form: {
						"entries": angular.copy(infraLoadBalancerConfig.form.addLoadBalancer)
					},
					name: 'modifyLoadBalancer',
					label: 'Modify Load Balancer',
					actions: [
						{
							'type': 'submit',
							'label': "Create Load Balancer",
							'btn': 'primary',
							'action': function (formData) {
								let data = angular.copy(formData);

								let postOpts = {
									"method": "put",
									"routeName": "/dashboard/infra/extras",
									"params": {
										"infraId": currentScope.currentSelectedInfra._id,
										"technology": "vm"
									},
									"data": {
										"params": populatePostData(currentScope, data)
									}
								};

								overlayLoading.show();
								getSendDataFromServer(currentScope, ngDataApi, postOpts, function (error) {
									overlayLoading.hide();
									if (error) {
										currentScope.form.displayAlert('danger', error.message);
									}
									else {
										currentScope.displayAlert('success', "Load balancer updated successfully. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.");
										currentScope.modalInstance.close();
										$timeout(() => {
											listLoadBalancers(currentScope, currentScope.selectedGroup);
										}, 2000);
									}
								});
							}
						},
						{
							'type': 'reset',
							'label': 'Cancel',
							'btn': 'danger',
							'action': function () {
								delete currentScope.form.formData;
								currentScope.modalInstance.close();
							}
						}
					]
				};

				options.form.entries[2].entries[0].onAction = function (id, value, form) {
					addNewAddressPool(currentScope);
				};

				options.form.entries[3].entries[0].onAction = function (id, value, form) {
					addNewIpRule(currentScope, subnets, publicIps);
				};

				//set value of region to selectedRegion
				options.form.entries[1].value = currentScope.selectedGroup.region;

				buildFormWithModal(currentScope, $modal, options, () => {

					currentScope.form.formData['name'] = oneLoadBalancer.name;

					oneLoadBalancer.addressPools.forEach((oneAddressPool) => {
						addNewAddressPool(currentScope, oneAddressPool.name);
					});

					oneLoadBalancer.rules.forEach((oneIPRule) => {
						addNewIpRule(currentScope, subnets, publicIps, oneIPRule);
					});
				});
			});
		});
	}

	function deleteLoadBalancer(currentScope, oneLoadBalancer) {

		let deleteFireWallOpts = {
			method: 'delete',
			routeName: '/dashboard/infra/extras',
			params: {
				'infraId': currentScope.$parent.$parent.currentSelectedInfra._id,
				'technology': 'vm',
				'section': 'loadBalancer',
				'group': currentScope.selectedGroup.name,
				'name': oneLoadBalancer.name
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, deleteFireWallOpts, (error, response) => {
			overlayLoading.hide();
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error);
			}
			else {
				overlayLoading.hide();
				currentScope.displayAlert('success', `The load balancer has been successfully deleted. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.`);
				$timeout(() => {
					listLoadBalancers(currentScope, currentScope.selectedGroup);
				}, 2000);
			}
		});
	}

	function listLoadBalancers(currentScope, oneGroup) {
		let oneInfra = currentScope.$parent.$parent.currentSelectedInfra;

		//save selected group in scope to be accessed by other functions
		currentScope.selectedGroup = oneGroup;

		// clean grid from previous list if any
		if (currentScope.grid && currentScope.grid.rows && currentScope.grid.filteredRows && currentScope.grid.original) {
			currentScope.grid.rows = [];
			currentScope.grid.filteredRows = [];
			currentScope.grid.original = [];
		}

		let listOptions = {
			method: 'get',
			routeName: '/dashboard/infra/extras',
			params: {
				'id': oneInfra._id,
				'group': oneGroup.name,
				'extras[]': ['loadBalancers']
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, listOptions, (error, response) => {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error);
			}
			else {
				currentScope.infraLoadBalancers = [];
				if (response.loadBalancers && response.loadBalancers.length > 0) {
					currentScope.infraLoadBalancers = response.loadBalancers;
					currentScope.infraLoadBalancers[0].open = true;

					currentScope.infraLoadBalancers.forEach((oneLoadBalancer) => {
						if (oneLoadBalancer.rules) {
							oneLoadBalancer.rules[0].open = true;
						}
					});
				}

				if (currentScope.vmlayers) {
					let processedNetworks = [];
					currentScope.infraLoadBalancers.forEach((oneLoadBalancer) => {

						oneLoadBalancer.rules.forEach((oneRule) => {
							if (oneRule.config.subnet) {

								currentScope.vmlayers.forEach((oneVmLayer) => {
									if (
										oneVmLayer.layer.toLowerCase() === oneRule.config.subnet.name.toLowerCase() &&
										oneVmLayer.network.toLowerCase() === oneRule.config.subnet.network.toLowerCase() &&
										oneVmLayer.labels &&
										oneVmLayer.labels['soajs.service.vm.group'].toLowerCase() === oneRule.config.subnet.group.toLowerCase() &&
										oneVmLayer.labels['soajs.env.code']
									) {
										$localStorage.environments.forEach((oneEnv) => {
											if (oneEnv.code.toUpperCase() === oneVmLayer.labels['soajs.env.code'].toUpperCase()) {
												oneRule.config.subnet.envCode = oneVmLayer.labels['soajs.env.code'];
											}
										});
									}
								});
							}
						});
					});
				}
			}
		});

	}

	function populatePostData(currentScope, data) {
		let postData = {
			name: data.name,
			region: data.region,
			section: 'loadBalancer',
			group: currentScope.selectedGroup.name,
			addressPools: [],
			rules: []
		};

		// populate postData
		Object.keys(data).forEach((oneEntry) => {
			if(oneEntry.match(/addressPoolName[0-9]+/g)) {
				postData.addressPools.push({ name: data[oneEntry] });
			}

			else if(oneEntry.match(/ipRuleName[0-9]+/g)) {
				let ipRuleCount = oneEntry.replace('ipRuleName', '');

				let oneRule = {
					name: data[oneEntry],
					config: {},
					ports: [],
					natRules: [],
					natPools: []
				};

				let rulePortRegExp = new RegExp(`portName${ipRuleCount}-[0-9]+`, 'g');
				let ruleNatRuleRegExp = new RegExp(`natRuleName${ipRuleCount}-[0-9]+`, 'g');
				let ruleNatPoolRegExp = new RegExp(`natPoolName${ipRuleCount}-[0-9]+`, 'g');

				// populate config and ports/rules of one rule
				Object.keys(data).forEach((oneEntry) => {

					switch(oneEntry) {
						case `privateIpAllocationMethod${ipRuleCount}`:
							oneRule.config.privateIpAllocationMethod = data[oneEntry];
							break;
						case `isPublic${ipRuleCount}`:
							oneRule.config.isPublic = data[oneEntry];
							break;
						case `privateIpAddress${ipRuleCount}`:
							oneRule.config.privateIpAddress = data[oneEntry];
							break;
						case `publicIpAddressId${ipRuleCount}`:
							oneRule.config.publicIpAddress = { id: data[oneEntry] };
							break;
						case `subnetId${ipRuleCount}`:
							oneRule.config.subnet = { id: data[oneEntry] };
							break;
						default:
							break;
					}

					if(oneEntry.match(rulePortRegExp)) {
						oneRule.ports.push(buildLoadBalancerPort(data, oneEntry, ipRuleCount));
					}
					else if(oneEntry.match(ruleNatRuleRegExp)) {
						oneRule.natRules.push(buildLoadBalancerNatRule(data, oneEntry, ipRuleCount));
					}
					else if(oneEntry.match(ruleNatPoolRegExp)) {
						oneRule.natPools.push(buildLoadBalancerNatPool(data, oneEntry, ipRuleCount));
					}
				});

				// extra assurance
				if(oneRule.config.isPublic) {
					delete oneRule.config.subnet;
				}
				else {
					delete oneRule.config.publicIpAddress;
				}

				if (oneRule.ports.length === 0) {
					delete oneRule.ports;
				}
				if (oneRule.natRules.length === 0) {
					delete oneRule.natRules;
				}
				if (oneRule.natPools.length === 0) {
					delete oneRule.natPools;
				}

				postData.rules.push(oneRule);
			}
		});

		return postData;
	}

	function buildLoadBalancerPort(data, oneEntry, ipRuleCount) {
		let ipRulePortCount = oneEntry.replace(`portName${ipRuleCount}-`, '');
		let onePort = {
			name: data[oneEntry]
		};

		// collect one port config
		Object.keys(data).forEach((oneEntry) => {
			switch(oneEntry) {
				case `portProtocol${ipRuleCount}-${ipRulePortCount}`:
					onePort.protocol = data[oneEntry];
					break;
				case `portTarget${ipRuleCount}-${ipRulePortCount}`:
					onePort.target = data[oneEntry];
					break;
				case `portPublished${ipRuleCount}-${ipRulePortCount}`:
					onePort.published = data[oneEntry];
					break;
				case `portIdleTimeout${ipRuleCount}-${ipRulePortCount}`:
					onePort.idleTimeout = data[oneEntry];
					break;
				case `portLoadDistribution${ipRuleCount}-${ipRulePortCount}`:
					onePort.loadDistribution = data[oneEntry];
					break;
				case `portEnableFloatingIP${ipRuleCount}-${ipRulePortCount}`:
					onePort.enableFloatingIP = data[oneEntry];
					break;
				case `portAddressPoolName${ipRuleCount}-${ipRulePortCount}`:
					onePort.addressPoolName = data[oneEntry];
					break;
				case `portHealthProbePort${ipRuleCount}-${ipRulePortCount}`:
					onePort.healthProbePort = data[oneEntry];
					break;
				case `portHealthProbeProtocol${ipRuleCount}-${ipRulePortCount}`:
					onePort.healthProbeProtocol = data[oneEntry];
					break;
				case `portHealthProbeRequestPath${ipRuleCount}-${ipRulePortCount}`:
					onePort.healthProbeRequestPath = data[oneEntry];
					break;
				case `portMaxFailureAttempts${ipRuleCount}-${ipRulePortCount}`:
					onePort.maxFailureAttempts = data[oneEntry];
					break;
				case `portHealthProbeInterval${ipRuleCount}-${ipRulePortCount}`:
					onePort.healthProbeInterval = data[oneEntry];
					break;
				default:
					break;
			}
		});

		return onePort;
	}

	function buildLoadBalancerNatRule(data, oneEntry, ipRuleCount) {
		let ipRuleNatRuleCount = oneEntry.replace(`natRuleName${ipRuleCount}-`, '');
		let oneNatRule = {
			name: data[oneEntry]
		};

		// collect one nat rule config
		Object.keys(data).forEach((oneEntry) => {
			switch(oneEntry) {
				case `natRuleBackendPort${ipRuleCount}-${ipRuleNatRuleCount}`:
					oneNatRule.backendPort = data[oneEntry];
					break;
				case `natRuleFrontendPort${ipRuleCount}-${ipRuleNatRuleCount}`:
					oneNatRule.frontendPort = data[oneEntry];
					break;
				case `natRuleProtocol${ipRuleCount}-${ipRuleNatRuleCount}`:
					oneNatRule.protocol = data[oneEntry];
					break;
				case `natRuleIdleTimeout${ipRuleCount}-${ipRuleNatRuleCount}`:
					oneNatRule.idleTimeout = data[oneEntry];
					break;
				case `natRuleEnableFloatingIP${ipRuleCount}-${ipRuleNatRuleCount}`:
					oneNatRule.enableFloatingIP = data[oneEntry];
					break;
				default:
					break;
			}
		});

		return oneNatRule;
	}

	function buildLoadBalancerNatPool(data, oneEntry, ipRuleCount) {
		let ipRuleNatPoolCount = oneEntry.replace(`natPoolName${ipRuleCount}-`, '');
		let oneNatPool = {
			name: data[oneEntry]
		};

		// collect one nat pool config
		Object.keys(data).forEach((oneEntry) => {
			switch(oneEntry) {
				case `natPoolBackendPort${ipRuleCount}-${ipRuleNatPoolCount}`:
					oneNatPool.backendPort = data[oneEntry];
					break;
				case `natPoolProtocol${ipRuleCount}-${ipRuleNatPoolCount}`:
					oneNatPool.protocol = data[oneEntry];
					break;
				case `natPoolEnableFloatingIP${ipRuleCount}-${ipRuleNatPoolCount}`:
					oneNatPool.enableFloatingIP = data[oneEntry];
					break;
				case `natPoolFrontendPort${ipRuleCount}-${ipRuleNatPoolCount}`:
					let range = data[oneEntry].split('-').map(oneRange => parseInt(oneRange));
					if(range[0] < range[1]) {
						oneNatPool.frontendPortRangeStart = range[0];
						oneNatPool.frontendPortRangeEnd = range[1];
					}
					else {
						oneNatPool.frontendPortRangeStart = range[1];
						oneNatPool.frontendPortRangeEnd = range[0];
					}

					break;
				case `natPoolIdleTimeout${ipRuleCount}-${ipRuleNatPoolCount}`:
					oneNatPool.idleTimeout = data[oneEntry];
					break;
				default:
					break;
			}
		});

		return oneNatPool;
	}

	return {
		'addLoadBalancer': addLoadBalancer,
		'editLoadBalancer': editLoadBalancer,
		'deleteLoadBalancer': deleteLoadBalancer,
		'listLoadBalancers': listLoadBalancers
	};
}]);
