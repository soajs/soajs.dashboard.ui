"use strict";
var vmsServices = soajsApp.components;
vmsServices.service('orchestrateVMS', ['ngDataApi', '$timeout', '$modal', '$cookies', function (ngDataApi, $timeout, $modal, $cookies) {
	
	function listVMLayers(currentScope) {
		//create variable to indicate that we listing VMLayers in Clouds & Deployments
		currentScope.listingClouds = true;
		
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/cloud/vm/list",
			"params": {
				"infraId": currentScope.cloudProvider._id,
				"env": currentScope.envCode,
			}
		}, function (error, providerVMs) {
			overlayLoading.hide();
			if(error){
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else{
				delete providerVMs.soajsauth;
				let oneProvider = currentScope.cloudProvider;
				let allVMs = {};
				
				//aggregate response and generate layers from list returned
				if (providerVMs[oneProvider.name] && Array.isArray(providerVMs[oneProvider.name]) && providerVMs[oneProvider.name].length > 0) {
					
					providerVMs[oneProvider.name].forEach((oneVM) => {
						//aggregate and populate groups
						//add infra to group details
						if (!allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer]) {
							let vmTemplate = angular.copy(oneVM.template);
							delete oneVM.template;
							if (currentScope.envCode) {
								if (oneVM.labels && oneVM.labels['soajs.env.code'] && oneVM.labels['soajs.env.code'] === currentScope.envCode) {
									if (allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer]) {
										allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].list.push(oneVM);
									}
									else {
										allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer] = {
											name: oneVM.layer,
											infraProvider: oneProvider,
											executeCommand: true,
											list: [oneVM],
											template: vmTemplate
										};
									}
									
								}
								else {
									if (vmTemplate === undefined || !vmTemplate) {
										if (oneVM.labels && !oneVM.labels['soajs.env.code']) {
											if (allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer]) {
												allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].list.push(oneVM)
											}
											else {
												allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer] = {
													name: oneVM.layer,
													infraProvider: oneProvider,
													executeCommand: true,
													list: [oneVM]
												}
											}
										}
									}
								}
							}
							else {
								if (allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer]) {
									allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].list.push(oneVM);
								}
								else {
									allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer] = {
										name: oneVM.layer,
										infraProvider: oneProvider,
										executeCommand: true,
										list: [oneVM],
										template: vmTemplate
									};
								}
							}
						}
						else {
							if (currentScope.envCode) {
								if (oneVM.labels && oneVM.labels['soajs.env.code'] && oneVM.labels['soajs.env.code'] === currentScope.envCode) {
									delete oneVM.template;
									allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].list.push(oneVM);
								}
							}
							else {
								delete oneVM.template;
								allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].list.push(oneVM);
							}
						}
						
						if (Object.hasOwnProperty.call(oneVM, 'executeCommand') && allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer]) {
							//ensure to only update the value of this property if it is true. setting it to false will prevent the user from:
							// - on boarding and deploying in it
							if (allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].executeCommand === true) {
								allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].executeCommand = oneVM.executeCommand;
							}
						}
					});
				}
				
				if (providerVMs.errors) {
					if (!currentScope.vms.errorVMLayers) {
						currentScope.vms.errorVMLayers = {};
					}
					for (let id in providerVMs.errors) {
						currentScope.vms.errorVMLayers[id] = providerVMs.errors[id];
					}
				}
				
				currentScope.vms.vmLayers = allVMs;
				
				if (Object.keys(currentScope.vms.vmLayers).length > 0) {
					//create a variable to indicate that there are VMs
					currentScope.vmsAvailable = true;
				}
				else currentScope.vms.vmLayers = null;
			}
		});
	}
	
	function deleteVMLayer(currentScope, oneVMLayer) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/cloud/vm",
			"params": {
				"id": oneVMLayer.template.id,
				"env": currentScope.envCode,
				"layerName": oneVMLayer.name
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				listVMLayers(currentScope);
			}
		});
	}
	
	function maintenanceOp(currentScope, oneVMLayer, oneVMInstance, action) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/cloud/vm/maintenance",
			"params": {
				"env": currentScope.envCode,
				"serviceId": oneVMInstance.name,
				'instanceId' : oneVMInstance.id
			},
			"data":{
				"operation": action
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				listVMLayers(currentScope);
			}
		});
	}
	
	function deleteVM(currentScope, oneVMLayer, oneVMInstance) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/cloud/vm/instance",
			"params": {
				"env": currentScope.envCode,
				"serviceId": oneVMInstance.name,
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				listVMLayers(currentScope);
			}
		});
	}
	
	function inspectVMLayer(currentScope, oneVMLayer) {
		let formConfig = angular.copy(environmentsConfig.form.serviceInfo);
		formConfig.entries[0].value = angular.copy(oneVMLayer);
		delete formConfig.entries[0].value.infraProvider.regions;
		delete formConfig.entries[0].value.infraProvider.templates;
		delete formConfig.entries[0].value.infraProvider.api;
		delete formConfig.entries[0].value.infraProvider.groups;
		delete formConfig.entries[0].value.infraProvider.deployments;
		delete formConfig.entries[0].value.template;
		
		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'serviceInfo',
			label: oneVMLayer.name + ' | Layer Inspection',
			actions: [
				{
					'type': 'reset',
					'label': translation.ok[LANG],
					'btn': 'primary',
					'action': function (formData) {
						currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal(currentScope, $modal, options);
	}
	
	function getVMLogs(currentScope, oneVMLayer, oneVMInstance) {
		
		//open form, ask the user to provide the numberOfLines
		let options = {
			timeout: $timeout,
			form: {
				"entries": [
					{
						type: 'html',
						value: "<alert type='info'><p><b>Note:</b>&nbsp;Be advised that this operation might take around 30 seconds to complete.</p></alert>"
					},
					{
						type: 'number',
						label: "Maximum Number of Lines",
						name: "numberOfLines",
						placeholder: 200,
						required: true,
						fieldMsg: "Provide the Maximum number of lines (1 - 1000) to retrieve from the Virtual Machine Instance.",
						min: 1,
						max: 1000
					}
				]
			},
			name: 'numberOfLines',
			label: 'Retrieving VM Instance Log Messages',
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						showVMLogs(formData);
						currentScope.modalInstance.close();
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal(currentScope, $modal, options);
		
		function showVMLogs(formData) {
			overlayLoading.show();
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "post",
				"routeName": "/dashboard/cloud/vm/logs",
				"params": {
					"env": currentScope.envCode,
					"serviceId": oneVMInstance.name,
					"numberOfLines": formData.numberOfLines
				}
			}, function (error, response) {
				overlayLoading.hide();
				if (error) {
					currentScope.displayAlert('danger', error.message);
				}
				else {
					$modal.open({
						templateUrl: "vmLogBox.html",
						size: 'lg',
						backdrop: true,
						keyboard: false,
						windowClass: 'large-Modal',
						controller: function ($scope, $modalInstance) {
							$scope.title = "VM Instance Logs of " + oneVMInstance.name;
							fixBackDrop();
							
							$scope.ok = function () {
								$modalInstance.dismiss('ok');
							};
							
							$scope.refreshLogs = function () {
								overlayLoading.show();
								getSendDataFromServer(currentScope, ngDataApi, {
									"method": "post",
									"routeName": "/dashboard/cloud/vm/logs",
									"params": {
										"env": currentScope.envCode,
										"serviceId": oneVMInstance.name,
										"numberOfLines": formData.numberOfLines
									}
								}, function (error, response) {
									overlayLoading.hide();
									if (error) {
										currentScope.displayAlert('danger', error.message);
									}
									else {
										let output = '';
										response.output.forEach((oneOutput) => {
											output += oneOutput.message + "\n";
										});
										$scope.data = remove_special(output).replace("undefined", "").toString();
										if (!$scope.$$phase) {
											$scope.$apply();
										}
										
										fixBackDrop();
										$timeout(function () {
											highlightMyCode()
										}, 500);
									}
								});
							};
							
							if (error) {
								$scope.message = {
									warning: 'Instance logs are not available at the moment. Make sure that the instance is <strong style="color:green;">running</strong> and healthy.<br> If this is a newly deployed instance, please try again in a few moments.'
								};
							}
							else {
								let output = '';
								response.output.forEach((oneOutput) => {
									output += oneOutput.message + "\n";
								});
								$scope.data = remove_special(output);
								$timeout(function () {
									highlightMyCode()
								}, 500);
							}
						}
					});
				}
			});
		}
		
		function remove_special(str) {
			if (!str) {
				return 'No logs found for this instance'; //in case container has no logs, return message to display
			}
			var rExps = [/[\xC0-\xC2]/g, /[\xE0-\xE2]/g,
				/[\xC8-\xCA]/g, /[\xE8-\xEB]/g,
				/[\xCC-\xCE]/g, /[\xEC-\xEE]/g,
				/[\xD2-\xD4]/g, /[\xF2-\xF4]/g,
				/[\xD9-\xDB]/g, /[\xF9-\xFB]/g,
				/\xD1/, /\xF1/g,
				"/[\u00a0|\u1680|[\u2000-\u2009]|u200a|\u200b|\u2028|\u2029|\u202f|\u205f|\u3000|\xa0]/g",
				/\uFFFD/g,
				/\u000b/g, '/[\u180e|\u000c]/g',
				/\u2013/g, /\u2014/g,
				/\xa9/g, /\xae/g, /\xb7/g, /\u2018/g, /\u2019/g, /\u201c/g, /\u201d/g, /\u2026/g,
				/</g, />/g
			];
			var repChar = ['A', 'a', 'E', 'e', 'I', 'i', 'O', 'o', 'U', 'u', 'N', 'n', ' ', '', '\t', '', '-', '--', '(c)', '(r)', '*', "'", "'", '"', '"', '...', '&lt;', '&gt;'];
			for (var i = 0; i < rExps.length; i++) {
				str = str.replace(rExps[i], repChar[i]);
			}
			for (var x = 0; x < str.length; x++) {
				var charcode = str.charCodeAt(x);
				if ((charcode < 32 || charcode > 126) && charcode != 10 && charcode != 13) {
					str = str.replace(str.charAt(x), "");
				}
			}
			return str;
		}
	}
	
	return {
		'listVMLayers': listVMLayers,
		'deleteVM': deleteVM,
		'deleteVMLayer': deleteVMLayer,
		'maintenanceOp': maintenanceOp,
		'getVMLogs': getVMLogs,
		'inspectVMLayer': inspectVMLayer
	}
}]);
