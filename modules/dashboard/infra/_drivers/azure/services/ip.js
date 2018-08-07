"use strict";
var azureInfraIPSrv = soajsApp.components;
azureInfraIPSrv.service('azureInfraIPSrv', ['ngDataApi', '$localStorage', '$timeout', '$modal', function (ngDataApi, $localStorage, $timeout, $modal) {
	
	let infraIPConfig = {
		form: {
			addIP: [
				{
					'name': 'name',
					'label': 'Name',
					'type': 'text',
					'value': "",
					'placeholder': ' My Public IP Name',
					'fieldMsg': 'Enter a name for the Public IP',
					'required': true
				},
				{
					'name': 'region',
					'label': 'Region',
					'type': 'readonly',
					'value': "",
					'fieldMsg': 'Region where the Public IP will be located',
					'required': true
				},
				{
					'name': 'ipAddressVersion',
					'label': 'IP Address Version',
					'type': 'uiselect',
					'value': [{'v': 'IPv4', 'l': 'IP v4', 'selected': true}, {'v': 'IP v6', 'l': 'IPv6'}],
					'fieldMsg': 'The IP Address Version',
					'required': true
				},
				{
					'name': 'type',
					'label': 'Type',
					'type': 'uiselect',
					'value': [{'v': 'basic', 'l': 'Basic', 'selected': true}, {'v': 'standard', 'l': 'Standard'}],
					'fieldMsg': 'Select an Azure Address type for this IP,  <a target="_blank" href="https://docs.microsoft.com/en-us/azure/virtual-network/virtual-network-ip-addresses-overview-arm#sku">Learn More</a>',
					'required': true
				},
				{
					'name': 'publicIPAllocationMethod',
					'label': 'Public IP Allocation Method',
					'type': 'uiselect',
					'value': [{'v': 'dynamic', 'l': 'Dynamic', 'selected': true}, {'v': 'static', 'l': 'Static'}],
					'fieldMsg': 'Select an Azure Allocation Method for this IP, <a target="_blank" href="https://docs.microsoft.com/en-us/azure/virtual-network/virtual-network-ip-addresses-overview-arm#allocation-method">Learn More</a>',
					'required': true
				},
				{
					'name': 'idleTimeout',
					'label': 'Idle Timeout',
					'type': 'number',
					'value': 240,
					'placeholder': 240,
					'min': 240,
					'max':1800,
					'fieldMsg': 'The Idle Timeout between 240s and 1800s (in the case of Azure, this value will be converted to minutes)',
					'required': true
				},
				// {
				// 	'type': 'group',
				// 	'label': 'Labels',
				// 	'entries': [
				// 		{
				// 			'type': 'html',
				// 			'name': 'addLabel',
				// 			'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add Label'/>"
				// 		}
				// 	]
				// }
			],
			
			editIP: [
				{
					'name': 'name',
					'label': 'Name',
					'type': 'readonly',
					'value': "",
					'placeholder': ' My Public IP Name',
					'fieldMsg': 'Enter a name for the Public IP',
					'required': true
				},
				{
					'name': 'region',
					'label': 'Region',
					'type': 'readonly',
					'value': "",
					'fieldMsg': 'Region where the Public IP will be located',
					'required': true
				},
				{
					'name': 'ipAddressVersion',
					'label': 'IP Address Version',
					'type': 'readonly',
					'value': "",
					'fieldMsg': 'The IP Address Version',
					'required': true
				},
				{
					'name': 'type',
					'label': 'Type',
					'type': 'readonly',
					'value': "",
					'fieldMsg': 'Select an Azure Address type for this IP,  <a target="_blank" href="https://docs.microsoft.com/en-us/azure/virtual-network/virtual-network-ip-addresses-overview-arm#sku">Learn More</a>',
					'required': true
				},
				{
					'name': 'publicIPAllocationMethod',
					'label': 'Public IP Allocation Method',
					'type': 'uiselect',
					'value': [{'v': 'dynamic', 'l': 'Dynamic'}, {'v': 'static', 'l': 'Static'}],
					'fieldMsg': 'Select an Azure Allocation Method for this IP, <a target="_blank" href="https://docs.microsoft.com/en-us/azure/virtual-network/virtual-network-ip-addresses-overview-arm#allocation-method">Learn More</a>',
					'required': true
				},
				{
					'name': 'idleTimeout',
					'label': 'Idle Timeout',
					'type': 'number',
					'value': 240,
					'placeholder': 240,
					'min': 240,
					'max':1800,
					'fieldMsg': 'The Idle Timeout between 240s and 1800s (in the case of Azure, this value will be converted to minutes)',
					'required': true
				},
				// {
				// 	'type': 'group',
				// 	'label': 'Labels',
				// 	'entries': [
				// 		{
				// 			'type': 'html',
				// 			'name': 'addLabel',
				// 			'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add Label'/>"
				// 		}
				// 	]
				// }
			],
			
			labelInput : {
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
						'placeholder': "My label name"
					},
					{
						'name': 'labelValue',
						'label': 'Label Value',
						'type': 'text',
						'value': '',
						'required': true,
						'tooltip': 'Enter the value of the label',
						'fieldMsg': 'Enter the value of the label',
						'placeholder': "My label Value"
					},
					{
						'type': 'html',
						'name': 'rLabel',
						'value': '<span class="icon icon-cross"></span>'
					}
				]
			}
		},
		
		grid: {
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{ 'label': 'Name', 'field': 'name' },
				{ 'label': 'Address', 'field': 'address' },
				{ 'label': 'Allocation Method', 'field': 'publicIPAllocationMethod' },
				{ 'label': 'Idle Timeout (seconds)', 'field': 'idleTimeout' },
				{ 'label': 'IP Version', 'field': 'ipAddressVersion' },
				{ 'label': 'Associated To', 'field': 'associated' }
			],
			'leftActions': [],
			'topActions': [],
			'defaultSortField': 'name',
			'defaultLimit': 10
		},
	};
	
	function addIP(currentScope) {
		// currentScope.labelCounter = 0;

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

						// let labels = {};
						// for (let i = 0; i < currentScope.labelCounter; i ++) {
						// 	labels[data['labelName'+i]] = data['labelValue'+i];
						// }

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
									"labels": {},
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

		// options.form.entries[6].entries[0].onAction = function (id, value, form) {
		// 	addNewLabel(currentScope);
		// };

		//set value of region to selectedRegion
		options.form.entries[1].value = currentScope.selectedGroup.region;

		buildFormWithModal(currentScope, $modal, options);
	}

	// function addNewLabel(currentScope) {
	// 	let labelCounter = currentScope.labelCounter;
	// 	let tmp = angular.copy(infraIPConfig.form.labelInput);
	// 	tmp.name += labelCounter;
	// 	tmp.entries[0].name += labelCounter;
	// 	tmp.entries[1].name += labelCounter;
	// 	tmp.entries[2].name += labelCounter;
	//
	// 	tmp.entries[2].onAction = function (id, value, form) {
	// 		let count = parseInt(id.replace('rLabel', ''));
	//
	// 		for (let i = form.entries[6].entries.length - 1; i >= 0; i--) {
	// 			if (form.entries[6].entries[i].name === 'labelGroup' + count) {
	// 				//remove from formData
	// 				for (var fieldname in form.formData) {
	// 					if (['labelName' + count, 'labelValue' + count].indexOf(fieldname) !== -1) {
	// 						delete form.formData[fieldname];
	// 					}
	// 				}
	// 				//remove from formEntries
	// 				form.entries[6].entries.splice(i, 1);
	// 				break;
	// 			}
	// 		}
	// 	};
	//
	// 	if (currentScope.form && currentScope.form.entries) {
	// 		currentScope.form.entries[6].entries.splice(currentScope.form.entries[6].entries.length - 1, 0, tmp);
	// 	}
	// 	else {
	// 		// formConfig[5].tabs[7].entries.splice(currentScope.form.entries[2].entries.length - 1, 0, tmp);
	// 	}
	// 	currentScope.labelCounter ++;
	// }

	function editIP(currentScope, originalIP) {
		let oneIP = angular.copy(originalIP);
		// currentScope.labelCounter = (oneIP.labels && typeof oneIP.labels === 'object') ? Object.keys(oneIP.labels).length : 0;

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
					'type': 'submit',
					'label': "Update Public IP",
					'btn': 'primary',
					'action': function (formData) {
						let data = angular.copy(formData);

						// let labels = {};
						// for (let i = 0; i < currentScope.labelCounter; i ++) {
						// 	labels[data['labelName'+i]] = data['labelValue'+i];
						// }

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
									"labels": {},
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

		// //assertion to avoid splicing label entries more than once
		// if (options.form.entries[6].entries.length !== currentScope.labelCounter + 1) {
		// 	//set labels
		// 	for (let i = 0; i < currentScope.labelCounter; i++) {
		// 		// change the labels to formData style
		// 		oneIP['labelName'+i] = Object.keys(oneIP.labels)[i];
		// 		oneIP['labelValue'+i] = oneIP.labels[Object.keys(oneIP.labels)[i]];
		//
		// 		//add labels to the form based on label counters
		// 		let tmp = angular.copy(infraIPConfig.form.labelInput);
		// 		tmp.name += i;
		// 		tmp.entries[0].name += i;
		// 		tmp.entries[1].name += i;
		// 		tmp.entries[2].name += i;
		//
		// 		tmp.entries[2].onAction = function (id, value, form) {
		// 			let count = parseInt(id.replace('rLabel', ''));
		//
		// 			for (let i = form.entries[6].entries.length - 1; i >= 0; i--) {
		// 				if (form.entries[6].entries[i].name === 'labelGroup' + count) {
		// 					//remove from formData
		// 					for (var fieldname in form.formData) {
		// 						if (['labelName' + count, 'labelValue' + count].indexOf(fieldname) !== -1) {
		// 							delete form.formData[fieldname];
		// 						}
		// 					}
		// 					//remove from formEntries
		// 					form.entries[6].entries.splice(i, 1);
		// 					break;
		// 				}
		// 			}
		// 		};
		// 		options.form.entries[6].entries.splice(options.form.entries[6].entries.length - 1, 0, tmp);
		// 	}
		// }

		// options.form.entries[6].entries[currentScope.labelCounter].onAction = function (id, value, form) {
		// 	addNewLabel(currentScope);
		// };

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
				currentScope.displayAlert('success', `The IP has been successfully deleted. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.`);
				$timeout(() => {
					listIPs(currentScope, currentScope.selectedGroup);
				}, 2000);
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

						//set ip address to dynamic in case the allocation method is dynamic and there is no ip address assigned
						if(onePublicIP.publicIPAllocationMethod === "dynamic" && (!onePublicIP.address || onePublicIP.address.length === 0)) {
							onePublicIP.address = "dynamic"
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
						else {
							onePublicIP.associated = "Not associated yet"
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
