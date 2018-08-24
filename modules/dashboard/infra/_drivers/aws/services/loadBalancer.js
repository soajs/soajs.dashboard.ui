"use strict";

var closeModalUsingJs;

var awsInfraLoadBalancerSrv = soajsApp.components;
awsInfraLoadBalancerSrv.service('awsInfraLoadBalancerSrv', ['ngDataApi', '$localStorage', '$timeout', '$modal', '$window', '$cookies', 'Upload', function (ngDataApi, $localStorage, $timeout, $modal, $window, $cookies, Upload) {

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
					'type': 'accordion',
					'name': 'rules',
					'label': 'Rules',
					'entries': [
						{
							'type': 'html',
							'name': 'rule',
							'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add Rule'/>"
						}
					]
				},
				{
					'type': 'uiselect',
					'name': 'securityGroups',
					'label': 'Security Groups',
					'value': [],
					'required': true,
					'fieldMsg': 'Select at least one firewall.',
				},
				{
					'type': 'uiselect',
					'name': 'subnets',
					'label': 'Subnets',
					'value': [],
					'required': true,
					'fieldMsg': 'Select at least one subnet.',
				}
			],

			ruleInput: {
				'name': 'ruleGroup',
				'type': 'accordion',
				'label': 'New Rule ',
				'entries': [
					{
						'name': 'backendProtocol',
						'label': 'Backend Protocol',
						'type': 'select',
						'value': [{'v': 'http', 'l': 'HTTP'}, {'v': 'https', 'l': 'HTTPS'}, {'v': 'tcp', 'l': 'TCP'}],
						'required': true,
						'tooltip': 'Select a backend protocol.',
						'fieldMsg': 'Select a backend protocol',
						'placeholder': ""
					},
					{
						'name': 'backendPort',
						'label': 'Backend Port',
						'type': 'number',
						'value': '',
						'required': true,
						'tooltip': 'Enter a backend port number.',
						'fieldMsg': 'Enter a backend port number.',
						'placeholder': "*"
					},
					{
						'name': 'frontendProtocol',
						'label': 'Frontend Protocol',
						'type': 'select',
						'value': [{'v': 'http', 'l': 'HTTP'}, {'v': 'https', 'l': 'HTTPS (requires certificate)'}, {'v': 'tcp', 'l': 'TCP'}],
						'required': true,
						'tooltip': 'Select a frontend protocol.',
						'fieldMsg': 'Select a frontend protocol',
						'placeholder': ""
					},
					{
						'name': 'frontendPort',
						'label': 'Frontend Port',
						'type': 'number',
						'value': '',
						'required': true,
						'tooltip': 'Enter a frontend port number.',
						'fieldMsg': 'Enter a frontend port number.',
						'placeholder': "*"
					},
					{
						'name': 'certificate',
						'label': 'Certificate',
						'type': 'select',
						'value': [],
						'required': false,
						'hidden': true,
						'tooltip': 'Select a certificate.',
						'fieldMsg': 'Select a certificate',
						'placeholder': ""
					},
					{
						'type': 'html',
						'name': 'rRule',
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

	function loadAndReturnCertificates(currentScope) {
		let listOptions = {
			method: 'get',
			routeName: '/dashboard/infra/extras',
			params: {
				'id': currentScope.$parent.$parent.currentSelectedInfra._id,
				'region': currentScope.selectedRegion,
				'extras[]': ['certificates']
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, listOptions, (error, response) => {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error);
			}
			else {
				currentScope.infraCertificates = [];
				if (response.certificates && response.certificates.length > 0) {
                    let currentTime = new Date().getTime();
                    response.certificates.forEach((oneCertificate) => {
                        if(oneCertificate && oneCertificate.details && oneCertificate.details.status && oneCertificate.details.status === 'active') {
							if(oneCertificate.details.validFrom && oneCertificate.details.validTo) {
								oneCertificate.remainingDays = {};
								oneCertificate.remainingDays = Math.floor((Date.parse(oneCertificate.details.validTo) - Date.parse(oneCertificate.details.validFrom)) / (60 * 60 * 24 * 1000));
							}
							currentScope.infraCertificates.push(oneCertificate);
                        }
                    });
				}
			}
		});
	}

	function loadAndReturnSubnets(currentScope) {
		// let listOptions = {
		// 	method: 'get',
		// 	routeName: '/dashboard/infra/extras',
		// 	params: {
		// 		'id': currentScope.$parent.$parent.currentSelectedInfra._id,
		// 		'region': currentScope.selectedRegion,
		// 		'extras[]': ['certificates']
		// 	}
		// };
		//
		// overlayLoading.show();
		// getSendDataFromServer(currentScope, ngDataApi, listOptions, (error, response) => {
		// 	overlayLoading.hide();
		// 	if (error) {
		// 		currentScope.displayAlert('danger', error);
		// 	}
		// 	else {
		// 		currentScope.infraCertificates = [];
		// 		if (response.certificates && response.certificates.length > 0) {
        //             let currentTime = new Date().getTime();
        //             response.certificates.forEach((oneCertificate) => {
        //                 if(oneCertificate && oneCertificate.details && oneCertificate.details.status && oneCertificate.details.status === 'active') {
		// 					if(oneCertificate.details.validFrom && oneCertificate.details.validTo) {
		// 						oneCertificate.remainingDays = {};
		// 						oneCertificate.remainingDays = Math.floor((Date.parse(oneCertificate.details.validTo) - Date.parse(oneCertificate.details.validFrom)) / (60 * 60 * 24 * 1000));
		// 					}
		// 					currentScope.infraCertificates.push(oneCertificate);
        //                 }
        //             });
		// 		}
		// 	}
		// });
	}

	function loadAndReturnSecurityGroups(currentScope, cb) {
		let listOptions = {
			method: 'get',
			routeName: '/dashboard/infra/extras',
			params: {
				'id': currentScope.$parent.$parent.currentSelectedInfra._id,
				'region': currentScope.selectedRegion,
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
				return cb();
				// else {
				// 	// TODO: make the security groups field type html and write a message with a link to go add security group
				//
				// }
			}
		});
	}

	function addLoadBalancer(currentScope) {
		currentScope.ruleCounter = 0;
		loadAndReturnCertificates(currentScope);
		loadAndReturnSubnets(currentScope);

		loadAndReturnSecurityGroups(currentScope, () => {
			let options = {
				timeout: $timeout,
				form: {
					"entries": angular.copy(infraLoadBalancerConfig.form.addLoadBalancer)
				},
				name: 'awsAddLoadBalancer',
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

							if (currentScope.ruleCounter === 0) {
								currentScope.form.displayAlert('danger', "You must create at least one Rule to proceed.");
							}

							// overlayLoading.show();
							// getSendDataFromServer(currentScope, ngDataApi, postOpts, function (error) {
							// 	overlayLoading.hide();
							// 	if (error) {
							// 		currentScope.form.displayAlert('danger', error.message);
							// 	}
							// 	else {
							// 		currentScope.displayAlert('success', "Load balancer created successfully. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.");
							// 		currentScope.modalInstance.close();
							// 		$timeout(() => {
							// 			listLoadBalancers(currentScope, currentScope.selectedGroup);
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

			//set value of region to selectedRegion
			options.form.entries[1].value = currentScope.selectedRegion;

			options.form.entries[2].entries[0].onAction = function (id, value, form) {
				addNewRule(form, currentScope);
			}

			buildFormWithModal(currentScope, $modal, options, () => {
				addNewRule(currentScope.form, currentScope);

				//populate securityGroups multiselect
				console.log(currentScope);
				currentScope.infraSecurityGroups.forEach((oneSG) => {
					currentScope.form.entries[3].value.push({"v": oneSG.id, "l":oneSG.name});
				});
			});
		});

	}

	function addNewRule(form, currentScope) {
		let ruleCounter = currentScope.ruleCounter
		var tmp = angular.copy(infraLoadBalancerConfig.form.ruleInput);

		tmp.name += ruleCounter;
		tmp.entries[0].name += ruleCounter;
		tmp.entries[1].name += ruleCounter;
		tmp.entries[2].name += ruleCounter;
		tmp.entries[3].name += ruleCounter;
		tmp.entries[4].name += ruleCounter;
		tmp.entries[5].name += ruleCounter;

		tmp.entries[5].onAction = function (id, value, form) {
			var count = parseInt(id.replace('rRule', ''));

			for (let i = form.entries[2].entries.length -1; i >= 0; i--) {
				if (form.entries[2].entries[i].name === 'ruleGroup' + count) {
					//remove from formData
					for (var fieldname in form.formData) {

						if (['backendPort' + count, 'backendProtocol' + count, 'frontendPort' + count, 'frontendProtocol' + count, 'certificate' + count].indexOf(fieldname) !== -1) {
							delete form.formData[fieldname];
						}
					}
					//remove from formEntries
					form.entries[2].entries.splice(i, 1);
					currentScope.ruleCounter --;
					break;
				}
			}
		};

		currentScope.closeModalUsingJs = function(){
			currentScope.modalInstance.close();
		};
		closeModalUsingJs = currentScope.closeModalUsingJs;

		tmp.entries[2].onAction = function (id, value, form) {
			if (value === "https") {
				currentScope.infraCertificates.forEach((oneCert) => {
					tmp.entries[4].value.push({
						"v": oneCert.id,
						"l": (oneCert.name) ? oneCert.name : oneCert.id
					});
				});

				if (tmp.entries[4].value.length > 0) {
					tmp.entries[4].hidden = false;
					tmp.entries[4].type = 'select';
					tmp.entries[4].fieldMsg = 'Select a certificate';
					tmp.entries[4].required = true;
				}
				else {
					tmp.entries[4].hidden = false;
					tmp.entries[4].type = 'html';
					tmp.entries[4].value = `<div class="alert alert-danger">To proceed with <b>HTTPS</b> as a frontend protocol, you must select a valid certificate. </br>There are currently no valid certificates to select from. </br><a onclick="closeModalUsingJs()" href = "#/infra-certificates">Click here</a> to navigate to the certificates section and activate a certificate.</div>`,
					tmp.entries[4].required = true;
					delete tmp.entries[4].fieldMsg;
					delete tmp.entries[4].tooltip;
					delete tmp.entries[4].placeholder;
				}
			}
			else {
				tmp.entries[4].type = 'select';
				tmp.entries[4].hidden = true;
				tmp.entries[4].value = [];
				tmp.entries[4].required = false;
			}
		}

		if (form && form.entries) {
			form.entries[2].entries.splice(form.entries[2].entries.length - 1, 0, tmp);
		}
		else {
			form.entries[2].entries.splice(form.entries[2].entries.length - 1, 0, tmp);
		}
		currentScope.ruleCounter++;
	}

	function editLoadBalancer(currentScope, originalLoadBalancer) {
		// let oneLoadBalancer = angular.copy(originalLoadBalancer);
		//
		// currentScope.addressPoolCounter = 0;
		// currentScope.ipRuleCounter = {};
		//
		// //load public ips
		// loadAndReturnExtras(currentScope, (publicIps) => {
		// 	//load subnets
		// 	loadAndReturnSubnets(currentScope, (subnets) => {
		//
		// 		let options = {
		// 			timeout: $timeout,
		// 			form: {
		// 				"entries": angular.copy(infraLoadBalancerConfig.form.addLoadBalancer)
		// 			},
		// 			name: 'modifyLoadBalancer',
		// 			label: 'Modify Load Balancer',
		// 			actions: [
		// 				{
		// 					'type': 'submit',
		// 					'label': "Modify Load Balancer",
		// 					'btn': 'primary',
		// 					'action': function (formData) {
		// 						let data = angular.copy(formData);
		//
		// 						let postOpts = {
		// 							"method": "put",
		// 							"routeName": "/dashboard/infra/extras",
		// 							"params": {
		// 								"infraId": currentScope.currentSelectedInfra._id,
		// 								"technology": "vm"
		// 							},
		// 							"data": {
		// 								"params": populatePostData(currentScope, data)
		// 							}
		// 						};
		//
		// 						overlayLoading.show();
		// 						getSendDataFromServer(currentScope, ngDataApi, postOpts, function (error) {
		// 							overlayLoading.hide();
		// 							if (error) {
		// 								currentScope.form.displayAlert('danger', error.message);
		// 							}
		// 							else {
		// 								currentScope.displayAlert('success', "Load balancer updated successfully. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.");
		// 								currentScope.modalInstance.close();
		// 								$timeout(() => {
		// 									listLoadBalancers(currentScope, currentScope.selectedGroup);
		// 								}, 2000);
		// 							}
		// 						});
		// 					}
		// 				},
		// 				{
		// 					'type': 'reset',
		// 					'label': 'Cancel',
		// 					'btn': 'danger',
		// 					'action': function () {
		// 						delete currentScope.form.formData;
		// 						currentScope.modalInstance.close();
		// 					}
		// 				}
		// 			]
		// 		};
		//
		// 		options.form.entries[2].entries[0].onAction = function (id, value, form) {
		// 			addNewAddressPool(currentScope);
		// 		};
		//
		// 		options.form.entries[3].entries[0].onAction = function (id, value, form) {
		// 			addNewIpRule(currentScope, subnets, publicIps);
		// 		};
		//
		// 		//set value of region to selectedRegion
		// 		options.form.entries[1].value = currentScope.selectedGroup.region;
		//
		// 		buildFormWithModal(currentScope, $modal, options, () => {
		//
		// 			currentScope.form.formData['name'] = oneLoadBalancer.name;
		//
		// 			oneLoadBalancer.addressPools.forEach((oneAddressPool) => {
		// 				addNewAddressPool(currentScope, oneAddressPool.name);
		// 			});
		//
		// 			oneLoadBalancer.rules.forEach((oneIPRule) => {
		// 				addNewIpRule(currentScope, subnets, publicIps, oneIPRule);
		// 			});
		// 		});
		// 	});
		// });
	}

	function deleteLoadBalancer(currentScope, oneLoadBalancer) {
		let options = {
			method: 'delete',
			routeName: '/dashboard/infra/extras',
			params: {
				'infraId': currentScope.$parent.$parent.currentSelectedInfra._id,
				'technology': 'vm',
				'section': 'loadBalancer',
				'region': currentScope.selectedRegion,
				'name': oneLoadBalancer.name
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, options, (error, response) => {
			overlayLoading.hide();
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error);
			}
			else {
				overlayLoading.hide();
				currentScope.displayAlert('success', `The load balancer has been successfully deleted. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.`);
				$timeout(() => {
					listLoadBalancers(currentScope, currentScope.selectedRegion);
				}, 2000);
			}
		});
	}

	function listLoadBalancers(currentScope, oneRegion) {
		let oneInfra = currentScope.$parent.$parent.currentSelectedInfra;

		//save selected group in scope to be accessed by other functions
		currentScope.selectedRegion = oneRegion;

		let listOptions = {
			method: 'get',
			routeName: '/dashboard/infra/extras',
			params: {
				'id': oneInfra._id,
				'region': oneRegion,
				'extras[]': ['loadBalancers', 'securityGroups', 'networks', 'certificates']
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
						if(oneLoadBalancer.securityGroupIds && Array.isArray(oneLoadBalancer.securityGroupIds) && oneLoadBalancer.securityGroupIds.length > 0) {
							oneLoadBalancer.securityGroups = [];
							oneLoadBalancer.securityGroupIds.forEach((oneGroupId) => {
								let matchingGroup = response.securityGroups.find((oneEntry) => { return oneEntry.id === oneGroupId });
								if(matchingGroup) {
									oneLoadBalancer.securityGroups.push({
										id: matchingGroup.id,
										name: matchingGroup.name,
										region: matchingGroup.region
									});
								}
							});
						}

						if(oneLoadBalancer.instances && Array.isArray(oneLoadBalancer.instances) && oneLoadBalancer.instances.length > 0) {
							oneLoadBalancer.layers = [];
							oneLoadBalancer.instances.forEach((oneInstance) => {
								let matchingInstance = currentScope.vmlayers.find((oneEntry) => { return oneEntry.id === oneInstance.id });
								if(matchingInstance && matchingInstance.layer) {
									let matchingLayer = oneLoadBalancer.layers.find((oneLayer) => { return oneLayer.name === matchingInstance.layer });
									if(!matchingLayer) {
										oneLoadBalancer.layers.push({
											name: matchingInstance.layer,
											region: matchingInstance.region,
											numberOfInstances: 1,
											instancesState: {
												[oneInstance.state]: 1
											}
										});
									}
									else {
										matchingLayer.numberOfInstances++;
										if(matchingLayer.instancesState && typeof(matchingLayer.instancesState[oneInstance.state]) === 'number') {
											matchingLayer.instancesState[oneInstance.state]++;
										}
										else {
											matchingLayer.instancesState[oneInstance.state] = 1;
										}
									}
								}
							});
						}

						if(oneLoadBalancer.networkId) {
							oneLoadBalancer.network = {};
							let matchingNetwork = response.networks.find((oneEntry) => { return oneEntry.id === oneLoadBalancer.networkId; });
							if(matchingNetwork) {
								oneLoadBalancer.network = {
									id: matchingNetwork.id,
									name: matchingNetwork.name,
									region: matchingNetwork.region
								};
							}
						}

						if(oneLoadBalancer.rules && Array.isArray(oneLoadBalancer.rules) && oneLoadBalancer.rules.length > 0) {
							oneLoadBalancer.rules.forEach((oneRule) => {
								if(oneRule.certificate) {
									let matchingCertificate = response.certificates.find((oneEntry) => { return oneEntry.id === oneRule.certificate });
									if(matchingCertificate) {
										oneRule.certificateInfo = {
											id: matchingCertificate.id,
											name: matchingCertificate.name,
											region: matchingCertificate.region
										};
									}
								}
							});
						}
					});
				}
			}
		});
	}

	function populatePostData(currentScope, data) {
			let rulesArray = [];
			let healthProbeOptions = {};

			for (let i=0; i<currentScope.ruleCounter; i++) {
				let tmp = {};
				tmp.backendPort = data['backendPort'+i];
				tmp.backendProtocol = data['backendProtocol'+i];
				tmp.frontendPort = data['frontendPort'+i];
				tmp.frontendProtocol = data['frontendProtocol'+i];
				if (tmp.frontendProtocol === 'https') {
					tmp.certificate = data['certificate'+i];
				}
				rulesArray.push(tmp);
			}

			healthProbeOptions.maxSuccessAttempts = data.maxSuccessAttempts;
			healthProbeOptions.healthProbeInterval = data.healthProbeInterval;
			healthProbeOptions.healthProbePath = data.healthProbePath;
			healthProbeOptions.healthProbeTimeout = data.healthProbeTimeout;
			healthProbeOptions.maxFailureAttempts = data.maxFailureAttempts;

			return({
				name: data.name,
				region: data.region,
				rules: rulesArray,
				healthProbe: healthProbeOptions,
				type: data.type ? "internal" : "internet-facing",
				// securityGroups: data.securityGroups,
				// subnets: data.subnets,
			})
	}

	return {
		'addLoadBalancer': addLoadBalancer,
		'editLoadBalancer': editLoadBalancer,
		'deleteLoadBalancer': deleteLoadBalancer,
		'listLoadBalancers': listLoadBalancers
	};
}]);
