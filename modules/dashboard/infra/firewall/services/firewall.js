"use strict";
var infraFirewallSrv = soajsApp.components;
infraFirewallSrv.service('infraFirewallSrv', ['ngDataApi', '$localStorage', '$timeout', '$modal', '$window', function (ngDataApi, $localStorage, $timeout, $modal, $window) {
	
	function addFirewall(currentScope) {
		
		$modal.open({
			templateUrl: "addFirewall.tmpl",
			size: 'm',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				
				$scope.close = function () {
					$modalInstance.close();
				};
				
				$scope.createNetwork = function () {
					$window.location.href = "#/infra-networks?group=" + currentScope.selectedGroup.name;
					$modalInstance.close();
				};
			}
		});
	}
	
	function editFirewall(currentScope, originalFirewall) {
		
		let oneFirewall = angular.copy(originalFirewall);
		oneFirewall.region = currentScope.selectedGroup.region;
		
		let options = {
			timeout: $timeout,
			form: {
				"entries": angular.copy(infraFirewallConfig.form.firewall)
			},
			data: oneFirewall,
			name: 'editFirewall',
			label: 'Edit Firewall',
			actions: [
				{
					'type': 'submit',
					'label': "Update Firewall",
					'btn': 'primary',
					'action': function (formData) {
						let data = angular.copy(formData);
						let firewallPorts = [];
						for (let i = 0; i < currentScope.portsCounter; i++) {
							if (data['name' + i]) {
								let portEntry = {
									name: data['name' + i],
									protocol: data['protocol' + i],
									access: data['access' + i],
									direction: data['direction' + i],
									target: data['target' + i],
									sourceAddress: data['sourceAddress' + i],
									destinationAddress: data['destinationAddress' + i],
									published: data['published' + i],
									priority: data['priority' + i]
								};
								
								firewallPorts.push(portEntry);
							}
						}
						
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
									"region": currentScope.selectedGroup.region,
									"group": currentScope.selectedGroup.name,
									"name": data.name,
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
									listFirewalls(currentScope, currentScope.selectedGroup);
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
				tmp.label = "Port " + oneFirewall.ports[i].name;
				tmp.entries.forEach((onePortDetail) => {
					let originalName = onePortDetail.name;
					onePortDetail.name += i;
					oneFirewall[onePortDetail.name] = oneFirewall.ports[i][originalName];
				});
				
				tmp.entries.unshift({
					'type': 'html',
					'name': 'rLabel' + i,
					'value': '<span class="icon icon-cross"></span>',
					'onAction': function (id, value, form) {
						let count = parseInt(id.replace('rLabel', ''));
						for (let i = form.entries[2].entries.length - 1; i >= 0; i--) {
							if (form.entries[2].entries[i].name === 'portGroup' + count) {
								//remove from formData
								tmp.entries.forEach((field) => {
									delete form.formData[field.name];
								});
								
								//remove from formEntries
								form.entries[2].entries.splice(i, 1);
								break;
							}
						}
					}
				});
				
				//push new entry before the last one, making sure add button remains at the bottom
				options.form.entries[2].entries.splice(options.form.entries[2].entries.length - 1, 0, tmp);
			}
		}
		
		//attach the add another button
		options.form.entries[2].entries[options.form.entries[2].entries.length - 1].onAction = function (id, value, form) {
			addNewPort(currentScope);
		};
		
		buildFormWithModal(currentScope, $modal, options, () => {
			//fill in labels after form is rendered
			currentScope.form.formData = oneFirewall;
		});
	}
	
	function addNewPort(currentScope) {
		let counter = currentScope.portsCounter || 0;
		
		let tmp = angular.copy(infraFirewallConfig.form.portInput);
		tmp.name += counter;
		tmp.collapsed = false;
		tmp.icon = "minus";
		tmp.entries.forEach((onePortDetail) => {
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
				for (let i = form.entries[2].entries.length - 1; i >= 0; i--) {
					if (form.entries[2].entries[i].name === 'portGroup' + count) {
						//remove from formData
						tmp.entries.forEach((field) => {
							delete form.formData[field.name];
						});
						
						//remove from formEntries
						form.entries[2].entries.splice(i, 1);
						break;
					}
				}
			}
		});
		
		currentScope.form.entries[2].entries.splice(currentScope.form.entries[2].entries.length - 1, 0, tmp);
		currentScope.portsCounter++;
	}
	
	function deleteFirewall(currentScope, oneFirewall) {
		
		let deleteFireWallOpts = {
			method: 'delete',
			routeName: '/dashboard/infra/extras',
			params: {
				'infraId': currentScope.$parent.$parent.currentSelectedInfra._id,
				'technology': 'vm',
				'section': 'securityGroup',
				'group': currentScope.selectedGroup.name,
				'name': oneFirewall.name
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
					listFirewalls(currentScope, currentScope.selectedGroup);
				}, 2000);
			}
		});
	}
	
	function listFirewalls(currentScope, oneGroup) {
		let oneInfra = currentScope.$parent.$parent.currentSelectedInfra;
		
		//save selected group in scope to be accessed by other functions
		currentScope.selectedGroup = oneGroup;
		
		//clean grid from previous list if any
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
				'extras[]': ['securityGroups']
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
				currentScope.infraSecurityGroups[0].open = true;
				
				if (currentScope.vmlayers) {
					let processedNetworks = [];
					currentScope.infraSecurityGroups.forEach((oneSecurityGroup) => {
						currentScope.vmlayers.forEach((oneVmLayer) => {
							if (oneVmLayer.labels && oneVmLayer.labels['soajs.service.vm.group'].toLowerCase() === oneGroup.name.toLowerCase()) {
								
								if (oneVmLayer.securityGroup && oneVmLayer.securityGroup === oneSecurityGroup.name) {
									
									if(!oneSecurityGroup.vmLayers){
										oneSecurityGroup.vmLayers = [];
									}
									
									if(oneVmLayer.labels&& oneVmLayer.labels['soajs.env.code']){
										let found = false;
										$localStorage.environments.forEach((oneEnv) => {
											if (oneEnv.code.toUpperCase() === oneVmLayer.labels['soajs.env.code'].toUpperCase()) {
												found = true;
											}
										});
										oneSecurityGroup.vmLayers.push({
											vmLayer: oneVmLayer.layer,
											group: oneGroup.name,
											envCode: oneVmLayer.labels['soajs.env.code'],
											region: oneVmLayer.labels['soajs.service.vm.location'],
											link: found
										});
									}
									else{
										oneSecurityGroup.vmLayers.push({
											vmLayer: oneVmLayer.layer,
											group: oneGroup.name,
											link: false
										});
									}
									
									if(!oneSecurityGroup.networks){
										oneSecurityGroup.networks = [];
									}
									
									if(processedNetworks.indexOf(oneVmLayer.network) === -1){
										processedNetworks.push(oneVmLayer.network);
										oneSecurityGroup.networks.push({
											group: oneGroup.name,
											name: oneVmLayer.network
										});
									}
								}
							}
						});
					});
				}
			}
		});
	}
	
	return {
		'addFirewall': addFirewall,
		'editFirewall': editFirewall,
		'deleteFirewall': deleteFirewall,
		'listFirewalls': listFirewalls
	};
}]);
