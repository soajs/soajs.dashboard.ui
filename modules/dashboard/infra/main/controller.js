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
		$localStorage.infraProviders = [];
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
					else {
						infraCommonSrv.switchInfra($scope, $scope.getFromParentScope('currentSelectedInfra'));
					}
				}
				else {
					$scope.removeFromParentScope('currentSelectedInfra');
					$cookies.remove('myInfra', {'domain': interfaceDomain});
				}
			}
		});
	};
	
	$scope.$parent.$parent.switchInfra = function (oneInfra) {
		infraCommonSrv.switchInfra($scope, oneInfra, ["groups", "regions", "templates"]);
	};
	
	$scope.$parent.$parent.activateProvider = function (cloud) {
		infraCommonSrv.activateProvider($scope, cloud);
	};
	
	function setEditorContent(id) {
		try {
			let editor = ace.edit(id);
			editor.setValue('');
		} catch (e) {
			$timeout(function () {
				let editor = ace.edit(id);
				editor.setValue('');
			}, 100);
		}
	}
	
	$scope.editProvider = function (oneProvider) {
		let providerName = oneProvider.type;
		// let providerName = oneProvider.name;
		// if (oneProvider.name === 'local') {
		// 	providerName = oneProvider.technologies[0];
		// }
		let editEntriesList = angular.copy(infraConfig.form[providerName]);
		editEntriesList.shift();
		if (oneProvider.configuration) {
			oneProvider.configuration.description = oneProvider.description;
		}
		let options = {
			timeout: $timeout,
			form: {
				"entries": editEntriesList
			},
			data: oneProvider.configuration,
			name: 'editProvider',
			label: "Modify Connection of " + oneProvider.label,
			actions: [
				{
					'type': 'submit',
					'btn': 'primary',
					'label': 'Save',
					'action': function (formData) {
						let data = angular.copy(formData);
						data.type = "secret";
						delete data.description;
						if (!data.ca) {
							delete data.ca;
						}
						overlayLoading.show();
						getSendDataFromServer($scope, ngDataApi, {
							"method": "put",
							"routeName": "/infra/account/kubernetes/configuration",
							"params": {},
							"data": {
								"id": oneProvider._id,
								"description": formData.description,
								"configuration": data
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
		
		buildFormWithModal($scope, $modal, options, () => {
			setEditorContent("ca");
		});
	};
	
	$scope.deactivateProvider = function (oneProvider) {
		let options = {
			"method": "delete",
			"routeName": "/infra/account/kubernetes",
			"data": {
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
	$scope.openSettings = function (infra) {
		$scope.$parent.go("#/infra/configDetailView/" + infra._id, "_blank");
	};
	if ($scope.access.list) {
		$scope.getProviders();
	}
	injectFiles.injectCss("modules/dashboard/infra/infra.css");
}]);
