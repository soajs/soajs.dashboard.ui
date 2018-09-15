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
infraApp.controller('infraCtrl', ['$scope', '$window', '$modal', '$timeout', '$localStorage', '$cookies', 'injectFiles', 'ngDataApi', 'infraCommonSrv', function ($scope, $window, $modal, $timeout, $localStorage, $cookies, injectFiles, ngDataApi, infraCommonSrv) {
	$scope.$parent.isUserNameLoggedIn();
	$scope.showTemplateForm = false;

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, infraConfig.permissions);

	infraCommonSrv.getInfraFromCookie($scope);

	$scope.getProviders = function () {
		$localStorage.infraProviders =[];
		$scope.updateParentScope('infraProviders', []);
		
		infraCommonSrv.getInfra($scope, {
			id: null,
			exclude: ["groups", "regions", "templates"]
		}, (error, infras) => {
			if (error) {
				$scope.displayAlert("danger", error);
			}
			else {
				//no infra providers to list
				$scope.noInfraProvidersConfigured = true;
				if (infras.length > 0) {
					$scope.noInfraProvidersConfigured = false;
					$scope.infraProviders = infras;
					$localStorage.infraProviders = angular.copy($scope.infraProviders);
					$scope.updateParentScope('infraProviders', angular.copy($scope.infraProviders));
					if (!$scope.getFromParentScope('currentSelectedInfra')) {
						infraCommonSrv.switchInfra($scope, infras[0]);
					}
					else{
						infraCommonSrv.switchInfra($scope, $scope.getFromParentScope('currentSelectedInfra'));
					}
				}
				else{
					$scope.removeFromParentScope('currentSelectedInfra');
					$cookies.remove('myInfra', { 'domain': interfaceDomain });
				}
			}
		});
	};

	$scope.$parent.$parent.switchInfra = function (oneInfra) {
		infraCommonSrv.switchInfra($scope, oneInfra, ["groups", "regions", "templates"]);
	};

	$scope.$parent.$parent.activateProvider = function () {
		infraCommonSrv.activateProvider($scope);
	};

	$scope.editProvider = function (oneProvider) {
		let providerName = oneProvider.name;
		if (oneProvider.name === 'local') {
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
				$scope.removeFromParentScope('currentSelectedInfra');
				$scope.getProviders();
			}
		});
	};

	if ($scope.access.list) {
		$scope.getProviders();
	}
	injectFiles.injectCss("modules/dashboard/infra/infra.css");
}]);
