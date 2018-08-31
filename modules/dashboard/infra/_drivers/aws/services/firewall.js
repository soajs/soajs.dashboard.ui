"use strict";
var awsInfraFirewallSrv = soajsApp.components;
awsInfraFirewallSrv.service('awsInfraFirewallSrv', ['ngDataApi', '$localStorage', '$timeout', '$modal', '$window', 'injectFiles', function (ngDataApi, $localStorage, $timeout, $modal, $window, injectFiles) {

	const ipv4CIDRRegex = new RegExp(/^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$/g);
	const ipv6CIDRRegex = new RegExp(/^s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:)))(%.+)?s*(\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8]))?$/g);

	let infraFirewallConfig = {
		form: {
			firewall: [
				{
					'name': 'name',
					'label': 'Name',
					'value': "",
					'placeholder': 'My Firewall',
					'required': true
				},
				{
					'name': 'region',
					'label': 'Region',
					'type': 'readonly',
					'value': "",
					'required': true
				},
				{
					'name': 'description',
					'label': 'Description',
					'type': 'text',
					'value': "",
					'required': true,
					'placeholder': ''
				},
				{
					'name': 'networkId',
					'label': 'Network',
					'type': 'select',
					'value': [],
					'required': true,
					'placeholder': ''
				},
				{
					'type': 'accordion',
					'name': 'firewallPorts',
					'label': 'Ports',
					'entries': [
						{
							'type': 'html',
							'name': 'addPort',
							'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add New Port'/>"
						}
					]
				}
			],
			portInput: {
				'name': 'portGroup',
				'type': 'group',
				'label': 'New Port',
				'collapsed': true,
				'icon': 'plus',
				'entries': [
					{
						'name': 'protocol',
						'label': 'Protocol',
						'type': 'select',
						'value': [
							{'v': 'tcp', 'l': "TCP", 'selected': true},
							{'v': 'udp', 'l': "UDP"},
							{'v': 'icmp', 'l': "ICMP"},
							{'v': '*', 'l': "All Protocols"}
						],
						'required': true,
						'tooltip': 'Select Port Protocol',
						'fieldMsg': 'Select Port Protocol'
					},
					{
						'name': 'publishedPortRange',
						'label': 'Destination Port',
						'type': 'text',
						'value': "",
						'required': true,
						'placeholder': "80",
						'fieldMsg': 'example: 0 - 65535 or 8080'
					},
					{
						'name': 'source',
						'label': 'Source Address',
						'type': 'text',
						'value': '0.0.0.0/0, ::/0',
						'required': true,
						'fieldMsg': 'example: 0.0.0.0/0, ::/0'
					},
					{
						'name': 'access',
						'label': 'Access',
						'type': 'select',
						'value': [
							{'v': 'allow', 'l': "Allow", 'selected': true}
						],
						'required': true
					},
					{
						'name': 'direction',
						'label': 'Direction',
						'type': 'select',
						'value': [
							{'v': 'inbound', 'l': "Incoming Traffic", 'selected': true},
							{'v': 'outbound', 'l': "Outgoing Traffic"}
						],
						'required': true
					}
				]
			}
		}
	};

	function addFirewall(currentScope) {
		loadExtras(currentScope, () => {
			let options = {
				timeout: $timeout,
				form: {
					"entries": angular.copy(infraFirewallConfig.form.firewall)
				},
				name: 'awsAddFirewall',
				label: 'Add Firewall',
				actions: [
					{
						'type': 'submit',
						'label': "Add Firewall",
						'btn': 'primary',
						'action': function (formData) {
							let data = angular.copy(formData);
							let computePortsOutput = computePorts(currentScope, data);

							if(computePortsOutput.validationError) {
								currentScope.form.displayAlert('danger', computePortsOutput.validationError);
								return;
							}

							let firewallPorts = computePortsOutput.firewallPorts;

							let postOpts = {
								"method": "post",
								"routeName": "/dashboard/infra/extras",
								"params": {
									"infraId": currentScope.currentSelectedInfra._id,
									"technology": "vm"
								},
								"data": {
									"params": {
										"section": "securityGroup",
										"region": currentScope.selectedRegion,
										"name": data.name,
										"description": data.description,
										"network": data.networkId,
										"ports": firewallPorts
									}
								}
							};

							overlayLoading.show();
							getSendDataFromServer(currentScope, ngDataApi, postOpts, function (error) {
								overlayLoading.hide();
								if (error) {
									currentScope.form.displayAlert('danger', error.message);
								}
								else {
									currentScope.modalInstance.close();
									currentScope.displayAlert('success', `The firewall has been successfully created. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.`);
									$timeout(() => {
										listFirewalls(currentScope, currentScope.selectedRegion);
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

			//build ui to modify and configure ports
			currentScope.portsCounter = 0;

			//attach the add another button
			options.form.entries[4].entries[options.form.entries[4].entries.length - 1].onAction = function (id, value, form) {
				addNewPort(currentScope);
			};

			//add networks list to form
			let networksEntry = options.form.entries.find((oneEntry) => { return oneEntry.name === 'networkId' });
			if(networksEntry) {
				networksEntry.value = currentScope.networks;
			}

			options.form.entries[1].value = currentScope.selectedRegion;
			buildFormWithModal(currentScope, $modal, options, () => {
				//fill in labels after form is rendered
			});
		});
	}

	function editFirewall(currentScope, originalFirewall) {
		let oneFirewall = angular.copy(originalFirewall);
		oneFirewall.region = currentScope.selectedRegion;

		if(oneFirewall.ports && Array.isArray(oneFirewall.ports) && oneFirewall.ports.length > 0) {
			oneFirewall.ports.forEach((onePort) => {
				let stringifiedSources = '';
				if(onePort.source && Array.isArray(onePort.source) && onePort.source.length > 0) {
					stringifiedSources += onePort.source.join(', ');
				}
				if(onePort.ipv6 && Array.isArray(onePort.ipv6) && onePort.ipv6.length > 0) {
					stringifiedSources += onePort.ipv6.join(', ');
				}
			});
		}

		loadExtras(currentScope, () => {
			let options = {
				timeout: $timeout,
				form: {
					"entries": angular.copy(infraFirewallConfig.form.firewall)
				},
				data: oneFirewall,
				name: 'awsModifyFirewall',
				label: 'Edit Firewall',
				actions: [
					{
						'type': 'submit',
						'label': "Update Firewall",
						'btn': 'primary',
						'action': function (formData) {
							let data = angular.copy(formData);
							let computePortsOutput = computePorts(currentScope, data);

							if(computePortsOutput.validationError) {
								currentScope.form.displayAlert('danger', computePortsOutput.validationError);
								return;
							}

							let firewallPorts = computePortsOutput.firewallPorts;

							let postOpts = {
								"method": "put",
								"routeName": "/dashboard/infra/extras",
								"params": {
									"infraId": currentScope.currentSelectedInfra._id,
									"technology": "vm"
								},
								"data": {
									"params": {
										"section": "securityGroup",
										"region": currentScope.selectedRegion,
										"id": oneFirewall.id,
										"ports": firewallPorts
									}
								}
							};

							overlayLoading.show();
							getSendDataFromServer(currentScope, ngDataApi, postOpts, function (error) {
								overlayLoading.hide();
								if (error) {
									currentScope.form.displayAlert('danger', error.message);
								}
								else {
									currentScope.modalInstance.close();
									currentScope.displayAlert('success', `The firewall has been successfully updated. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.`);
									$timeout(() => {
										listFirewalls(currentScope, currentScope.selectedRegion);
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

			//build ui to modify and configure ports
			currentScope.portsCounter = 0;
			for (let i = 0; i < oneFirewall.ports.length; i++) {
				if (!oneFirewall.ports[i].readonly) {
					currentScope.portsCounter++;
					//add labels to the form based on label counters
					let tmp = angular.copy(infraFirewallConfig.form.portInput);

					tmp.name += i;
					tmp.label = "Port " + oneFirewall.ports[i].publishedPortRange;
					tmp.entries.forEach((onePortDetail) => {
						let originalName = onePortDetail.name;
						onePortDetail.name += i;

						if(originalName === 'source') {
							oneFirewall[onePortDetail.name] = '';
							if(oneFirewall.ports[i]['source'] && Array.isArray(oneFirewall.ports[i]['source']) && oneFirewall.ports[i]['source'].length > 0) {
								oneFirewall[onePortDetail.name] += oneFirewall.ports[i]['source'].join(', ');
							}
							if(oneFirewall.ports[i]['ipv6'] && Array.isArray(oneFirewall.ports[i]['ipv6']) && oneFirewall.ports[i]['ipv6'].length > 0) {
								oneFirewall[onePortDetail.name] += ', ' + oneFirewall.ports[i]['ipv6'].join(', ');
							}
						}
						else {
							oneFirewall[onePortDetail.name] = oneFirewall.ports[i][originalName];
						}
					});

					tmp.entries.unshift({
						'type': 'html',
						'name': 'rLabel' + i,
						'value': '<span class="icon icon-cross"></span>',
						'onAction': function (id, value, form) {
							let count = parseInt(id.replace('rLabel', ''));
							for (let i = form.entries[4].entries.length - 1; i >= 0; i--) {
								if (form.entries[4].entries[i].name === 'portGroup' + count) {
									//remove from formData
									tmp.entries.forEach((field) => {
										delete form.formData[field.name];
									});

									//remove from formEntries
									form.entries[4].entries.splice(i, 1);
									break;
								}
							}
						}
					});

					//push new entry before the last one, making sure add button remains at the bottom
					options.form.entries[4].entries.splice(options.form.entries[4].entries.length - 1, 0, tmp);
				}
			}

			//attach the add another button
			options.form.entries[4].entries[options.form.entries[4].entries.length - 1].onAction = function (id, value, form) {
				addNewPort(currentScope);
			};

			//add networks list to form
			let networksEntry = options.form.entries.find((oneEntry) => { return oneEntry.name === 'networkId' });
			if(networksEntry) {
				networksEntry.value = currentScope.networks;
				networksEntry.disabled = true;
			}

			//disable discription editing
			let descriptionEntry = options.form.entries.find((oneEntry) => { return oneEntry.name === 'description' });
			if(descriptionEntry) {
				descriptionEntry.disabled = true;
			}

			buildFormWithModal(currentScope, $modal, options, () => {
				//fill in labels after form is rendered
				currentScope.form.entries[0].type = 'readonly';
				currentScope.form.entries[0].type = 'readonly';
				currentScope.form.formData = oneFirewall;
			});
		});
	}

	function addNewPort(currentScope) {
		let counter = currentScope.portsCounter || 0;

		let tmp = angular.copy(infraFirewallConfig.form.portInput);
		tmp.name += counter;
		tmp.collapsed = false;
		tmp.icon = "minus";
		tmp.entries.forEach((onePortDetail) => {
			if(onePortDetail.name === 'protocol') {
				onePortDetail.onAction = selectProtocol;
			}
			onePortDetail.name += counter;

			if (!currentScope.form.formData[onePortDetail.name]) {

				let defaultValue;
				if (Array.isArray(onePortDetail.value)) {
					onePortDetail.value.forEach((oneV) => {
						if (oneV.selected) {
							defaultValue = oneV.v;
						}
					});
					if (!defaultValue) {
						defaultValue = onePortDetail.value[0].v;
					}
				}
				else {
					defaultValue = onePortDetail.value
				}
				currentScope.form.formData[onePortDetail.name] = defaultValue;
			}
		});

		tmp.entries.unshift({
			'type': 'html',
			'name': 'rLabel' + counter,
			'value': '<span class="icon icon-cross"></span>',
			'onAction': function (id, value, form) {
				let count = parseInt(id.replace('rLabel', ''));
				for (let i = form.entries[4].entries.length - 1; i >= 0; i--) {
					if (form.entries[4].entries[i].name === 'portGroup' + count) {
						//remove from formData
						tmp.entries.forEach((field) => {
							delete form.formData[field.name];
						});

						//remove from formEntries
						form.entries[4].entries.splice(i, 1);
						break;
					}
				}
			}
		});

		currentScope.form.entries[4].entries.splice(currentScope.form.entries[4].entries.length - 1, 0, tmp);
		currentScope.portsCounter++;
	}

	function selectProtocol(id, value, form) {
		let index = id.replace('protocol', '');
		let portsGroup = form.entries.find((oneEntry) => { return oneEntry.name === `firewallPorts` });
		if(portsGroup && portsGroup.entries) {
			let portEntry = portsGroup.entries.find((oneEntry) => { return oneEntry.name === `portGroup${index}` });
			if(portEntry && portEntry.entries) {
				let destinationPort = portEntry.entries.find((oneEntry) => { return oneEntry.name === `publishedPortRange${index}` });
				if(destinationPort) {
					if(value === '*') {
						form.formData[`publishedPortRange${index}`] = '0 - 65535';
						destinationPort.disabled = true;
					}
					else {
						destinationPort.disabled = false;
					}
				}
			}
		}
	}

	function loadExtras(currentScope, cb) {
		let listOptions = {
			method: 'get',
			routeName: '/dashboard/infra/extras',
			params: {
				'id': currentScope.$parent.$parent.currentSelectedInfra._id,
				'region': currentScope.selectedRegion,
				'extras[]': ['networks']
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, listOptions, (error, response) => {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error);
			}
			else {
				currentScope.networks = [];
				if(response.networks) {
					currentScope.networks = response.networks.map((oneNetwork) => {
						return { v: oneNetwork.id, l: oneNetwork.name };
					});
				}

				return cb();
			}
		});
	}

	function deleteFirewall(currentScope, oneFirewall) {

		let deleteFireWallOpts = {
			method: 'delete',
			routeName: '/dashboard/infra/extras',
			params: {
				'infraId': currentScope.$parent.$parent.currentSelectedInfra._id,
				'technology': 'vm',
				'section': 'securityGroup',
				'region': currentScope.selectedRegion,
				'id': oneFirewall.id
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
				currentScope.displayAlert('success', `The firewall has been successfully deleted. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.`);
				$timeout(() => {
					listFirewalls(currentScope, currentScope.selectedRegion);
				}, 2000);
			}
		});
	}

	function listFirewalls(currentScope, oneRegion) {
		let oneInfra = currentScope.$parent.$parent.currentSelectedInfra;

		//save selected region in scope to be accessed by other functions
		currentScope.selectedRegion = oneRegion;

		let listOptions = {
			method: 'get',
			routeName: '/dashboard/infra/extras',
			params: {
				'id': oneInfra._id,
				'region': oneRegion,
				'extras[]': ['securityGroups', 'networks']
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, listOptions, (error, response) => {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error);
			}
			else {
				currentScope.infraSecurityGroups = [];
				if (response.securityGroups && response.securityGroups.length > 0) {
					currentScope.infraSecurityGroups = response.securityGroups;
				}

				if (currentScope.infraSecurityGroups.length > 0) {
					currentScope.infraSecurityGroups[0].open = true;
				}

				currentScope.infraSecurityGroups.forEach((oneSecurityGroup) => {

					oneSecurityGroup.ports.forEach((onePort) => {
						onePort.publishedPortRange = `${onePort.published} - ${onePort.range}`;
						if(onePort.published === onePort.range || onePort.protocol === '*') {
							onePort.publishedPortRange = onePort.published.toString();
						}
					});

					if(oneSecurityGroup.networkId && response.networks && Array.isArray(response.networks) && response.networks.length > 0) {
						let matchingNetwork = response.networks.find((oneNetwork) => { return oneNetwork.id === oneSecurityGroup.networkId });
						if(matchingNetwork) {
							oneSecurityGroup.networkInfo = {
								id: matchingNetwork.id,
								name: matchingNetwork.name,
								region: matchingNetwork.region
							};
						}
					}

					if (currentScope.vmlayers) {
						currentScope.vmlayers.forEach((oneVmLayer) => {
							if (oneVmLayer.labels && oneVmLayer.labels['soajs.service.vm.location'] && oneVmLayer.labels['soajs.service.vm.location'].toLowerCase() === oneRegion.toLowerCase()) {

								if (oneVmLayer.securityGroup && oneVmLayer.securityGroup === oneSecurityGroup.name) {

									if (!oneSecurityGroup.vmLayers) {
										oneSecurityGroup.vmLayers = [];
									}

									if (oneVmLayer.labels && oneVmLayer.labels['soajs.env.code']) {
										let found = false;
										$localStorage.environments.forEach((oneEnv) => {
											if (oneEnv.code.toUpperCase() === oneVmLayer.labels['soajs.env.code'].toUpperCase()) {
												found = true;
											}
										});
										oneSecurityGroup.vmLayers.push({
											vmLayer: oneVmLayer.layer,
											envCode: oneVmLayer.labels['soajs.env.code'],
											region: oneVmLayer.labels['soajs.service.vm.location'],
											link: found
										});
									}
									else {
										oneSecurityGroup.vmLayers.push({
											vmLayer: oneVmLayer.layer,
											region: oneRegion,
											link: false
										});
									}
								}
							}
						});
					}
				});
			}
		});
	}

	function computePorts(currentScope, data) {
		let firewallPorts = [], validationError = '';
		for (let i = 0; i < currentScope.portsCounter; i++) {
			if (data['publishedPortRange' + i]) {
				let portEntry = {
					protocol: data['protocol' + i],
					access: data['access' + i],
					direction: data['direction' + i],
					source: [],
					ipv6: [],
					published: '',
					range: ''
				};

				if(data['source' + i]) {
					let sources = data['source' + i].split(',');
					sources.forEach((oneSource) => {
						oneSource = oneSource.trim();
						if(oneSource.match(ipv4CIDRRegex)) {
							portEntry.source.push(oneSource);
						}
						else if(oneSource.match(ipv6CIDRRegex)) {
							portEntry.ipv6.push(oneSource);
						}
						else {
							validationError = `${oneSource} is not a valid IPv4 or IPv6 CIDR`;
						}
					});
				}

				if(data['publishedPortRange' + i]) {
					if(data['publishedPortRange' + i].includes('-')) {
						let portsRange = data['publishedPortRange' + i].split('-');
						if(portsRange.length > 2) {
							validationError = `Invalid port range ${data['publishedPortRange' + i]}`;
							break;
						}

						portsRange = portsRange.map((onePort) => { return parseInt(onePort.trim()); });
						if(isNaN(portsRange[0]) || isNaN(portsRange[1])) {
							validationError = `Invalid ports input ${data['publishedPortRange' + i]}. Ports should be numbers between 0 and 65535`;
							break;
						}

						if(portsRange[0] < 0 || portsRange[0] > 65535) {
							validationError = `Invalid port value for ${portsRange[0]}. Ports should be numbers between 0 and 65535`;
							break;
						}

						if(portsRange[1] < 0 || portsRange[1] > 65535) {
							validationError = `Invalid port value for ${portsRange[1]}. Ports should be numbers between 0 and 65535`;
							break;
						}

						if(portsRange[0] < portsRange[1]) {
							portEntry.published = portsRange[0];
							portEntry.range = portsRange[1];
						}
						else if(portsRange[0] > portsRange[1]) {
							portEntry.published = portsRange[1];
							portEntry.range = portsRange[0];
						}
						else {
							// ports are identical
							portEntry.published = portsRange[0];
							portEntry.range = portsRange[0];
						}
					}
					else {
						let portNumber = data['publishedPortRange' + i];

						if(portNumber === '*') {
							portEntry.published = portNumber;
							portEntry.range = portNumber;
						}
						else {
							portNumber = parseInt(portNumber);

							if(isNaN(portNumber)) {
								validationError = `Invalid ports input ${data['publishedPortRange' + i]}. Ports should be numbers between 0 and 65535`;
								break;
							}

							if(portNumber < 0 || portNumber > 65535) {
								validationError = `Invalid port value for ${portNumber}. Ports should be numbers between 0 and 65535`;
								break;
							}

							portEntry.published = portNumber;
							portEntry.range = portNumber;
						}
					}
				}
				firewallPorts.push(portEntry);
			}
		}

		return { firewallPorts, validationError };
	}

	return {
		'addFirewall': addFirewall,
		'editFirewall': editFirewall,
		'deleteFirewall': deleteFirewall,
		'listFirewalls': listFirewalls
	};
}]);
