"use strict";
let infraCommonCSrv = soajsApp.components;
infraCommonCSrv.service('infraCommonSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload) {

	function getInfraDriverName(currentScope) {
		let oneInfra = currentScope.$parent.$parent.currentSelectedInfra;
		let name = oneInfra.name; // -> azure
		return name;
	}

	function getInfraFromCookie(currentScope) {
		if ($cookies.getObject('myInfra', {'domain': interfaceDomain})) {
			currentScope.$parent.$parent.currentSelectedInfra = $cookies.getObject('myInfra', {'domain': interfaceDomain});
			$timeout(() => {
				hideSidebarMenusForUnwantedProviders(currentScope, currentScope.$parent.$parent.currentSelectedInfra);
			}, 200);
		}
	}

	function getInfra(currentScope, opts, cb) {
		let options = {
			"method": "get",
			"routeName": "/dashboard/infra",
			"params": {
				"exclude[]": ["groups", "regions", "templates"]
			}
		};

		if (opts.id) {
			options.params.id = opts.id;
		}

		if(opts.exclude){
			options.params['exclude[]'] = opts.exclude;
		}

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, options, (error, response) => {
			overlayLoading.hide();
			if(error){
				return cb(error);
			}

			if(opts.id){
				$timeout(() => {
					hideSidebarMenusForUnwantedProviders(currentScope, response);
				}, 300);
			}
			else {
				if (response.length === 0) {
					$timeout(() => {
						currentScope.$parent.$parent.leftMenu.links.forEach((oneNavigationEntry) => {
							if(['infra-deployments', 'infra-templates', 'infra-groups', 'infra-networks', 'infra-firewall', 'infra-lb', 'infra-ip'].indexOf(oneNavigationEntry.id) !== -1){
								oneNavigationEntry.hideMe = true;
							}
						});
					}, 200);
				}
			}
			return cb(null, response);
		});
	}

	function switchInfra(currentScope, oneInfra, exclude, cb) {
		$timeout(() => {
			overlayLoading.show();
			getInfra(currentScope, {
				id: oneInfra._id,
				exclude: exclude
			}, (error, myInfra) => {
				overlayLoading.hide();
				if (error) {
					currentScope.displayAlert("danger", error);
				}
				else {
					if(currentScope.$parent && currentScope.$parent.$parent){
						currentScope.$parent.$parent.currentSelectedInfra = myInfra;
					}

					if (!currentScope.$parent.$parent.currentSelectedInfra) {
						currentScope.$parent.$parent.go("/infra");
					}

					let infraCookieCopy = angular.copy(myInfra);
					delete infraCookieCopy.templates;
					delete infraCookieCopy.groups;
					delete infraCookieCopy.region;
					delete infraCookieCopy.deployments;
					delete infraCookieCopy.api;
					$cookies.putObject('myInfra', infraCookieCopy, {'domain': interfaceDomain});

					//check if infraProviders more than 0 and then unhide the leftMenu items that were hidden when there were no infra providers configured
					if (currentScope.infraProviders.length > 0) {
						currentScope.$parent.$parent.leftMenu.links.forEach((oneNavItem) => {
							if (['infra-deployments', 'infra-templates'].indexOf(oneNavItem.id) !== -1) {
								oneNavItem.hideMe = false;
							}
						});
					}
					
					infraConfig.form.providers.forEach((oneProvider) => {
						if(myInfra.name === 'local'){
							if(myInfra.technologies[0] === oneProvider.name){
								myInfra.logo = oneProvider.value;
							}
						}
						else if(myInfra.name === oneProvider.name){
							myInfra.logo = oneProvider.value;
						}
					});
					
					if(myInfra.name === 'local'){
						myInfra.icon = infraConfig.logos[myInfra.technologies[0]];
					}
					else{
						myInfra.icon = infraConfig.logos[myInfra.name];
					}

					hideSidebarMenusForUnwantedProviders(currentScope, myInfra);

					if(cb && typeof cb === 'function'){
						return cb();
					}
				}
			});
		}, 500);
	}

	function hideSidebarMenusForUnwantedProviders(currentScope, myInfra){

		let excludedInfras = ['infra-templates', 'infra-groups', 'infra-networks', 'infra-firewall', 'infra-lb', 'infra-ip'];

		let excludedVms = ['infra-groups', 'infra-networks', 'infra-firewall', 'infra-lb', 'infra-ip'];
		
		let excludedDeployments = ['infra-deployments'];

		//fix the menu; local driver has not templates
		if(currentScope.$parent && currentScope.$parent.$parent && currentScope.$parent.$parent.appNavigation){
			currentScope.$parent.$parent.appNavigation.forEach((oneNavigationEntry) => {

				oneNavigationEntry.hideMe = false;
				if(myInfra.name === 'local'){
					if(excludedInfras.indexOf(oneNavigationEntry.id) !== -1){
						oneNavigationEntry.hideMe = true;
						
						if(oneNavigationEntry.url === $window.location.hash){
							currentScope.go(oneNavigationEntry.fallbackLocation);
						}
					}
				}
				else if(['azure'].indexOf(myInfra.name) !== -1){
					if(excludedDeployments.indexOf(oneNavigationEntry.id) !== -1){
						oneNavigationEntry.hideMe = true;
						
						if(oneNavigationEntry.url === $window.location.hash){
							currentScope.go(oneNavigationEntry.fallbackLocation);
						}
					}
				}
				else if(['google'].indexOf(myInfra.name) !== -1){
					if(excludedVms.indexOf(oneNavigationEntry.id) !== -1){
						oneNavigationEntry.hideMe = true;

						if(oneNavigationEntry.url === $window.location.hash){
							currentScope.go(oneNavigationEntry.fallbackLocation);
						}
					}
				}
				//disable resource groups section for AWS only
				else if(['aws'].indexOf(myInfra.name) !== -1){
					if(['infra-groups'].indexOf(oneNavigationEntry.id) !== -1){
						oneNavigationEntry.hideMe = true;

						if(oneNavigationEntry.url === $window.location.hash){
							currentScope.go(oneNavigationEntry.fallbackLocation);
						}
					}
				}
				else if(['azure'].indexOf(myInfra.name) !== -1) {
					if(['infra-keyPairs', 'infra-certificates'].indexOf(oneNavigationEntry.id) !== -1){
						oneNavigationEntry.hideMe = true;

						if(oneNavigationEntry.url === $window.location.hash){
							currentScope.go(oneNavigationEntry.fallbackLocation);
						}
					}
				}
			});
		}
	}

	function activateProvider(currentScope) {
		let providersList = angular.copy(infraConfig.form.providers);
		providersList.forEach((oneProvider) => {
			oneProvider.onAction = function (id, value, form) {
				currentScope.modalInstance.close();
				setTimeout(() => {
					step2(id);
				}, 10);
			}
		});

		let options = {
			timeout: $timeout,
			form: {
				"entries": providersList
			},
			name: 'activateProvider',
			label: 'Connect New Provider',
			actions: [
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

		buildFormWithModal(currentScope, $modal, options);

		function step2(selectedProvider) {
			let options = {
				timeout: $timeout,
				form: {
					"entries": angular.copy(infraConfig.form[selectedProvider])
				},
				name: 'activateProvider',
				label: 'Connect New Provider',
				actions: [
					{
						'type': 'submit',
						'label': "Connect Provider",
						'btn': 'primary',
						'action': function (formData) {
							let data = angular.copy(formData);
							delete data.label;
							overlayLoading.show();
							getSendDataFromServer(currentScope, ngDataApi, {
								"method": "post",
								"routeName": "/dashboard/infra",
								"data": {
									"name": selectedProvider,
									"label": formData.label,
									"api": data
								}
							}, function (error) {
								overlayLoading.hide();
								if (error) {
									currentScope.form.displayAlert('danger', error.message);
								}
								else {
									currentScope.form.displayAlert('success', "Provider Connected & Activated");
									currentScope.modalInstance.close();
									currentScope.go("#/infra");

									//get all infras
									getInfra(currentScope, {}, (error, infras) => {
										if (error) {
											currentScope.displayAlert('danger', error);
										} else {
											//reset flag to hide "no infras" warning
											currentScope.noInfraProvidersConfigured = false;

											//copy infras to scope and parent scope
											currentScope.infraProviders = infras;
											currentScope.$parent.$parent.infraProviders = angular.copy(currentScope.infraProviders);

											//switch to the latest added infra
											switchInfra(currentScope, infras[infras.length - 1]);
										}
									});
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

			buildFormWithModal(currentScope, $modal, options);
		}
	}

	function getVMLayers(currentScope, cb){
		let oneProvider = currentScope.$parent.$parent.currentSelectedInfra;
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/cloud/vm/list",
			"params":{
				"infraId": oneProvider._id
			}
		}, function (error, providerVMs) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
				return cb();
			}
			else {
				let allVMs = [];

				delete providerVMs.soajsauth;

				//aggregate response and generate layers from list returned
				if(providerVMs[oneProvider.name] && Array.isArray(providerVMs[oneProvider.name]) && providerVMs[oneProvider.name].length > 0){
					providerVMs[oneProvider.name].forEach((oneVM) => {
						delete oneVM.template;
						allVMs.push(oneVM);
					});
				}
				return cb(null, allVMs);
			}
		});
	}

	return {
		"getInfraDriverName": getInfraDriverName,
		"hideSidebarMenusForUnwantedProviders": hideSidebarMenusForUnwantedProviders,
		"activateProvider": activateProvider,
		"getInfraFromCookie": getInfraFromCookie,
		"getInfra": getInfra,
		"switchInfra": switchInfra,
		"getVMLayers": getVMLayers
	}
}]);
