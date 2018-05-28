"use strict";
var infraApp = soajsApp.components;
infraApp.controller('infraCtrl', ['$scope', '$window', '$modal', '$timeout', '$cookies', 'injectFiles', 'ngDataApi', 'infraSrv', 'Upload', function ($scope, $window, $modal, $timeout, $cookies, injectFiles, ngDataApi, infraSrv, Upload) {
	$scope.$parent.isUserNameLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, infraConfig.permissions);

	$scope.getProviders = function () {
		infraSrv.getInfra($scope, (error, infras) => {
			if (error) {
				$scope.displayAlert("danger", error);
			}
			else {
				$scope.infraProviders = infras;
			}
		});
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

	$scope.deleteDeployment = function (oneDeployment, oneInfra) {
		let options = {
			"method": "delete",
			"routeName": "/dashboard/infra/deployment",
			"params": {
				"id": oneInfra._id,
				"deploymentId": oneDeployment.id
			}
		};
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert("danger", error);
			}
			else {
				$scope.displayAlert("success", "Deployment deleted successfully.");
				$scope.getProviders();
			}
		});
	};

	$scope.previewTemplate = function(oneTemplate){
		if(oneTemplate.location === 'local') {
			let formConfig = angular.copy({
				'entries': [
					{
						'type':'html',
						'value': "<p>" + oneTemplate.description+ "</p>"
					},
					{
						'name': 'jsonData',
						'label': '',
						'type': 'jsoneditor',
						'options': {
							'mode': 'view',
							'availableModes': []
						},
						'height': '500px',
						"value": {}
					}
				]
			});
			formConfig.entries[1].value = oneTemplate.content;
			let options = {
				timeout: $timeout,
				form: formConfig,
				name: 'infraTemplateInfo',
				label: oneTemplate.name,
				actions: [
					{
						'type': 'reset',
						'label': "Close",
						'btn': 'primary',
						'action': function () {
							$scope.modalInstance.dismiss('cancel');
							$scope.form.formData = {};
						}
					}
				]
			};
			buildFormWithModal($scope, $modal, options);
		}
	};

	$scope.deleteTemplate = function(oneTemplate, oneInfra){
		let options = {
			"method": "delete",
			"routeName": "/dashboard/infra/template",
			"params": {
				"id": oneInfra._id,
				"templateId": oneTemplate._id,
				"templateName": oneTemplate.name
			}
		};
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert("danger", error);
			}
			else {
				$scope.displayAlert("success", "Template deleted successfully.");
				$scope.getProviders();
			}
		});
	};
	
	$scope.downloadTemplate = function(oneTemplate, oneInfra){
		let options = {
			"method": "get",
			"routeName": "/dashboard/infra/template/download",
			"params": {
				"id": oneInfra._id,
				"templateId": oneTemplate._id
			},
			"headers": {
				"Accept": "binary/octet-stream"
			},
			"responseType": 'arraybuffer'
		};
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, options, function (error, data) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert("danger", error);
			}
			else {
				openSaveAsDialog('template.zip', data, "binary/octet-stream");
			}
		});
	};
	
	$scope.addTemplate = function(oneInfra){
		if(oneInfra.templates){
			infraSrv.addTemplate($scope, oneInfra);
		}
	};

	$scope.editTemplate = function(oneTemplate, oneInfra){
		if(oneInfra.templates){
			infraSrv.editTemplate($scope, oneInfra, oneTemplate);
		}
	};

	if ($scope.access.list) {
		$scope.getProviders();
	}
	injectFiles.injectCss("modules/dashboard/infra/infra.css");
}]);
