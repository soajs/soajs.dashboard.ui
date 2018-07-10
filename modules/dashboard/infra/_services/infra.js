"use strict";
let infraCommonCSrv = soajsApp.components;
infraCommonCSrv.service('infraCommonSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload) {
	
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
				"exclude": ["groups", "regions", "templates"]
			}
		};
		
		if (opts.id) {
			options.routeName += "/" + opts.id;
		}
		
		if(opts.exclude){
			options.params.exclude = opts.exclude;
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
			return cb(null, response);
		});
	}
	
	function switchInfra(currentScope, oneInfra, exclude) {
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
						currentScope.go("/infra");
					}
					
					let infraCookieCopy = angular.copy(myInfra);
					delete infraCookieCopy.templates;
					delete infraCookieCopy.groups;
					delete infraCookieCopy.region;
					delete infraCookieCopy.deployments;
					delete infraCookieCopy.api;
					$cookies.putObject('myInfra', infraCookieCopy, {'domain': interfaceDomain});
					hideSidebarMenusForUnwantedProviders(currentScope, myInfra);
				}
			});
		}, 500);
	}
	
	function hideSidebarMenusForUnwantedProviders(currentScope, myInfra){
		
		let excludedInfras = ['infra-templates'];
		
		//fix the menu; local driver has not templates
		if(currentScope.$parent && currentScope.$parent.$parent && currentScope.$parent.$parent.appNavigation){
			currentScope.$parent.$parent.appNavigation.forEach((oneNavigationEntry) => {
				if(excludedInfras.indexOf(oneNavigationEntry.id) !== -1){
					oneNavigationEntry.hideMe = false;
					
					if(myInfra.name === 'local'){
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
									currentScope.getProviders();
									currentScope.modalInstance.close();
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
	
	return {
		"hideSidebarMenusForUnwantedProviders": hideSidebarMenusForUnwantedProviders,
		"activateProvider": activateProvider,
		"getInfraFromCookie": getInfraFromCookie,
		"getInfra": getInfra,
		"switchInfra": switchInfra
	}
}]);