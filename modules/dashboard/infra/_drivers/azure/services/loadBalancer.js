"use strict";
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
						'placeholder': "My Address Pool"
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
						'type': 'uiselect',
						'value': [{'l': 'Static', 'v': 'static'}, {'l': 'Dynamic', 'v': 'dynamic'}],
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
									privateIpField.hidden = (value.v === 'dynamic');
									privateIpField.required = (value.v === 'dynamic');
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
						'placeholder': "" // TODO: fix proper placeholder
					},
					{
						'name': 'isPublic',
						'label': 'I want the IP to be public',
						'fieldMsg': "Turn this slider on to make the IP public",
						'type': 'buttonSlider',
						'value': false,
						'required': true,
						onAction: function (name, value, form) {
							//todo: subnets are available on line 595
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
									
									publicIpField.required = !value;
									subnetIdField.required = value;
								}
							}
						}
					},
					{
						'name': 'publicIpAddressId',
						'label': 'Public IP Address',
						'type': 'select',
						'value': [], //TODO this should be the list of available public  ip addresses
						'required': false,
						'hidden': true,
						'tooltip': 'Choose a public IP address',
						'fieldMsg': 'Choose a public IP address',
						'placeholder': "" // TODO: fix proper placeholder
					},
					{
						'name': 'subnetId',
						'label': 'Subnet',
						'type': 'select',
						'value': [], //this should be the list of available subnets, might also need to list networks to get the subnets
						'required': false, // TODO: this should become true if the previous slider was on
						'tooltip': 'Enter a subnet for the public IP address', //// TODO: confirm if this is correct
						'fieldMsg': 'Enter a subnet for the public IP address', //// TODO: confirm if this is correct
						'placeholder': "" // TODO: fix proper placeholder
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
						'name': 'portIdleTimeoutInMinutes',
						'label': 'Idle Timeout in Minutes',
						'type': 'number',
						'value': 1,
						'placeholder': '1',
						'required': true,
						'tooltip': '',
						'fieldMsg': ''
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
						'type': 'uiselect',
						'value': [
							{
								'v': 'Default',
								'l': 'Default'
							},
							{
								'v': 'SourceIP',
								'l': 'Source IP'
							},
							{
								'v': 'SourceIPProtocol',
								'l': 'Source IP Protocol'
							}
						],
						'required': true,
						'tooltip': '',
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
						'name': 'natRuleIdleTimeoutInMinutes',
						'label': 'Idle Timeout in Minutes',
						'type': 'number',
						'value': 1,
						'placeholder': '1',
						'required': true,
						'tooltip': '',
						'fieldMsg': ''
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
						'name': 'natPoolIdleTimeoutInMinutes',
						'label': 'Idle Timeout in Minutes',
						'type': 'number',
						'value': 1,
						'placeholder': '1',
						'required': true,
						'tooltip': '',
						'fieldMsg': ''
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
		currentScope.vmlayers.forEach((oneVMLayer) => {
			
			if(oneVMLayer.labels && oneVMLayer.labels['soajs.service.vm.group'].toLowerCase() === currentScope.selectedGroup.name.toLowerCase()){
				if(processed.indexOf(oneVMLayer.layer) === -1){
					processed.push(oneVMLayer.layer);
					subnets.push({v: oneVMLayer.layer, l: oneVMLayer.layer});
				}
			}
		});
		
		return cb(subnets);
	}
	
	function loadAndReturnPublicIPs(currentScope, cb){
		let listOptions = {
			method: 'get',
			routeName: '/dashboard/infra/extras',
			params: {
				'id': currentScope.currentSelectedInfra._id,
				'group': currentScope.selectedGroup.name,
				'extras[]': ['publicIps']
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
							infraPublicIps.push({'v': onePublicIP.name, 'l': onePublicIP.name});
						}
					});
				}
				return cb(infraPublicIps);
			}
		});
	}
	
	function addNewPort(currentScope, ipRuleCounter, defaultValues){
		let ipRulePortsCounter = currentScope.ipRuleCounter['iprule_' + ipRuleCounter].portCounter;
		let tmp = angular.copy(infraLoadBalancerConfig.form.portsInput);
		tmp.name += ipRulePortsCounter;
		tmp.entries.forEach((oneEntry) => {
			oneEntry.name += ipRulePortsCounter;
		});
		
		//rIPRulePort
		tmp.entries[tmp.entries.length -1].onAction = function (id, value, form) {
			let count = parseInt(id.replace('rIPRulePort', ''));
			
			for (let i = form.entries[3].entries[0].entries[6].entries.length - 1; i >= 0; i--) {
				if (form.entries[3].entries[0].entries[6].entries[i].name === 'ipRulePortsGroup' + count) {
					
					//remove from formData
					form.entries[3].entries[0].entries[6].entries[i].entries.forEach((oneEntry) => {
						delete form.formData[oneEntry.name + count];
					});
					
					//remove from formEntries
					form.entries[3].entries[0].entries[6].entries.splice(i, 1);
					break;
				}
			}
		};
		
		if(defaultValues) {
			currentScope.form.formData['portName' + ipRuleCounter] = defaultValues.name;
			currentScope.form.formData['portProtocol' + ipRuleCounter] = defaultValues.protocol;
			currentScope.form.formData['portPublished' + ipRuleCounter] = defaultValues.published;
			currentScope.form.formData['portTarget' + ipRuleCounter] = defaultValues.target;
			currentScope.form.formData['portIdleTimeoutInMinutes' + ipRuleCounter] = defaultValues.idleTimeoutInMinutes;
			currentScope.form.formData['portEnableFloatingIP' + ipRuleCounter] = defaultValues.enableFloatingIP;
			currentScope.form.formData['portLoadDistribution' + ipRuleCounter] = defaultValues.loadDistribution;
		}
		
		if (currentScope.form && currentScope.form.entries) {
			currentScope.form.entries[3].entries[0].entries[6].entries.splice(currentScope.form.entries[3].entries[0].entries[6].entries.length - 1, 0, tmp);
		}
		currentScope.ipRuleCounter['iprule_' + ipRuleCounter].portCounter++;
	}
	
	function addNewNATRule(currentScope, ipRuleCounter, defaultValues){
		let ipRulePortsCounter = currentScope.ipRuleCounter['iprule_' + ipRuleCounter].natRuleCounter;
		let tmp = angular.copy(infraLoadBalancerConfig.form.NATRule);
		tmp.name += ipRulePortsCounter;
		tmp.entries.forEach((oneEntry) => {
			oneEntry.name += ipRulePortsCounter;
		});
		
		//rIPRulePort
		tmp.entries[tmp.entries.length -1].onAction = function (id, value, form) {
			let count = parseInt(id.replace('rIPRuleNatRule', ''));
			
			for (let i = form.entries[3].entries[0].entries[7].entries.length - 1; i >= 0; i--) {
				if (form.entries[3].entries[0].entries[7].entries[i].name === 'ipRuleNATRuleGroup' + count) {
					
					//remove from formData
					form.entries[3].entries[0].entries[7].entries[i].entries.forEach((oneEntry) => {
						delete form.formData[oneEntry.name + count];
					});
					
					//remove from formEntries
					form.entries[3].entries[0].entries[7].entries.splice(i, 1);
					break;
				}
			}
		};
		
		if(defaultValues) {
			currentScope.form.formData['natRuleName' + ipRuleCounter] = defaultValues.name;
			currentScope.form.formData['natRuleProtocol' + ipRuleCounter] = defaultValues.protocol;
			currentScope.form.formData['natRuleFrontendPort' + ipRuleCounter] = defaultValues.frontendPort;
			currentScope.form.formData['natRuleBackendPort' + ipRuleCounter] = defaultValues.backendPort;
			currentScope.form.formData['natRuleIdleTimeoutInMinutes' + ipRuleCounter] = defaultValues.idleTimeout;
			currentScope.form.formData['natRuleEnableFloatingIP' + ipRuleCounter] = defaultValues.enableFloatingIP;
		}
		
		if (currentScope.form && currentScope.form.entries) {
			currentScope.form.entries[3].entries[0].entries[7].entries.splice(currentScope.form.entries[3].entries[0].entries[7].entries.length - 1, 0, tmp);
		}
		currentScope.ipRuleCounter['iprule_' + ipRuleCounter].natRuleCounter++;
	}
	
	function addNewNATPool(currentScope, ipRuleCounter, defaultValues){
		let ipRulePortsCounter = currentScope.ipRuleCounter['iprule_' + ipRuleCounter].natPoolCounter;
		let tmp = angular.copy(infraLoadBalancerConfig.form.NATPool);
		tmp.name += ipRulePortsCounter;
		tmp.entries.forEach((oneEntry) => {
			oneEntry.name += ipRulePortsCounter;
		});
		
		//rIPRulePort
		tmp.entries[tmp.entries.length -1].onAction = function (id, value, form) {
			let count = parseInt(id.replace('rIPRuleNatPool', ''));
			
			for (let i = form.entries[3].entries[0].entries[8].entries.length - 1; i >= 0; i--) {
				if (form.entries[3].entries[0].entries[8].entries[i].name === 'ipRuleNATPoolGroup' + count) {
					
					//remove from formData
					form.entries[3].entries[0].entries[8].entries[i].entries.forEach((oneEntry) => {
						delete form.formData[oneEntry.name + count];
					});
					
					//remove from formEntries
					form.entries[3].entries[0].entries[8].entries.splice(i, 1);
					break;
				}
			}
		};
		
		if(defaultValues) {
			currentScope.form.formData['natPoolName' + ipRuleCounter] = defaultValues.name;
			currentScope.form.formData['natPoolProtocol' + ipRuleCounter] = defaultValues.protocol;
			currentScope.form.formData['natPoolFrontendPort' + ipRuleCounter] = defaultValues.frontendPortRangeStart + "-" + defaultValues.frontendPortRangeEnd;
			currentScope.form.formData['natPoolBackendPort' + ipRuleCounter] = defaultValues.backendPort;
			currentScope.form.formData['natPoolIdleTimeoutInMinutes' + ipRuleCounter] = defaultValues.idleTimeout;
			currentScope.form.formData['natPoolEnableFloatingIP' + ipRuleCounter] = defaultValues.enableFloatingIP;
		}
		
		if (currentScope.form && currentScope.form.entries) {
			currentScope.form.entries[3].entries[0].entries[8].entries.splice(currentScope.form.entries[3].entries[0].entries[8].entries.length - 1, 0, tmp);
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
		
		tmp.entries[5].value = angular.copy(subnets);
		if(tmp.entries[5].value.length > 0){
			tmp.entries[5].value[0].selected = true;
		}
		
		tmp.entries[4].value = angular.copy(publicIps);
		if(tmp.entries[4].value.length > 0){
			tmp.entries[4].value[0].selected = true;
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
						if (form.entries[3].entries[i].entries[6].entries[j].name === 'ipRulePortsGroup' + count) {
							form.entries[3].entries[i].entries[6].entries[j].entries.forEach((oneEntry) => {
								delete form.formData[oneEntry.name];
							});
						}
						
						//remove NAT Rules from formData
						if (form.entries[3].entries[i].entries[7].entries[j].name === 'ipRuleNATRuleGroup' + count) {
							form.entries[3].entries[i].entries[7].entries[j].entries.forEach((oneEntry) => {
								delete form.formData[oneEntry.name];
							});
						}
						
						//remove NAT Pools from formData
						if (form.entries[3].entries[i].entries[8].entries[j].name === 'ipRuleNATPoolGroup' + count) {
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
			currentScope.form.formData['ipRuleName' + ipRuleCounter] = oneDefaultIPRuleValue.name;
			currentScope.form.formData['privateIpAllocationMethod' + ipRuleCounter] = oneDefaultIPRuleValue.config.privateIpAllocationMethod;
			currentScope.form.formData['isPublic' + ipRuleCounter] = oneDefaultIPRuleValue.config.isPublic;
			
			//todo: missing subnet and public ip
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
			let count = parseInt(id.replace('rAddressPool', ''));
			
			for (let i = form.entries[2].entries.length - 1; i >= 0; i--) {
				if (form.entries[2].entries[i].name === 'addressPoolGroup' + count) {
					//remove from formData
					for (let fieldname in form.formData) {
						if (['addressPoolName' + count].indexOf(fieldname) !== -1) {
							delete form.formData[fieldname];
						}
					}
					//remove from formEntries
					form.entries[2].entries.splice(i, 1);
					break;
				}
			}
		};
		
		if (currentScope.form && currentScope.form.entries) {
			currentScope.form.entries[2].entries.splice(currentScope.form.entries[2].entries.length - 1, 0, tmp);
		}
		else {
			// formConfig[5].tabs[7].entries.splice(currentScope.form.entries[2].entries.length - 1, 0, tmp);
		}
		
		currentScope.form.formData['addressPoolName' + addressPoolCounter] = oneAddressPoolValue;
		currentScope.addressPoolCounter++;
	}
	
	function addLoadBalancer(currentScope) {
		currentScope.addressPoolCounter = 0;
		currentScope.ipRuleCounter = {};
		
		//load subnets
		loadAndReturnSubnets(currentScope, (subnets) => {
			//load public ips
			loadAndReturnPublicIPs(currentScope, (publicIps) => {
				
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
								console.log(data);
								
								// let labels = {};
								// for (let i = 0; i < currentScope.labelCounter; i ++) {
								// 	labels[data['labelName'+i]] = data['labelValue'+i];
								// }
								
								// let postOpts = {
								// 	"method": "post",
								// 	"routeName": "/dashboard/infra/extras",
								// 	"params": {
								// 		"infraId": currentScope.currentSelectedInfra._id,
								// 		"technology": "vm"
								// 	},
								// 	"data": {
								// 		"params": {
								// 			"section": "publicIp",
								// 			"region": currentScope.selectedGroup.region,
								// 			"labels": {},
								// 			"name": data.name,
								// 			"group": currentScope.selectedGroup.name,
								// 			"publicIPAllocationMethod": data.publicIPAllocationMethod.v,
								// 			"idleTimeout": data.idleTimeout,
								// 			"ipAddressVersion": data.ipAddressVersion.v,
								// 			"type": data.type.v
								// 		}
								// 	}
								// };
								
								// overlayLoading.show();
								// getSendDataFromServer(currentScope, ngDataApi, postOpts, function (error) {
								// 	overlayLoading.hide();
								// 	if (error) {
								// 		currentScope.form.displayAlert('danger', error.message);
								// 	}
								// 	else {
								// 		currentScope.displayAlert('success', "Public IP created successfully. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.");
								// 		currentScope.modalInstance.close();
								// 		$timeout(() => {
								// 			listIPs(currentScope, currentScope.selectedGroup);
								// 		}, 2000);
								// 	}
								// });
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
				
				buildFormWithModal(currentScope, $modal, options);
			});
		});
	}
	
	function editLoadBalancer(currentScope, originalLoadBalancer) {
		let oneLoadBalancer = angular.copy(originalLoadBalancer);
		
		console.log(oneLoadBalancer);
		
		currentScope.addressPoolCounter = 0;
		currentScope.ipRuleCounter = {};
		
		//load subnets
		loadAndReturnSubnets(currentScope, (subnets) => {
			//load public ips
			loadAndReturnPublicIPs(currentScope, (publicIps) => {
				
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
								console.log(data);
								
								// let labels = {};
								// for (let i = 0; i < currentScope.labelCounter; i ++) {
								// 	labels[data['labelName'+i]] = data['labelValue'+i];
								// }
								
								// let postOpts = {
								// 	"method": "post",
								// 	"routeName": "/dashboard/infra/extras",
								// 	"params": {
								// 		"infraId": currentScope.currentSelectedInfra._id,
								// 		"technology": "vm"
								// 	},
								// 	"data": {
								// 		"params": {
								// 			"section": "publicIp",
								// 			"region": currentScope.selectedGroup.region,
								// 			"labels": {},
								// 			"name": data.name,
								// 			"group": currentScope.selectedGroup.name,
								// 			"publicIPAllocationMethod": data.publicIPAllocationMethod.v,
								// 			"idleTimeout": data.idleTimeout,
								// 			"ipAddressVersion": data.ipAddressVersion.v,
								// 			"type": data.type.v
								// 		}
								// 	}
								// };
								
								// overlayLoading.show();
								// getSendDataFromServer(currentScope, ngDataApi, postOpts, function (error) {
								// 	overlayLoading.hide();
								// 	if (error) {
								// 		currentScope.form.displayAlert('danger', error.message);
								// 	}
								// 	else {
								// 		currentScope.displayAlert('success', "Public IP created successfully. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.");
								// 		currentScope.modalInstance.close();
								// 		$timeout(() => {
								// 			listIPs(currentScope, currentScope.selectedGroup);
								// 		}, 2000);
								// 	}
								// });
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
	
	return {
		'addLoadBalancer': addLoadBalancer,
		'editLoadBalancer': editLoadBalancer,
		'deleteLoadBalancer': deleteLoadBalancer,
		'listLoadBalancers': listLoadBalancers
	};
}]);
