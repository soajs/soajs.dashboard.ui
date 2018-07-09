"use strict";
var infraIACApp = soajsApp.components;
infraIACApp.controller('infraIACCtrl', ['$scope', '$window', '$modal', '$timeout', '$cookies', 'injectFiles', 'ngDataApi', 'infraIACSrv', function ($scope, $window, $modal, $timeout, $cookies, injectFiles, ngDataApi, infraIACSrv) {
	$scope.$parent.isUserNameLoggedIn();
	$scope.showTemplateForm = false;

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, infraIACConfig.permissions);
	
	if($cookies.getObject('myInfra', { 'domain': interfaceDomain })){
		$scope.$parent.$parent.currentSelectedInfra = $cookies.getObject('myInfra', { 'domain': interfaceDomain });
	}
	
	$scope.$parent.$parent.switchInfra = function(oneInfra){
		$scope.$parent.$parent.currentSelectedInfra = oneInfra;
	};
	
	function getMyProvider(){
		overlayLoading.show();
		//get one infra for module
		infraIACSrv.getMyInfra($scope, (error, infra) => {
			overlayLoading.hide();
			if(error){
				$scope.displayAlert("danger", error);
			}
			else{
				if(!$scope.$parent.$parent.currentSelectedInfra){
					$scope.go("/infra");
				}
				else{
					$scope.$parent.$parent.switchInfra(infra);
				}
			}
		});
	}
	
	$scope.getProviders = function () {
		//list infras to build sidebar
		infraIACSrv.getInfra($scope, (error, infras) => {
			
			if (error) {
				$scope.displayAlert("danger", error);
			}
			else {
				$scope.infraProviders = infras;
				$scope.$parent.$parent.infraProviders = angular.copy($scope.infraProviders);
				
				getMyProvider();
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
					}
				]
			});
			
			if(!oneTemplate.textMode){
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
			else{
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
			infraIACSrv.addTemplate($scope, oneInfra);
		}
	};

	$scope.editTemplate = function(oneTemplate, oneInfra){
		if(oneInfra.templates){
			infraIACSrv.editTemplate($scope, oneInfra, oneTemplate);
		}
	};

	if ($scope.access.list) {
		$scope.getProviders();
	}
	injectFiles.injectCss("modules/dashboard/infra/infra.css");
}]);
