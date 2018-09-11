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
					'name': 'mode',
					'label': 'Mode',
					'type': 'select',
					'value': [
						{ "v": "private", "l": "Private", "selected": true },
						{ "v": "public", "l": "Public" }
					],
					'fieldMsg': 'Select whether the loadbalancer will be internal or internet-facing.',
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
					'type': 'accordion',
					'name': 'healthProbe',
					'label': 'Health Probe Parameters',
					'entries': [
						{
							'name': 'healthProbeProtocol',
							'label': 'Protocol',
							'type': 'select',
							'value': [
								{ v: 'http', l: 'HTTP', selected: true },
								{ v: 'https', l: 'HTTPS' },
								{ v: 'tcp', l: 'TCP' },
								{ v: 'ssl', l: 'SSL' }
							],
							'fieldMsg': 'Health probe protocol.',
							'required': true,
							onAction: function(id, value, form) {
								let healthProbeEntry = form.entries.find((oneEntry) => { return oneEntry.name === 'healthProbe'; });
								if(healthProbeEntry && healthProbeEntry.entries) {
									let healthProbePath = healthProbeEntry.entries.find((oneEntry) => { return oneEntry.name === 'healthProbePath'; });
									if(healthProbePath) {
										if([ 'http', 'https' ].includes(value)) {
											healthProbePath.required = true;
										}
										else if([ 'tcp', 'ssl' ].includes(value)) {
											healthProbePath.required = false;
										}
									}
								}
							}
						},
						{
							'name': 'healthProbePort',
							'label': 'Ping Port',
							'type': 'number',
							'value': 80,
							'fieldMsg': 'Health probe port.',
							'required': true
						},
						{
							'name': 'healthProbePath',
							'label': 'Ping Path',
							'type': 'text',
							'value': "/index.html",
							'fieldMsg': 'Health probe path.',
							'required': true
						},
						{
							'name': 'healthProbeInterval',
							'label': 'Interval',
							'type': 'number',
							'value': 30,
							'fieldMsg': 'Interval amount in seconds.',
							'required': true
						},
						{
							'name': 'healthProbeTimeout',
							'label': 'Timeout',
							'type': 'number',
							'value': 5,
							'fieldMsg': 'Timeout amount in seconds.',
							'required': true
						},
						{
							'name': 'maxSuccessAttempts',
							'label': 'Max Success Attempts',
							'type': 'select',
							'value': [
								{ v: 2, l: '2', selected: true },
								{ v: 3, l: '3' },
								{ v: 4, l: '4' },
								{ v: 5, l: '5' },
								{ v: 6, l: '6' },
								{ v: 7, l: '7' },
								{ v: 8, l: '8' },
								{ v: 9, l: '9' },
								{ v: 10, l: '10' }
							],
							'fieldMsg': 'Max success attempts.',
							'required': true
						},
						{
							'name': 'maxFailureAttempts',
							'label': 'Max Failure Attempts',
							'type': 'select',
							'value': [
								{ v: 2, l: '2' },
								{ v: 3, l: '3' },
								{ v: 4, l: '4' },
								{ v: 5, l: '5' },
								{ v: 6, l: '6' },
								{ v: 7, l: '7' },
								{ v: 8, l: '8' },
								{ v: 9, l: '9' },
								{ v: 10, l: '10', selected: true }
							],
							'fieldMsg': 'Max failure attempts.',
							'required': true
						}
					]
				},
				{
					'type': 'uiselect',
					'name': 'securityGroups',
					'label': 'Security Groups',
					'value': [],
					'required': true,
					'multiple': true,
					'fieldMsg': 'Select at least one firewall.',
				},
				{
					'type': 'uiselect',
					'name': 'subnets',
					'label': 'Availability Zones',
					'value': [],
					'required': true,
					'multiple': true,
					'fieldMsg': 'Select at least one subnet.',
					onAction: function(id, value, form) {
						let subnetsEntry = form.entries.find((oneEntry) => { return oneEntry.name === id });
						if(value.length > 0) {
							for(let i = subnetsEntry.value.length - 1 ; i >= 0; i--) {
								if(subnetsEntry.value[i].network !== value[0].network) {
									subnetsEntry.value.splice(i, 1);
								}
							}
						}
						else {
							subnetsEntry.value = angular.copy(subnetsEntry.originalValue);
						}
					}
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

		}
	};

	function loadAndReturnExtras(currentScope, cb) {
		let listOptions = {
			method: 'get',
			routeName: '/dashboard/infra/extras',
			params: {
				'id': currentScope.$parent.$parent.currentSelectedInfra._id,
				'region': currentScope.selectedRegion,
				'extras[]': ['securityGroups', 'certificates', 'networks']
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, listOptions, (error, response) => {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error);
			}
			else {
				//save certificates in scope
				currentScope.infraCertificates = [];
				if (response.certificates && response.certificates.length > 0) {
                    let currentTime = new Date().getTime();
                    response.certificates.forEach((oneCertificate) => {
                        if(oneCertificate && oneCertificate.details && oneCertificate.details.status && oneCertificate.details.status === 'active') {
							if(oneCertificate.details.validFrom && oneCertificate.details.validTo) {
								oneCertificate.remainingDays = Math.floor((Date.parse(oneCertificate.details.validTo) - new Date().getTime()) / (60 * 60 * 24 * 1000));
							}
							currentScope.infraCertificates.push({
								v: oneCertificate.id,
								l: `${oneCertificate.name} (${oneCertificate.domain}) - Valid for ${oneCertificate.remainingDays} days`
							});
                        }
                    });
				}
				//save security groups in scope
				currentScope.infraSecurityGroups = [];
				if (response.securityGroups && response.securityGroups.length > 0) {
					currentScope.infraSecurityGroups = response.securityGroups;
				}
				//save subnets in scope
				currentScope.infraNetworks = [];
				if(response.networks && Array.isArray(response.networks) && response.networks.length > 0) {
					currentScope.infraNetworks = angular.copy(response.networks);
				}

				currentScope.infraSubnets = [];
				if (response.networks && response.networks.length > 0) {
					response.networks.forEach((oneNetwork, index) => {
						currentScope.infraSubnets[index] = {};
						currentScope.infraSubnets[index][oneNetwork.name] = [];
						oneNetwork.subnets.forEach((oneSubNet) => {
							currentScope.infraSubnets[index][oneNetwork.name].push({"name": oneSubNet.name, "id": oneSubNet.id});
						});
					});
				}
				return cb();
			}
		});
	}

	function addLoadBalancer(currentScope) {
		currentScope.ruleCounter = 0;

		loadAndReturnExtras(currentScope, () => {
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
									"params": {}
								}
							};

							let populateData = populatePostData(currentScope, data);
							if(populateData.validationError) {
								currentScope.form.displayAlert('danger', populateData.validationError);
								return;
							}

							postOpts.data.params = populateData.postData;

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
										listLoadBalancers(currentScope, currentScope.selectedRegion);
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

			//set value of region to selectedRegion
			options.form.entries[1].value = currentScope.selectedRegion;

			options.form.entries[3].entries[0].onAction = function (id, value, form) {
				addNewRule(form, currentScope);
			}

			buildFormWithModal(currentScope, $modal, options, () => {
				addNewRule(currentScope.form, currentScope);

				//populate securityGroups multiselect
				currentScope.infraSecurityGroups.forEach((oneSG) => {
					currentScope.form.entries[5].value.push({"v": oneSG.id, "l":oneSG.name});
				});

				//populate subnets multiselect
				let subnetsEntry = currentScope.form.entries.find((oneEntry) => { return oneEntry.name === 'subnets' });
				if(subnetsEntry) {
					currentScope.infraNetworks.forEach((oneNetwork) => {
						if(oneNetwork && oneNetwork.subnets && Array.isArray(oneNetwork.subnets)) {
							oneNetwork.subnets.forEach((oneSubnet) => {
								let oneSubnetEntry = {
									v: oneSubnet.id,
									l: `${oneSubnet.availabilityZone} (Network: ${oneNetwork.name} | Subnet: ${oneSubnet.name})`,
									network: oneNetwork.name
								};

								subnetsEntry.value.push(oneSubnetEntry);
							});
						}
					});
					subnetsEntry.originalValue = angular.copy(subnetsEntry.value);
				}
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

			for (let i = form.entries[3].entries.length -1; i >= 0; i--) {
				if (form.entries[3].entries[i].name === 'ruleGroup' + count) {
					//remove from formData
					for (var fieldname in form.formData) {

						if (['backendPort' + count, 'backendProtocol' + count, 'frontendPort' + count, 'frontendProtocol' + count, 'certificate' + count].indexOf(fieldname) !== -1) {
							delete form.formData[fieldname];
						}
					}
					//remove from formEntries
					form.entries[3].entries.splice(i, 1);
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
				tmp.entries[4].value = angular.copy(currentScope.infraCertificates);

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
			form.entries[3].entries.splice(form.entries[3].entries.length - 1, 0, tmp);
		}
		else {
			form.entries[3].entries.splice(form.entries[3].entries.length - 1, 0, tmp);
		}
		currentScope.ruleCounter++;
	}

	function editLoadBalancer(currentScope, originalLoadBalancer) {
		let oneLoadBalancer = angular.copy(originalLoadBalancer);

		currentScope.ruleCounter = 0

		loadAndReturnExtras(currentScope, () => {

			let options = {
				timeout: $timeout,
				form: {
					"entries": angular.copy(infraLoadBalancerConfig.form.addLoadBalancer)
				},
				name: 'awsModifyLoadBalancer',
				label: 'Modify Load Balancer',
				actions: [
					{
						'type': 'submit',
						'label': "Modify Load Balancer",
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
									"params": {}
								}
							};

							let populateData = populatePostData(currentScope, data);
							if(populateData.validationError) {
								currentScope.form.displayAlert('danger', populateData.validationError);
								return;
							}

							delete populateData.postData.type;
							postOpts.data.params = populateData.postData;

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
										listLoadBalancers(currentScope, currentScope.selectedRegion);
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

			options.form.entries[3].entries[0].onAction = function (id, value, form) {
				addNewRule(form, currentScope);
			};

			//set value of region to selectedRegion
			options.form.entries[1].value = currentScope.selectedRegion;

			buildFormWithModal(currentScope, $modal, options, () => {
				//populate type name
				currentScope.form.entries[0].disabled = true;
				currentScope.form.formData['name'] = oneLoadBalancer.name;

				//populate load balancer type
				currentScope.form.entries[2].disabled = true;
				currentScope.form.formData['region'] = oneLoadBalancer.region;

				//populate health probe parameters
				currentScope.form.formData['healthProbeInterval'] = oneLoadBalancer.healthProbe.healthProbeInterval;
				currentScope.form.formData['healthProbeProtocol'] = oneLoadBalancer.healthProbe.healthProbeProtocol.toLowerCase();
				currentScope.form.formData['healthProbePort'] = parseInt(oneLoadBalancer.healthProbe.healthProbePort);
				currentScope.form.formData['healthProbePath'] = oneLoadBalancer.healthProbe.healthProbePath;
				currentScope.form.formData['healthProbeTimeout'] = oneLoadBalancer.healthProbe.healthProbeTimeout;
				currentScope.form.formData['maxFailureAttempts'] = oneLoadBalancer.healthProbe.maxFailureAttempts;
				currentScope.form.formData['maxSuccessAttempts'] = oneLoadBalancer.healthProbe.maxSuccessAttempts;

				//call addNewRule based on the number of rules the LB has
				oneLoadBalancer.rules.forEach((oneRule, index) => {
					addNewRule(currentScope.form, currentScope);
					currentScope.form.formData['backendPort'+index] = oneRule.backendPort;
					currentScope.form.formData['frontendPort'+index] = oneRule.frontendPort;
					currentScope.form.formData['backendProtocol'+index] = oneRule.backendProtocol;
					currentScope.form.formData['frontendProtocol'+index] = oneRule.frontendProtocol;

					if(currentScope.form.formData['frontendProtocol'+index] === 'https' && oneRule.certificate) {
						currentScope.form.formData['certificate'+index] = oneRule.certificate;
						let rulesEntry = currentScope.form.entries.find((oneEntry) => { return oneEntry.name === 'rules'; });
						if(rulesEntry && rulesEntry.entries && rulesEntry.entries[index]) {
							let certificateEntry = rulesEntry.entries[index].entries.find((oneEntry) => { return oneEntry.name === `certificate${index}` });
							if(certificateEntry) {
								certificateEntry.hidden = false;
								certificateEntry.value = angular.copy(currentScope.infraCertificates);
							}
						}
					}
				});

				//populate securityGroups multiselect
				if(!oneLoadBalancer.securityGroupIds || !Array.isArray(oneLoadBalancer.securityGroupIds)) {
					oneLoadBalancer.securityGroupIds = [];
				}
				currentScope.form.formData['securityGroups'] = [];
				currentScope.infraSecurityGroups.forEach((oneSG) => {
					let oneSecurityGroupEntry = { "v": oneSG.id, "l": oneSG.name };

					currentScope.form.entries[5].value.push(oneSecurityGroupEntry);
					if(oneLoadBalancer.securityGroupIds.indexOf(oneSecurityGroupEntry.v) !== -1) {
						currentScope.form.formData['securityGroups'].push(oneSecurityGroupEntry);
					}
				});

				//populate subnets multiselect
				if(!oneLoadBalancer.zones || !Array.isArray(oneLoadBalancer.zones)) {
					oneLoadBalancer.zones = [];
				}

				currentScope.form.formData['subnets'] = [];
				let subnetsEntry = currentScope.form.entries.find((oneEntry) => { return oneEntry.name === 'subnets' });
				if(subnetsEntry) {
					subnetsEntry.value = [];
					currentScope.infraNetworks.forEach((oneNetwork) => {
						if(oneNetwork && oneNetwork.id === oneLoadBalancer.networkId && oneNetwork.subnets && Array.isArray(oneNetwork.subnets)) {
							oneNetwork.subnets.forEach((oneSubnet) => {
								let oneSubnetEntry = {
									v: oneSubnet.id,
									l: `${oneSubnet.availabilityZone} (Network: ${oneNetwork.name} | Subnet: ${oneSubnet.name})`,
									network: oneNetwork.name
								};

								subnetsEntry.value.push(oneSubnetEntry);
								let found = oneLoadBalancer.zones.find((oneZone) => { return oneZone.subnetId === oneSubnetEntry.v });
								if(found) {
									currentScope.form.formData['subnets'].push(oneSubnetEntry);
								}
							});
						}
					});
					subnetsEntry.originalValue = angular.copy(subnetsEntry.value);
					subnetsEntry.onAction('subnets', currentScope.form.formData['subnets'], currentScope.form);
				}
			});
		});
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
		let postData = {}, validationError = '';
		let rulesArray = [];
		let subnetsArray = [];
		let securityGroupsArray = [];
		let healthProbeOptions = {};

		if (currentScope.ruleCounter === 0) {
			validationError = "You must create at least one Rule to proceed";
			return { postData, validationError };
		}

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

		if(data.healthProbePath && data.healthProbePath.charAt(0) !== '/') {
			validationError = 'Health probe path should start with a "/", for example: /index.html';
			return { postData, validationError };
		}

		healthProbeOptions.maxSuccessAttempts = data.maxSuccessAttempts;
		healthProbeOptions.healthProbeInterval = data.healthProbeInterval;
		healthProbeOptions.healthProbeProtocol = data.healthProbeProtocol;
		healthProbeOptions.healthProbePort = data.healthProbePort;
		healthProbeOptions.healthProbePath = data.healthProbePath;
		healthProbeOptions.healthProbeTimeout = data.healthProbeTimeout;
		healthProbeOptions.maxFailureAttempts = data.maxFailureAttempts;

		data.securityGroups.forEach((oneSG) => {
			securityGroupsArray.push(oneSG.v);
		});

		data.subnets.forEach((oneSubnet) => {
			subnetsArray.push(oneSubnet.v);
		});

		postData = {
			name: data.name,
			region: data.region,
			section: 'loadBalancer',
			rules: rulesArray,
			healthProbe: healthProbeOptions,
			type: data.mode,
			securityGroups: securityGroupsArray,
			subnets: subnetsArray
		};

		return({ postData, validationError });
	}

	return {
		'addLoadBalancer': addLoadBalancer,
		'editLoadBalancer': editLoadBalancer,
		'deleteLoadBalancer': deleteLoadBalancer,
		'listLoadBalancers': listLoadBalancers
	};
}]);
