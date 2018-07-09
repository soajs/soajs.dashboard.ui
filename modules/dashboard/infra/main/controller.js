/*
 *  **********************************************************************************
 *   (C) Copyright Herrontech (www.herrontech.com)
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   Contributors:
 *   -
 *  **********************************************************************************
 */

"use strict";
var infraApp = soajsApp.components;
infraApp.controller('infraCtrl', ['$scope', '$window', '$modal', '$timeout', '$localStorage', '$cookies', 'injectFiles', 'ngDataApi', 'infraSrv', function ($scope, $window, $modal, $timeout, $localStorage, $cookies, injectFiles, ngDataApi, infraSrv) {
	$scope.$parent.isUserNameLoggedIn();
	$scope.showTemplateForm = false;

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, infraConfig.permissions);
	
	if($cookies.getObject('myInfra', { 'domain': interfaceDomain })){
		$scope.$parent.$parent.currentSelectedInfra = $cookies.getObject('myInfra', { 'domain': interfaceDomain });
	}

	$scope.getProviders = function () {
		overlayLoading.show();
		infraSrv.getInfra($scope, (error, infras) => {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert("danger", error);
			}
			else {
				$scope.infraProviders = infras;
				$localStorage.infraProviders = angular.copy($scope.infraProviders);
				$scope.$parent.$parent.infraProviders = angular.copy($scope.infraProviders);
				if(!$scope.$parent.$parent.currentSelectedInfra){
					$scope.$parent.$parent.switchInfra(infras[0]);
				}
			}
		});
	};
	
	$scope.$parent.$parent.switchInfra = function(oneInfra){
		$scope.$parent.$parent.currentSelectedInfra = oneInfra;
		$cookies.putObject('myInfra', oneInfra, { 'domain': interfaceDomain });
	};
	
	$scope.$parent.$parent.activateProvider = function(){
		$scope.activateProvider();
	};

	$scope.activateProvider = function () {
		let providersList = angular.copy(infraConfig.form.providers);
		providersList.forEach((oneProvider) => {
			oneProvider.onAction = function(id, value, form){
				$scope.modalInstance.close();
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
						delete $scope.form.formData;
						$scope.modalInstance.close();
					}
				}
			]
		};

		buildFormWithModal($scope, $modal, options);

		function step2(selectedProvider){
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
							getSendDataFromServer($scope, ngDataApi, {
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
									$scope.form.displayAlert('danger', error.message);
								}
								else {
									$scope.form.displayAlert('success', "Provider Connected & Activated");
									$scope.getProviders();
									$scope.modalInstance.close();
								}
							});
						}
					},
					{
						'type': 'reset',
						'label': 'Cancel',
						'btn': 'danger',
						'action': function () {
							delete $scope.form.formData;
							$scope.modalInstance.close();
						}
					}
				]
			};

			buildFormWithModal($scope, $modal, options);
		}
	};

	$scope.editProvider = function (oneProvider) {
		let providerName = oneProvider.name;
		if(oneProvider.name === 'local'){
			providerName = oneProvider.technologies[0];
		}
		let editEntriesList = angular.copy(infraConfig.form[providerName]);
		editEntriesList.shift();

		let options = {
			timeout: $timeout,
			form: {
				"entries": editEntriesList
			},
			data: oneProvider.api,
			name: 'editProvider',
			label: "Modify Connection of " + oneProvider.label,
			actions: [
				{
					'type': 'submit',
					'btn': 'primary',
					'label': 'Save',
					'action': function (formData) {
						overlayLoading.show();
						getSendDataFromServer($scope, ngDataApi, {
							"method": "put",
							"routeName": "/dashboard/infra",
							"params": {
								"id": oneProvider._id
							},
							"data": {
								"api": formData
							}
						}, function (error) {
							overlayLoading.hide();
							if (error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.form.displayAlert('success', "Provider Connection Settings updated Successfully.");
								$scope.getProviders();
								$scope.modalInstance.close();
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function () {
						delete $scope.form.formData;
						$scope.modalInstance.close();
					}
				}
			]
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.deactivateProvider = function (oneProvider) {
		let options = {
			"method": "delete",
			"routeName": "/dashboard/infra",
			"params": {
				"id": oneProvider._id
			}
		};
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert("danger", error);
			}
			else {
				$scope.displayAlert("success", "Provider deactivated successfully.");
				$scope.getProviders();
			}
		});
	};

	if ($scope.access.list) {
		$scope.getProviders();
	}
	injectFiles.injectCss("modules/dashboard/infra/infra.css");
}]);
