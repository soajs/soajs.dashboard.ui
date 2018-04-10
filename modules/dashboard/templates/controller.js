'use strict';
var templatesApp = soajsApp.components;

templatesApp.controller('templatesAppCtrl', ['$scope', '$timeout', 'injectFiles', 'templateSrv', 'detectBrowser', '$modal', '$window', 'ngDataApi', function ($scope, $timeout, injectFiles, templateSrv, detectBrowser, $modal, $window, ngDataApi) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.templatesDocumentationLink = templatesAppConfig.documentationLink;
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, templatesAppConfig.permissions);
	
	$scope.alerts = null;
	
	let myBrowser = detectBrowser();
	$scope.isSafari = myBrowser === 'safari';
	
	$scope.step = 0;
	$scope.importForm = function(){
		$scope.step = 1;
		$scope.myTemplate = null;
		let options = {
			timeout: $timeout,
			entries: templatesAppConfig.form.import.step1,
			name: 'importTemplate',
			actions: [
				{
					type: 'submit',
					label: 'Submit',
					btn: 'primary',
					action: function (formData) {
						if(formData && Object.keys(formData).length > 0){
							templateSrv.uploadTemplate($scope, formData.myTemplate_0, () => {
								if($scope.form && $scope.form.formData){
									$scope.form.formData = {};
								}
								$scope.$parent.displayAlert('success', "Your Template has been imported successfully.");
								$scope.listTemplates();
							});
						}
					}
				},
				{
					type: 'reset',
					label: 'Reset',
					btn: 'danger',
					action: function () {
						if($scope.form && $scope.form.formData){
							$scope.form.formData = {};
						}
						$scope.listTemplates();
					}
				}
			]
		};
		buildForm($scope, null, options, () => {});
	};
	
	$scope.previousStep = function(){
		$scope.exportSectionCounter--;
		if($scope.exportSectionCounter <0){
			$scope.exportSectionCounter = 0;
		}
	};
	
	$scope.nextStep = function(){
		$scope.exportSectionCounter++;
		if($scope.exportSectionCounter >= $scope.exportSections.length -1){
			$scope.exportSectionCounter = $scope.exportSections.length -1;
		}
	};
	
	$scope.goToExportSection = function(index){
		$scope.exportSectionCounter = index;
	};
	
	$scope.AllorNone = function(){
		$scope.exportSections[$scope.exportSectionCounter].all = !$scope.exportSections[$scope.exportSectionCounter].all
		angular.forEach($scope.exportSections[$scope.exportSectionCounter].data, function (item) {
			item.selected = $scope.exportSections[$scope.exportSectionCounter].all;
		});
	};
	
	$scope.generateTemplate = function(){
		templateSrv.generateTemplate($scope);
	};
	
	$scope.storeRecordsOf = function(){
		templateSrv.storeRecordsOf($scope);
	};
	
	$scope.exportForm = function(){
		$scope.step = 3;
		$scope.exportSectionCounter = 0;
		templateSrv.exportTemplate($scope);
	};
	
	$scope.listTemplates = function(){
		$scope.alerts = null;
		$scope.step = 0;
		if($scope.form && $scope.form.formData){
			$scope.form.formData = {};
		}
		templateSrv.listTemplates($scope);
	};
	
	$scope.deleteTmpl = function(oneTemplate){
		templateSrv.deleteTmpl($scope, oneTemplate);
	};
	
	$scope.upgradeTemplates = function(){
		templateSrv.upgradeTemplates($scope);
	};
	
	$scope.showTemplateContent = function(oneTmpl) {
		let parentScope = $scope;
		
		$modal.open({
			templateUrl: "templateInfoBox.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: false,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				$scope.link = (oneTmpl.link) ? oneTmpl.link : null;
				$scope.logo = (oneTmpl.logo) ? oneTmpl.logo : null;
				
				$scope.title = oneTmpl.name;
				$scope.description = oneTmpl.description;
				$scope.content = oneTmpl.content;
				
				if($scope.content.deployments){
					if($scope.content.deployments.repo){
						$scope.content.deployments.repo.max = Object.keys($scope.content.deployments.repo).length;
					}
					
					if($scope.content.deployments.resources){
						$scope.content.deployments.resources.max = Object.keys($scope.content.deployments.resources).length;
					}
				}
				
				$scope.close = function () {
					$modalInstance.close();
				};
				
				$scope.exportTemplateContent = function(){
					parentScope.exportTemplateContent(oneTmpl);
				};
			}
		});
	};
	
	$scope.exportTemplateContent = function(oneTmpl){
		if($scope.isSafari){
			$window.alert("The Downloader of this module is not compatible with Safari. Please use another browser.");
			return false;
		}
		
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			'method': 'post',
			'routeName': '/dashboard/templates/export',
			'data': {
				"id": oneTmpl._id
			},
			"headers": {
				"Accept": "application/zip"
			},
			"responseType": 'arraybuffer',
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				openSaveAsDialog("soajs_template_" + new Date().toISOString() + ".zip", response, "application/zip");
			}
		});
	};
	
	injectFiles.injectCss("modules/dashboard/templates/templates.css");
	
	// Start here
	if ($scope.access.list) {
		$scope.listTemplates();
	}
	
}]);