"use strict";
var infraIACApp = soajsApp.components;
infraIACApp.controller('infraIACCtrl', ['$scope', '$location', '$localStorage', '$window', '$modal', '$timeout', '$cookies', 'injectFiles', 'ngDataApi', 'infraCommonSrv', 'infraIACSrv', function ($scope, $location, $localStorage, $window, $modal, $timeout, $cookies, injectFiles, ngDataApi, infraCommonSrv, infraIACSrv) {
	$scope.$parent.isUserNameLoggedIn();
	$scope.showTemplateForm = false;
	$scope.showSOAJSStoreLink = $scope.$parent.$parent.showSOAJSStoreLink;
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, infraIACConfig.permissions);
	
	infraCommonSrv.getInfraFromCookie($scope);
	
	$scope.go = function (path, method) {
		if (path) {
			$cookies.put("method", method, {});
			$location.path(path);
		}
	};
	
	$scope.$parent.$parent.switchInfra = function (oneInfra) {
		infraCommonSrv.switchInfra($scope, oneInfra, ["groups", "regions"], () => {
			infraIACSrv.rerenderTemplates($scope);
		});
	};
	
	$scope.$parent.$parent.activateProvider = function () {
		infraCommonSrv.activateProvider($scope);
	};
	
	$scope.getProviders = function () {
		if($localStorage.infraProviders){
			$scope.$parent.$parent.infraProviders = angular.copy($localStorage.infraProviders);
			if(!$scope.$parent.$parent.currentSelectedInfra){
				$scope.go("/infra");
			}
			else{
				delete $scope.$parent.$parent.currentSelectedInfra.templates;
				$scope.$parent.$parent.switchInfra($scope.$parent.$parent.currentSelectedInfra);
			}
		}
		else{
			//list infras to build sidebar
			infraCommonSrv.getInfra($scope, {
				id: null,
				exclude: ["groups", "regions", "templates"]
			}, (error, infras) => {
				if (error) {
					$scope.displayAlert("danger", error);
				}
				else {
					$scope.infraProviders = infras;
					$localStorage.infraProviders = angular.copy($scope.infraProviders);
					$scope.$parent.$parent.infraProviders = angular.copy($scope.infraProviders);
					if(!$scope.$parent.$parent.currentSelectedInfra){
						$scope.go("/infra");
					}
					else{
						delete $scope.$parent.$parent.currentSelectedInfra.templates;
						$scope.$parent.$parent.switchInfra($scope.$parent.$parent.currentSelectedInfra);
					}
				}
			});
		}
	};
	
	$scope.previewTemplate = function (oneTemplate) {
		if (oneTemplate.location === 'local') {
			let formConfig = angular.copy({
				'entries': [
					{
						'type': 'html',
						'value': "<p>" + oneTemplate.description + "</p>"
					}
				]
			});
			
			if (!oneTemplate.textMode) {
				formConfig.entries.push({
					'name': 'jsonData',
					'label': '',
					'type': 'jsoneditor',
					'options': {
						'mode': 'view',
						'availableModes': []
					},
					'height': '500px',
					"value": {}
				});
			}
			else {
				formConfig.entries.push({
					'name': 'jsonData',
					'label': '',
					'type': 'textarea',
					'rows': '30'
				})
			}
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
	
	$scope.deleteTemplate = function (oneTemplate, oneInfra) {
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
	
	$scope.downloadTemplate = function (oneTemplate, oneInfra) {
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
	
	$scope.addTemplate = function (oneInfra) {
		if (oneInfra.templates) {
			infraIACSrv.addTemplate($scope, oneInfra);
		}
	};
	
	$scope.editTemplate = function (oneTemplate, oneInfra) {
		if (oneInfra.templates) {
			infraIACSrv.editTemplate($scope, oneInfra, oneTemplate);
		}
	};
	
	if ($scope.access.list) {
		$scope.getProviders();
	}
	injectFiles.injectCss("modules/dashboard/infra/infra.css");
}]);