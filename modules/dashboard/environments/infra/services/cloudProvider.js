"use strict";
var platformCloudProviderServices = soajsApp.components;
platformCloudProviderServices.service('platformCloudProvider', ['ngDataApi', '$timeout', '$cookies', '$window', '$compile', '$modal', 'platformCntnr', 'platformsVM', function (ngDataApi, $timeout, $cookies, $window, $compile, $modal, platformCntnr, platformsVM) {
	
	/**
	 * Function that provides the mechanism to select a cloud provider to restrict the environment to
	 * @param currentScope
	 */
	function selectProvider(currentScope, cb) {
		if(!currentScope.wizard) {
			overlayLoading.show();
		}
		listInfraProviders(currentScope, null, null, () => {
			let options = {
				timeout: $timeout,
				entries: [],
				name: 'selectProvider',
				actions: [
					{
						'type': 'button',
						'label': "Cancel",
						'btn': 'danger',
						'action': function () {
							currentScope.environment.type = 'manual';
							delete currentScope.cloud;
							delete currentScope.container;
							delete currentScope.vms;
						}
					}
				]
			};
			
			buildForm(currentScope.cloud, null, options, () => {
				if(!currentScope.wizard) {
					overlayLoading.hide();
				}
				if (cb && typeof cb === 'function') {
					return cb();
				}
			});
		});
	}
	
	/**
	 * list cloud providers
	 * @param currentScope
	 * @param cb
	 */
	function listInfraProviders(currentScope, id, exclude, cb) {
		
		if((!id || id ==='') && currentScope.cloud.cloudProviders && currentScope.wizard){
			return cb();
		}
		
		//get the available providers
		let requestOptions = {
			"method": "get",
			"routeName": "/dashboard/infra",
			"params": {
				"type": 'cloud',
				"exclude[]": exclude || ['templates']
			}
		};
		
		if (id && id !== '') {
			requestOptions.params.id = id;
		}
		getSendDataFromServer(currentScope, ngDataApi, requestOptions, function (error, providers) {
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error.message);
				return cb();
			}
			else {
				//only execute this on the first call
				if (!id && !exclude) {
					currentScope.cloud.cloudProviders = providers;
					delete currentScope.cloud.cloudProviders.soajsauth;
					
					currentScope.cloud.cloudProviders.forEach((oneProvider) => {
						if (oneProvider.technologies.indexOf('docker') !== -1) {
							oneProvider.showDocker = true;
						}
						
						if (oneProvider.technologies.indexOf('kubernetes') !== -1) {
							oneProvider.showKube = true;
						}
						
						if (oneProvider.technologies.indexOf('vm') !== -1) {
							oneProvider.showVm = true;
						}
						
						oneProvider.image = "modules/dashboard/environments/images/" + oneProvider.name + ".png";
						
						//delete temp placeholder
						delete oneProvider.templates;
					});
					return cb();
				}
				else {
					return cb(providers);
				}
			}
		});
	}
	
	/**
	 * function that fetches the provider and prints its supported sections
	 * @param currentScope
	 * @param cb
	 */
	function printProvider(currentScope, cb) {
		if(!currentScope.wizard){
			overlayLoading.show();
		}
		let infraId = Object.keys(currentScope.environment.restriction)[0];
		let excludes = ['regions', 'groups', 'extra'];
		
		listInfraProviders(currentScope, infraId, excludes, (cloudProvider) => {
			if(!currentScope.wizard) {
				overlayLoading.hide();
			}
			currentScope.cloud.form.formData.selectedProvider = cloudProvider;
			
			if (cloudProvider.technologies.indexOf('docker') !== -1) {
				cloudProvider.showDocker = true;
			}
			
			if (cloudProvider.technologies.indexOf('kubernetes') !== -1) {
				cloudProvider.showKube = true;
			}
			
			if (cloudProvider.technologies.indexOf('vm') !== -1) {
				cloudProvider.showVm = true;
			}
			
			cloudProvider.image = "modules/dashboard/environments/images/" + cloudProvider.name + ".png";
			expandProviderOptions(currentScope, cb);
		});
	}
	
	/**
	 * function that displays all the details that the cloud provider supports so the user can select how to move forward
	 * @param currentScope
	 */
	function expandProviderOptions(currentScope, callback) {
		let callbackReturned = false;
		currentScope.cloud.showDocker = currentScope.cloud.form.formData.selectedProvider.showDocker;
		currentScope.cloud.showKube = currentScope.cloud.form.formData.selectedProvider.showKube;
		currentScope.cloud.showVm = currentScope.cloud.form.formData.selectedProvider.showVm;
		
		if (currentScope.cloud.showDocker || currentScope.cloud.showKube || currentScope.cloud.showVm) {
			
			currentScope.cloud.techProviders = [];
			currentScope.cloud.techProviders.push(currentScope.cloud.form.formData.selectedProvider);
			
			overlayLoading.show();
			
			let iacTemplates = currentScope.cloud.form.formData.selectedProvider.templates;
			
			//populate form inputs for user to configure IAC
			let oneProvider = currentScope.cloud.form.formData.selectedProvider;
			
			currentScope.cloud.selectedProvider = oneProvider;
			currentScope.cloud.selectedProvider.region = Object.keys(currentScope.environment.restriction[oneProvider._id])[0];
			currentScope.cloud.selectedProvider.network = currentScope.environment.restriction[oneProvider._id][currentScope.cloud.selectedProvider.region].network;
			currentScope.cloud.selectedProvider.extra = angular.copy(currentScope.environment.restriction[oneProvider._id][currentScope.cloud.selectedProvider.region]);
			delete currentScope.cloud.selectedProvider.extra.network;
			
			let containerTemplates = [{'v': '', 'l': " -- Select Template -- "}];
			let vmTemplates = [{'v': '', 'l': " -- Select Template -- "}];
			
			iacTemplates.forEach((oneTmpl) => {
				
				let label = oneTmpl.name;
				if (oneTmpl.description && oneTmpl.description !== '') {
					label += " | " + oneTmpl.description;
				}
				
				if (oneTmpl.technology === "kubernetes" || oneTmpl.technology === "docker") {
					containerTemplates.push({'v': oneTmpl.name, 'l': label});
				}
				else if (oneTmpl.technology === 'vm') {
					vmTemplates.push({'v': oneTmpl.name, 'l': label});
				}
			});
			
			//compute default active tab
			currentScope.cloud.tabs = {
				'containers': false,
				'vms': false
			};
			
			if (currentScope.cloud.showDocker || currentScope.cloud.showKube) {
				currentScope.cloud.tabs.containers = true;
				expandProviderContainerOptions(currentScope, oneProvider, iacTemplates, containerTemplates, () => {
					returnToCaller();
				});
			}
			
			if (currentScope.cloud.showVm) {
				if (!currentScope.cloud.tabs.containers) {
					currentScope.cloud.tabs.vms = true;
				}
				expandProviderVMOptions(currentScope, oneProvider, iacTemplates, vmTemplates, containerTemplates, () => {
					returnToCaller();
				});
			}
		}
		else {
			$window.alert("The provider you have selected does not have any SOAJS driver that allow you to provision a Container Cluster or a Virtual Machine!");
			return false;
		}
		
		function returnToCaller() {
			overlayLoading.hide();
			if (!callbackReturned && callback && typeof callback === 'function') {
				callbackReturned = true;
				return callback();
			}
		}
	}
	
	/**
	 * function that displays the container details that the cloud provider supports so the user can select how to move forward
	 * @param currentScope
	 */
	function expandProviderContainerOptions(currentScope, oneProvider, iacTemplates, containerTemplates, cb) {
		
		//update the container form entries
		currentScope.containers = currentScope.cloud.$new();
		
		//check environment deployer options
		if (currentScope.environment.selected && currentScope.environment.selected.includes('container') && (!currentScope.environment.pending || !currentScope.environment.error)) {
			currentScope.containers.dockerImagePath = "./themes/" + themeToUse + "/img/docker_logo.png";
			currentScope.containers.kubernetesImagePath = "./themes/" + themeToUse + "/img/kubernetes_logo.png";
			
			currentScope.containers.form.formData.selectedProvider = oneProvider;
			platformCntnr.checkContainerTechnology(currentScope);
			
			currentScope.containers.detachContainer = function () {
				platformCntnr.detachContainerTechnology(currentScope);
			};
			
			if (cb && typeof(cb) === 'function') {
				return cb();
			}
		}
		else {
			currentScope.attach = true;
			currentScope.containers.showDocker = currentScope.cloud.showDocker;
			currentScope.containers.showKube = currentScope.cloud.showKube;
			currentScope.containers.techProviders = currentScope.cloud.techProviders;
			platformCntnr.go(currentScope);
			
			
			let formEntries = [];
			formEntries.unshift({
				type: 'select',
				name: 'infraCodeTemplate',
				label: "Select Infra As Code Template",
				value: containerTemplates,
				required: true,
				fieldMsg: "Pick which Infra Code template to use for the deployment of your container cluster. If you do nave any template yet, <a href='#/infra-templates?infraId=" + currentScope.cloud.form.formData.selectedProvider._id + "'>Click Here</a>",
				onAction: function (id, value, form) {
					form.entries.length = 1;
					iacTemplates.forEach((oneTmpl) => {
						if (oneTmpl.name === value && oneTmpl.inputs) {
							if (typeof(oneTmpl.inputs) === 'string') {
								try {
									oneTmpl.inputs = JSON.parse(oneTmpl.inputs);
								}
								catch (e) {
									console.log('unable to parse input of ' + oneTmpl.name);
									console.log(e);
								}
							}
							
							if (Array.isArray(oneTmpl.inputs)) {
								form.entries = form.entries.concat(oneTmpl.inputs);
							}
						}
					});
					if (!currentScope.wizard) {
						form.actions.length = 1;
						form.actions.push({
							'type': 'button',
							'label': "Cancel",
							'btn': 'danger',
							'action': function () {
								currentScope.containers.form.formData = {};
								currentScope.containers.form.entries.length = 1;
								currentScope.containers.form.formData.selectedProvider = currentScope.cloud.form.formData.selectedProvider;
								
								form.actions.pop();
							}
						});
					}
				}
			});
			
			//simulate building forms
			let options = {
				timeout: $timeout,
				entries: formEntries,
				name: 'createContainer',
				actions: []
			};
			
			//set the button if this is not the wizard calling the module
			if (!currentScope.wizard) {
				options.actions.push({
					'type': 'button',
					'label': "Create Container",
					'btn': 'primary',
					'action': function () {
						let formData = currentScope.containers.form.formData;
						let proceed = false;
						if (formData.previousEnvironment) {
							formData = {previousEnvironment: currentScope.containers.form.formData.previousEnvironment};
							proceed = true;
						}
						else {
							if(formData.infraCodeTemplate){
								currentScope.containers.techProviders[0].deploy = angular.copy(formData);
								delete currentScope.containers.techProviders[0].deploy.selectedProvider;
								proceed = true;
							}
						}
						
						if (!proceed) {
							$window.alert("Either choose to use the same cluster of a previous created environment or select an Infra As Code Template and fill out its inputs so you can proceed.");
						}
						else {
							//call attach container technology api
							currentScope.containers.attachContainerTechnology(formData);
						}
					}
				});
			}
			
			//calculate and build the similar environment list if any
			currentScope.containers.getEnvironments((environments) => {
				buildForm(currentScope.containers, null, options, function () {
					currentScope.containers.form.formData.selectedProvider = currentScope.cloud.form.formData.selectedProvider;
					
					//change the default behavior of switchDriver, when the user clicks the accordion run something extra from below
					let selectedDriver;
					let switchDriver = angular.copy(currentScope.containers.switchDriver);
					currentScope.containers.switchDriver = function (driver) {
						if (selectedDriver !== driver) {
							selectedDriver = driver;
							switchDriver(driver);
							
							let element = angular.element(document.getElementById(currentScope.cloud.form.formData.selectedProvider.name + "_" + driver));
							element.html("<div ng-include=\"'engine/lib/form/inputs.tmpl'\"></div>");
							if (currentScope.wizard) {
								$compile(element.contents())(currentScope.containers);
							}
							else {
								$compile(element.contents())(currentScope.containers);
							}
						}
					};
					
					if (cb && typeof(cb) === 'function') {
						return cb();
					}
				});
			});
		}
		
	}
	
	/**
	 * function that displays the vm details that the cloud provider supports so the user can create or onboard clusters
	 * @param currentScope
	 * @param oneProvider
	 * @param iacTemplates
	 * @param vmTemplates
	 * @param cb
	 */
	function expandProviderVMOptions(currentScope, oneProvider, iacTemplates, vmTemplates, containerTemplates, cb) {
		
		//update the container form entries
		if(!currentScope.wizard){
			currentScope.vms = currentScope.cloud.$new();
			currentScope.vms.envCode = currentScope.envCode;
			
			platformsVM.go(currentScope, 'listVMLayers');
			currentScope.vms.form.formData.selectedProvider = currentScope.cloud.form.formData.selectedProvider;
		}
		
		if (cb && typeof(cb) === 'function') {
			return cb();
		}
	}
	
	/**
	 * call the api to remove the lock of the cloud provider from this environment
	 * @param currentScope
	 */
	function removeCloudProviderLockOnEnvironment(currentScope) {
		
		$modal.open({
			templateUrl: "removeCloudProviderLock.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				
				$scope.proceed = function () {
					let requestOptions = {
						"method": "delete",
						"routeName": "/dashboard/environment/infra/lock",
						"params": {
							"envCode": currentScope.envCode.toUpperCase()
						}
					};
					overlayLoading.show();
					getSendDataFromServer(currentScope, ngDataApi, requestOptions, function (error, response) {
						overlayLoading.hide();
						if (error) {
							$modalInstance.close();
							currentScope.displayAlert('danger', error.message);
						}
						else {
							$modalInstance.close();
							currentScope.displayAlert('success', `Environment update, cloud provider <b>${currentScope.cloud.selectedProvider.label}</b> is no longer used as infrastructure.`);
							delete currentScope.cloud;
							delete currentScope.containers;
							delete currentScope.vms;
							delete currentScope.attach;
							setTimeout(() => {
								currentScope.environment.type = 'manual';
								currentScope.getEnvPlatform(true);
							}, 500);
						}
					});
				};
				
				$scope.cancel = function () {
					$modalInstance.close();
				};
			}
		});
	}
	
	/**
	 * main entry point for this angular service
	 * @param currentScope
	 * @param operation
	 */
	function go(currentScope, operation, cb) {
		
		if (!currentScope.cloud) {
			currentScope.cloud = currentScope.$new(); //true means detached from main currentScope
			
			//reset the form and its data
			currentScope.cloud.form = {formData: {}};
		}
		delete currentScope.cloud.networksList;
		delete currentScope.cloud.noNetworks;
		
		//function used to switch the provider based on the accordion selected and the reset the chosen fields for that provider
		currentScope.cloud.switchProvider = function (oneProvider) {
			
			//for the accordion
			currentScope.cloud.cloudProviders.forEach((provider) => {
				delete provider.expanded;
			});
			
			if (!currentScope.cloud.form.formData.selectedProvider || (oneProvider._id !== currentScope.cloud.form.formData.selectedProvider._id)) {
				currentScope.cloud.form.formData.selectedProvider = angular.copy(oneProvider);
				
				delete currentScope.cloud.form.formData.region;
				delete currentScope.cloud.form.formData.providerExtra;
				delete currentScope.cloud.networksList;
				delete currentScope.cloud.noNetworks;
				
				//remove the next if the provider is switched
				if (!currentScope.wizard && currentScope.cloud.form.actions.length > 1) {
					currentScope.cloud.form.actions.shift();
				}
			}
			//for the accordion
			oneProvider.expanded = true;
		};
		
		//function that populates the list of provider specific extra inputs ( if any )
		currentScope.cloud.populateProviderExtra = function () {
			let autoTrigger = false;
			if (currentScope.cloud.form.formData.selectedProvider.providerExtra) {
				delete currentScope.cloud.form.formData.selectedProvider.providerExtra;
			}
			
			delete currentScope.cloud.networksList;
			delete currentScope.cloud.noNetworks;
			
			if (currentScope.cloud.form.formData.selectedProvider.providerSpecific) {
				currentScope.cloud.form.formData.selectedProvider.providerSpecific.forEach((oneSpecific) => {
					if (currentScope.cloud.form.formData.selectedProvider[oneSpecific]) {
						currentScope.cloud.form.formData.selectedProvider.providerExtra = {};
						currentScope.cloud.form.formData.selectedProvider.providerExtra[oneSpecific] = {
							name: oneSpecific,
							label: oneSpecific,
							value: [],
							required: true
						};
						
						let dropDownMenu = [];
						currentScope.cloud.form.formData.selectedProvider[oneSpecific].forEach((oneValue) => {
							if (!oneValue.region) {
								let extraObj = {v: oneValue.name, l: oneValue.name};
								dropDownMenu.push(extraObj);
							}
							else if (oneValue.region === currentScope.cloud.form.formData.region) {
								let extraObj = {v: oneValue.name, l: oneValue.name};
								dropDownMenu.push(extraObj);
							}
							
							if (currentScope.cloud.form.formData && currentScope.cloud.form.formData.extras) {
								if (!currentScope.cloud.form.formData.providerExtra) {
									currentScope.cloud.form.formData.providerExtra = {};
								}
								let label = (oneSpecific === 'groups') ? 'group' : oneSpecific;
								currentScope.cloud.form.formData.providerExtra[oneSpecific] = currentScope.cloud.form.formData.extras[label];
								autoTrigger = true;
							}
							
						});
						currentScope.cloud.form.formData.selectedProvider.providerExtra[oneSpecific].value = dropDownMenu;
					}
				});
				
				if (autoTrigger) {
					currentScope.cloud.populateNetworks();
				}
			}
			else {
				currentScope.cloud.populateNetworks();
			}
		};
		
		//redirect the user to go create a network if the link is clicked
		currentScope.cloud.goToInfraNetworks = function () {
			let infraCookieCopy = currentScope.cloud.form.formData.selectedProvider;
			delete infraCookieCopy.templates;
			delete infraCookieCopy.groups;
			delete infraCookieCopy.regions;
			delete infraCookieCopy.deployments;
			delete infraCookieCopy.api;
			$cookies.putObject('myInfra', infraCookieCopy, {'domain': interfaceDomain});
			currentScope.updateParentScope('currentSelectedInfra', currentScope.cloud.form.formData.selectedProvider);
			
			overlayLoading.show();
			$timeout(() => {
				let goToLink = `#/infra-networks?infraId=${currentScope.cloud.form.formData.selectedProvider._id}&region=${currentScope.cloud.form.formData.region}`;
				if (currentScope.cloud.form.formData.providerExtra && currentScope.cloud.form.formData.providerExtra.groups) {
					goToLink += "&group=" + currentScope.cloud.form.formData.providerExtra['groups'];
				}
				$window.location.href = goToLink;
				overlayLoading.hide();
			}, 200);
		};
		
		//function that fetches the networks of this provider based on region and provider specific extra inputs selected ( if any )
		currentScope.cloud.populateNetworks = function () {
			delete currentScope.cloud.networksList;
			delete currentScope.cloud.noNetworks;
			
			let requestOptions = {
				"method": "get",
				"routeName": "/dashboard/infra/extras",
				"params": {
					"id": currentScope.cloud.form.formData.selectedProvider._id,
					"region": currentScope.cloud.form.formData.region,
					"extras[]": ['networks']
				}
			};
			if (currentScope.cloud.form.formData.providerExtra && Object.keys(currentScope.cloud.form.formData.providerExtra).length > 0) {
				for (let property in currentScope.cloud.form.formData.providerExtra) {
					let paramProperty = (property === 'groups') ? 'group' : property;
					requestOptions.params[paramProperty] = currentScope.cloud.form.formData.providerExtra[property];
				}
			}
			if(!currentScope.wizard){
				overlayLoading.show();
			}
			getSendDataFromServer(currentScope, ngDataApi, requestOptions, function (error, networks) {
				if(!currentScope.wizard) {
					overlayLoading.hide();
				}
				if (error) {
					currentScope.displayAlert('danger', error.message);
				}
				else {
					delete networks.soajsauth;
					delete currentScope.cloud.networksList;
					
					if (networks.networks && networks.networks.length > 0) {
						currentScope.cloud.noNetworks = false;
						currentScope.cloud.networksList = {
							name: "networks",
							label: "networks",
							value: [],
							required: true
						};
						
						networks.networks.forEach((oneNetwork) => {
							currentScope.cloud.networksList.value.push({'v': oneNetwork.name, 'l': oneNetwork.name});
						});
					}
					else {
						currentScope.cloud.noNetworks = true;
					}
				}
			});
		};
		
		//show the form buttons to allow the user to move to the next step
		currentScope.cloud.showNextButton = function () {
			
			if (!currentScope.cloud.form.formData.network || currentScope.cloud.form.formData.network === '') {
				currentScope.cloud.form.actions.shift();
			}
			else {
				if (currentScope.cloud.form.actions.length > 1) {
					currentScope.cloud.form.actions.shift();
				}
				
				currentScope.cloud.form.actions.unshift({
					'type': 'button',
					'label': "Update Environment",
					'btn': 'primary',
					'action': function () {
						if (!currentScope.cloud.form.formData.selectedProvider) {
							$window.alert("Select a cloud Provider to proceed.");
							return false;
						}
						
						if (!currentScope.cloud.form.formData.region) {
							$window.alert("Select a region for this cloud Provider to proceed.");
							return false;
						}
						
						if (!currentScope.cloud.form.formData.network) {
							$window.alert("Select a network for this cloud Provider to proceed.");
							return false;
						}
						
						//call api and lock the infra then update the environment scope
						let requestOptions = {
							"method": "post",
							"routeName": "/dashboard/environment/infra/lock",
							"data": {
								"envCode": currentScope.envCode,
								"infraId": currentScope.cloud.form.formData.selectedProvider._id,
								"region": currentScope.cloud.form.formData.region,
								"network": currentScope.cloud.form.formData.network
							}
						};
						
						if (currentScope.cloud.form.formData.providerExtra && Object.keys(currentScope.cloud.form.formData.providerExtra).length > 0) {
							if (!requestOptions.data.extras) {
								requestOptions.data.extras = {};
							}
							for (let property in currentScope.cloud.form.formData.providerExtra) {
								let paramProperty = (property === 'groups') ? 'group' : property;
								requestOptions.data.extras[paramProperty] = currentScope.cloud.form.formData.providerExtra[property];
							}
						}
						
						overlayLoading.show();
						getSendDataFromServer(currentScope, ngDataApi, requestOptions, function (error, networks) {
							overlayLoading.hide();
							if (error) {
								currentScope.displayAlert('danger', error.message);
							}
							else {
								currentScope.getEnvPlatform(true);
								delete currentScope.cloud;
							}
						});
					}
				});
			}
		};
		
		currentScope.cloud.selectProvider = function (cb) {
			selectProvider(currentScope, cb);
		};
		
		currentScope.cloud.renderDisplay = function () {
			checkContainerTechnology(currentScope);
		};
		
		currentScope.cloud.createContainer = function () {
			openContainerWizard(currentScope);
		};
		
		currentScope.cloud.deleteContainer = function () {
			detachContainerTechnology(currentScope);
		};
		
		currentScope.cloud.printProvider = function (cb) {
			printProvider(currentScope, cb);
		};
		
		currentScope.cloud.expandProviderOptions = function (cb) {
			expandProviderOptions(currentScope, cb);
		};
		
		currentScope.cloud.removeProviderLock = function () {
			removeCloudProviderLockOnEnvironment(currentScope);
		};
		
		if (operation) {
			currentScope.cloud[operation](cb);
		}
	}
	
	return {
		'go': go
	}
}]);