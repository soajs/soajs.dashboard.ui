"use strict";
var infraIPSrv = soajsApp.components;
infraIPSrv.service('infraIPSrv', ['ngDataApi', '$localStorage', '$timeout', '$modal', function (ngDataApi, $localStorage, $timeout, $modal) {

	function addIP(currentScope) {
		currentScope.labelCounter = 0;

		let options = {
			timeout: $timeout,
			form: {
				"entries": angular.copy(infraIPConfig.form.addIP)
			},
			name: 'addPublicIP',
			label: 'Add New Public IP',
			actions: [
				{
					'type': 'submit',
					'label': "Create Public IP",
					'btn': 'primary',
					'action': function (formData) {
						let data = angular.copy(formData);

						let labels = {};
						for (let i = 0; i < currentScope.labelCounter; i ++) {
							labels[data['labelName'+i]] = data['labelValue'+i];
						}

						let postOpts = {
							"method": "post",
							"routeName": "/dashboard/infra/extras",
							"params": {
								"infraId": currentScope.currentSelectedInfra._id,
								"technology": "vm"
							},
							"data": {
								"params": {
									"section": "publicIp",
									"region": currentScope.selectedGroup.region,
									"labels": labels,
									"name": data.name,
									"group": currentScope.selectedGroup.name,
									"publicIPAllocationMethod": data.publicIPAllocationMethod.v,
									"idleTimeout": data.idleTimeout,
									"ipAddressVersion": data.ipAddressVersion.v,
									"type": data.type.v
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
								currentScope.displayAlert('success', "Public IP created successfully. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.");
								currentScope.modalInstance.close();
								$timeout(() => {
									listIPs(currentScope, currentScope.selectedGroup);
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

		options.form.entries[6].entries[0].onAction = function (id, value, form) {
			addNewLabel(currentScope);
		};

		//set value of region to selectedRegion
		options.form.entries[1].value = currentScope.selectedGroup.region;

		buildFormWithModal(currentScope, $modal, options);
	}

	function addNewLabel(currentScope) {
		let labelCounter = currentScope.labelCounter;
		let tmp = angular.copy(infraIPConfig.form.labelInput);
		tmp.name += labelCounter;
		tmp.entries[0].name += labelCounter;
		tmp.entries[1].name += labelCounter;
		tmp.entries[2].name += labelCounter;

		tmp.entries[2].onAction = function (id, value, form) {
			let count = parseInt(id.replace('rLabel', ''));

			for (let i = form.entries[6].entries.length - 1; i >= 0; i--) {
				if (form.entries[6].entries[i].name === 'labelGroup' + count) {
					//remove from formData
					for (var fieldname in form.formData) {
						if (['labelName' + count, 'labelValue' + count].indexOf(fieldname) !== -1) {
							delete form.formData[fieldname];
						}
					}
					//remove from formEntries
					form.entries[6].entries.splice(i, 1);
					break;
				}
			}
		};

		if (currentScope.form && currentScope.form.entries) {
			currentScope.form.entries[6].entries.splice(currentScope.form.entries[6].entries.length - 1, 0, tmp);
		}
		else {
			// formConfig[5].tabs[7].entries.splice(currentScope.form.entries[2].entries.length - 1, 0, tmp);
		}
		currentScope.labelCounter ++;
	}

	function editIP(currentScope, originalIP) {
		let oneIP = angular.copy(originalIP);
		currentScope.labelCounter = (oneIP.labels && typeof oneIP.labels === 'object') ? Object.keys(oneIP.labels).length : 0;

		let options = {
			timeout: $timeout,
			form: {
				"entries": angular.copy(infraIPConfig.form.editIP)
			},
			data: oneIP,
			name: 'editPublicIP',
			label: 'Edit Public IP',
			actions: [
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function () {
						delete currentScope.form.formData;
						currentScope.modalInstance.close();
					}
				},
				{
					'type': 'submit',
					'label': "Update Public IP",
					'btn': 'primary',
					'action': function (formData) {
						let data = angular.copy(formData);

						let labels = {};
						for (let i = 0; i < currentScope.labelCounter; i ++) {
							labels[data['labelName'+i]] = data['labelValue'+i];
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
									"section": "publicIp",
									"region": currentScope.selectedGroup.region,
									"labels": labels,
									"name": data.name,
									"group": currentScope.selectedGroup.name,
									"publicIPAllocationMethod": data.publicIPAllocationMethod.v,
									"idleTimeout": data.idleTimeout,
									"ipAddressVersion": data.ipAddressVersion.v,
									"type": data.type.v
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
								currentScope.displayAlert('success', "Resource Group Updated successfully. Changes take a bit of time to be populated and might require you to refresh in the list after a few seconds.");
								currentScope.modalInstance.close();
								$timeout(() => {
									listIPs(currentScope, currentScope.selectedGroup);
								}, 2000);
							}
						});
					}
				}
			]
		};

		//assertion to avoid splicing label entries more than once
		if (options.form.entries[6].entries.length !== currentScope.labelCounter + 1) {
			//set labels
			for (let i = 0; i < currentScope.labelCounter; i++) {
				// change the labels to formData style
				oneIP['labelName'+i] = Object.keys(oneIP.labels)[i];
				oneIP['labelValue'+i] = oneIP.labels[Object.keys(oneIP.labels)[i]];

				//add labels to the form based on label counters
				let tmp = angular.copy(infraIPConfig.form.labelInput);
				tmp.name += i;
				tmp.entries[0].name += i;
				tmp.entries[1].name += i;
				tmp.entries[2].name += i;

				tmp.entries[2].onAction = function (id, value, form) {
					let count = parseInt(id.replace('rLabel', ''));

					for (let i = form.entries[6].entries.length - 1; i >= 0; i--) {
						if (form.entries[6].entries[i].name === 'labelGroup' + count) {
							//remove from formData
							for (var fieldname in form.formData) {
								if (['labelName' + count, 'labelValue' + count].indexOf(fieldname) !== -1) {
									delete form.formData[fieldname];
								}
							}
							//remove from formEntries
							form.entries[6].entries.splice(i, 1);
							break;
						}
					}
				};
				options.form.entries[6].entries.splice(options.form.entries[6].entries.length - 1, 0, tmp);
			}
		}

		options.form.entries[6].entries[currentScope.labelCounter].onAction = function (id, value, form) {
			addNewLabel(currentScope);
		};

		buildFormWithModal(currentScope, $modal, options, () => {
			Object.keys(oneIP).forEach((oneKey) => {
				if (oneKey === 'publicIPAllocationMethod') {
					if (oneIP[oneKey] === "dynamic") {
						oneIP[oneKey] = {'v': 'dynamic', 'l': 'Dynamic'};
					}
					else {
						oneIP[oneKey] = {'v': 'static', 'l': 'Static'};
					}
				}
				if (oneKey === 'ipAddressVersion') {
					if (oneIP[oneKey] === "IPv4") {
						oneIP[oneKey] = {'v': 'IPv4', 'l': 'IPv4'};
					}
					else {
						oneIP[oneKey] = {'v': 'IPv6', 'l': 'IPv6'};
					}
				}
				if (oneKey === 'type') {
					if (oneIP[oneKey] === "basic") {
						oneIP[oneKey] = {'v': 'basic', 'l': 'Basic'};
					}
					else {
						oneIP[oneKey] = {'v': 'standard', 'l': 'Standard'};
					}
				}
			});

			//fill in labels after form is rendered
			currentScope.form.formData = oneIP;
		});
	}

	function deleteIP(currentScope, oneIP) {

		let deleteIPopts = {
			method: 'delete',
			routeName: '/dashboard/infra/extras',
			params: {
				'infraId': currentScope.$parent.$parent.currentSelectedInfra._id,
				'technology': 'vm',
				'section': 'publicIp',
				'group': currentScope.selectedGroup.name,
				'name': oneIP.name
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, deleteIPopts, (error, response) => {
			overlayLoading.hide();
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error);
			}
			else {
				overlayLoading.hide();
				currentScope.displayAlert('success', `The resource group "${currentScope.selectedGroup.name}" has been successfully deleted. Your changes should become visible in a few minutes.`)
			}
		});
	}

	function listIPs(currentScope, oneGroup) {
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
				'extras[]': ['publicIps']
			}
		};
		
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, listOptions, (error, response) => {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error);
			}
			else {
				currentScope.infraPublicIps = [];
				if (response.publicIps && response.publicIps.length > 0) {
					currentScope.infraPublicIps = response.publicIps;

					currentScope.infraPublicIps.forEach((onePublicIP) =>{

						if(onePublicIP.idleTimeout && parseInt(onePublicIP.idleTimeout) < 60){
							//change timeout to seconds
							onePublicIP.idleTimeout *= 60;
						}

						if(onePublicIP.associated){
							let label = onePublicIP.associated.name;
							let html;
							switch (onePublicIP.associated.type){
								case "networkInterface":
									html = "<span title='" + onePublicIP.associated.type + "'><b>" + label + "</b></span>";
									
									if(currentScope.vmlayers){
										currentScope.vmlayers.forEach((oneVmLayer) => {
											if(oneVmLayer.labels && oneVmLayer.labels['soajs.service.vm.group'].toLowerCase() === oneGroup.name.toLowerCase()){
												if(oneVmLayer.ip){
													oneVmLayer.ip.forEach((oneIPValue) => {
														if(oneIPValue.type === 'public' && oneIPValue.allocatedTo === 'instance' && oneIPValue.address === onePublicIP.address){
															html = ``;
															
															//check environment
															let found = false;
															$localStorage.environments.forEach((oneEnv) => {
																if(oneEnv.code.toUpperCase() === oneVmLayer.labels['soajs.env.code'].toUpperCase()){
																	found = true;
																}
															});
															if(found){
																html += `<span title="Virtual Machine"><a href="#/environments-platforms?envCode=${oneVmLayer.labels['soajs.env.code']}&tab=vm&layer=${oneVmLayer.layer}"><span class="icon icon-stack"></span>&nbsp;<b>${oneVmLayer.layer}</b></a></span>`;
															}
															else{
																html += `<span title="Virtual Machine"><span class="icon icon-stack"></span>&nbsp;<b>${oneVmLayer.layer}</b></span>`;
															}
														}
													});
												}
											}
										});
									}
									
									break;
								case "loadBalancer":
									html = "<span title='Load Balancer'><a href='#/infra-lb/?group=" + onePublicIP.associated.group + "'><span class='icon icon-tree'></span>&nbsp;" + label + "</a></span>";
									break;
								default:
									html = label;
									break;
							}
							
							if(!html){
								html = "N/A";
							}
							onePublicIP.associated = html;
						}
					});


					let gridOptions = {
						grid: infraIPConfig.grid,
						data: currentScope.infraPublicIps,
						left: [],
						top: []
					};

					if (currentScope.access.editIP) {
						gridOptions.left.push({
							'label': 'Edit Public IP',
							'icon': 'pencil',
							'handler': 'editIP'
						});
					}

					if (currentScope.access.removeIP) {
						gridOptions.left.push({
							'label': 'Delete Public IP',
							'icon': 'bin',
							'handler': 'deleteIP',
							'msg': "Are you sure you want to delete this public IP?"
						});
						gridOptions.top.push({
							'label': 'Delete Public IP(s)',
							'icon': 'bin',
							'handler': 'deleteIP',
							'msg': "Are you sure you want to delete the selected public IP(s)?"
						});
					}
					
					buildGrid(currentScope, gridOptions);
				}
			}
		});
	}

	return {
		'addIP': addIP,
		'editIP': editIP,
		'deleteIP': deleteIP,
		'listIPs': listIPs
	};
}]);
