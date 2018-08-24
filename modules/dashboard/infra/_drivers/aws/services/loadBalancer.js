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
				}
			],

			ruleInput: {
				'name': 'ruleGroup',
				'type': 'accordion',
				'label': 'New Rule ',
				'entries': [
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

	function addLoadBalancer(currentScope) {
		currentScope.ruleCounter = 0;
		loadAndReturnCertificates(currentScope);

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

		tmp.entries[3].onAction = function (id, value, form) {
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
		//
		// let deleteFireWallOpts = {
		// 	method: 'delete',
		// 	routeName: '/dashboard/infra/extras',
		// 	params: {
		// 		'infraId': currentScope.$parent.$parent.currentSelectedInfra._id,
		// 		'technology': 'vm',
		// 		'section': 'loadBalancer',
		// 		'group': currentScope.selectedGroup.name,
		// 		'name': oneLoadBalancer.name
		// 	}
		// };
		//
		// overlayLoading.show();
		// getSendDataFromServer(currentScope, ngDataApi, deleteFireWallOpts, (error, response) => {
		// 	overlayLoading.hide();
		// 	if (error) {
		// 		overlayLoading.hide();
		// 		currentScope.displayAlert('danger', error);
		// 	}
		// 	else {
		// 		overlayLoading.hide();
		// 		currentScope.displayAlert('success', `The load balancer has been successfully deleted. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.`);
		// 		$timeout(() => {
		// 			listLoadBalancers(currentScope, currentScope.selectedGroup);
		// 		}, 2000);
		// 	}
		// });
	}

	function listLoadBalancers(currentScope, oneRegion) {
		let oneInfra = currentScope.$parent.$parent.currentSelectedInfra;

		//save selected group in scope to be accessed by other functions
		currentScope.selectedRegion = oneRegion;

		let response = [
               {
                   "region": 'us-east-1',
                   "type": "classic",
                   "id": "elb-internal-ragheb",
                   "name": "elb-internal-ragheb",
                   "mode": "internal",
                   "networkId": "vpc-a5e482dd",
                   "domain": "internal-elb-internal-ragheb-408965366.us-east-2.elb.amazonaws.com",
                   "securityGroupIds": [
                       "sg-ca3421a3"
                   ],
                   "createdTime": "2018-08-14T16:35:19.220Z",
                   "healthProbe": {
                       "healthProbePath": "HTTP:80/index.html",
                       "healthProbeInterval": 30,
                       "healthProbeTimeout": 5,
                       "maxFailureAttempts": 2,
                       "maxSuccessAttempts": 10
                   },
                   "rules": [
                       {
                           "backendProtocol": "HTTP",
                           "backendPort": 80,
                           "frontendProtocol": "HTTP",
                           "frontendPPort": 80
                       },
                       {
                           "backendProtocol": "HTTPS",
                           "backendPort": 443,
                           "frontendProtocol": "HTTPS",
                           "frontendPPort": 443,
                           "certificate": "arn:"
                       }
                   ],
                   "zones": [
                       {
                           "name": "us-east-1a",
                           "subnetId": "subnet-97c7abf3"
                       },
                       {
                           "name": "us-east-1b",
                           "subnetId": "subnet-1336e83c"
                       }
                   ],
                   "instances": [
                       {
                           "id": "i-0bb24a3de714f9fba",
                           "state": "OutOfService"
                       }
                   ]
               },
               {
                   "type": "classic",
                   "region": 'us-east-1',
                   "id": "test-lb-ragheb",
                   "name": "test-lb-ragheb",
                   "mode": "internet-facing",
                   "networkId": "vpc-957300fc",
                   "domain": "test-lb-ragheb-69863322.us-east-2.elb.amazonaws.com",
                   "securityGroupIds": [
                       "sg-ca3421a3"
                   ],
                   "createdTime": "2018-08-14T16:25:32.560Z",
                   "healthProbe": {
                       "healthProbePath": "HTTP:80/index.html",
                       "healthProbeInterval": 30,
                       "healthProbeTimeout": 5,
                       "maxFailureAttempts": 2,
                       "maxSuccessAttempts": 10
                   },
                   "rules": [
                       {
                           "backendProtocol": "HTTP",
                           "backendPort": 80,
                           "frontendProtocol": "HTTP",
                           "frontendPPort": 80
                       }
                   ],
                   "zones": [
                       {
                           "name": "us-east-1a",
                           "subnetId": "subnet-97c7abf3"
                       },
                       {
                           "name": "us-east-1b",
                           "subnetId": "subnet-1336e83c"
                       }
                   ],
                   "instances": [
                       {
                           "id": "i-0bb24a3de714f9fba",
                           "state": "OutOfService"
                       }
                   ]
               }
           ];

		   currentScope.loadBalancers = response;
		// let oneInfra = currentScope.$parent.$parent.currentSelectedInfra;
		//
		// //save selected group in scope to be accessed by other functions
		// currentScope.selectedGroup = oneGroup;
		//
		// // clean grid from previous list if any
		// if (currentScope.grid && currentScope.grid.rows && currentScope.grid.filteredRows && currentScope.grid.original) {
		// 	currentScope.grid.rows = [];
		// 	currentScope.grid.filteredRows = [];
		// 	currentScope.grid.original = [];
		// }
		//
		// let listOptions = {
		// 	method: 'get',
		// 	routeName: '/dashboard/infra/extras',
		// 	params: {
		// 		'id': oneInfra._id,
		// 		'group': oneGroup.name,
		// 		'extras[]': ['loadBalancers'],
		// 		'section': "loadBalancer"
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
		// 		currentScope.infraLoadBalancers = [];
		// 		if (response.loadBalancers && response.loadBalancers.length > 0) {
		// 			currentScope.infraLoadBalancers = response.loadBalancers;
		// 			currentScope.infraLoadBalancers[0].open = true;
		//
		// 			currentScope.infraLoadBalancers.forEach((oneLoadBalancer) => {
		// 				if (oneLoadBalancer.rules) {
		// 					oneLoadBalancer.rules[0].open = true;
		// 				}
		// 			});
		// 		}
		//
		// 		if (currentScope.vmlayers) {
		// 			let processedNetworks = [];
		// 			currentScope.infraLoadBalancers.forEach((oneLoadBalancer) => {
		//
		// 				oneLoadBalancer.rules.forEach((oneRule) => {
		// 					if (oneRule.config.subnet) {
		//
		// 						currentScope.vmlayers.forEach((oneVmLayer) => {
		// 							if (
		// 								oneVmLayer.layer.toLowerCase() === oneRule.config.subnet.name.toLowerCase() &&
		// 								oneVmLayer.network.toLowerCase() === oneRule.config.subnet.network.toLowerCase() &&
		// 								oneVmLayer.labels &&
		// 								oneVmLayer.labels['soajs.service.vm.group'].toLowerCase() === oneRule.config.subnet.group.toLowerCase() &&
		// 								oneVmLayer.labels['soajs.env.code']
		// 							) {
		// 								$localStorage.environments.forEach((oneEnv) => {
		// 									if (oneEnv.code.toUpperCase() === oneVmLayer.labels['soajs.env.code'].toUpperCase()) {
		// 										oneRule.config.subnet.envCode = oneVmLayer.labels['soajs.env.code'];
		// 									}
		// 								});
		// 							}
		// 						});
		// 					}
		// 				});
		// 			});
		// 		}
		// 	}
		// });
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
