"use strict";
var dbServices = soajsApp.components;
dbServices.service('overview', ['addEnv', 'ngDataApi', '$timeout', '$cookies', '$localStorage', '$window', function (addEnv, ngDataApi, $timeout, $cookies, $localStorage, $window) {
	
	let getFormActions = function($scope, type){
		let actions = [
			{
				'type': 'button',
				'label': "Back",
				'btn': 'success',
				'action': function () {
					$scope.form.formData = {};
					//got back to last step !
					let stepNumber = "Step" + $scope.lastStep;
					$scope[stepNumber]();
				}
			},
			{
				'type': 'submit',
				'label': "Create Environment",
				'btn': 'primary',
				'action': function (formData) {
					$scope.showProgress = true;
					addEnvironment($scope);
				}
			},
			{
				'type': 'reset',
				'label': translation.cancel[LANG],
				'btn': 'danger',
				'action': function () {
					delete $localStorage.addEnv;
					$scope.form.formData = {};
					$scope.remoteCertificates = {};
					delete $scope.wizard;
					$scope.$parent.go("/environments")
				}
			}
		];
		
		if(type === 2){
			actions = [
				{
					'type': 'submit',
					'label': "Finalize & Proceed",
					'btn': 'primary',
					'action': function (formData) {
						$scope.showProgress = true;
						$scope.status = {};
						finalResponse($scope);
					}
				}
			];
		}
		
		if(type === 3){
			actions = [
				{
					'type': 'submit',
					'label': "Keep What was created & Finalize",
					'btn': 'primary',
					'action': function (formData) {
						$scope.showProgress = true;
						$scope.status = {};
						finalResponse($scope);
					}
				},
				{
					'type': 'submit',
					'label': "Remove Everything",
					'btn': 'danger',
					'action': function (formData) {
						$scope.statusType = "";
						$scope.statusMsg = "";
							overlayLoading.show();
							addEnv.checkDeploymentStatus($scope, {rollback: true}, (error, response) => {
							if (error) {
								$scope.displayAlert("danger", error.message);
							}
							else {
								addEnv.removeEnvironment($scope, (error) =>{
									if (error) {
										$scope.displayAlert("danger", error.message);
									}
									else{
										overlayLoading.hide();
										$scope.status = {};
										$scope.displayAlert("success", "Environment Deployment has been reverted.");
										overviewFunction($scope);
									}
								});
							}
						});
					}
				}
			];
		}
		
		return actions;
	};
	
	let overviewFunction = function ($scope) {
		if ($scope.wizard.cluster){
			$scope.wizard.cluster.type= Object.keys($scope.wizard.cluster)[0];
		}
		
		$scope.showProgress = false;
		
		var configuration = angular.copy(environmentsConfig.form.add.overview.entries);
		var options = {
			timeout: $timeout,
			entries: configuration,
			name: 'addEnvironment',
			label: translation.addNewEnvironment[LANG],
			actions: getFormActions($scope)
		};
		
		buildForm($scope, null, options, function () {
		});
	};
	
	let overviewResume = function ($scope) {
		if ($scope.wizard.cluster){
			$scope.wizard.cluster.type= Object.keys($scope.wizard.cluster)[0];
		}
		
		if($scope.wizard.nginx){
			$scope.lastStep = 4;
		}
		else {
			$scope.lastStep = 2;
		}
		
		$scope.showProgress = false;
		var configuration = angular.copy(environmentsConfig.form.add.overview.entries);
		var options = {
			timeout: $timeout,
			entries: configuration,
			name: 'addEnvironment',
			label: translation.addNewEnvironment[LANG],
			actions: []
		};

		buildForm($scope, null, options, function () {
			$scope.statusType = "info";
			$scope.statusMsg = "Deploying your environment might take a few minutes to finish, please be patient, progress logs will display soon.";
			//call check status
			checkEnvDeploymentStatus($scope, (error) => {
				if(error){
					addEnv.removeEnvironment($scope, () => {
						$scope.displayAlert('danger', error);
						$scope.form.actions = getFormActions($scope);
						overviewFunction($scope);
					});
				}
			});
		});
	};
	
	function addEnvironment($scope) {
		$scope.statusType = "info";
		$scope.statusMsg = "Deploying your environment might take a few minutes to finish, please be patient, progress logs will display soon.";
		$scope.showProgress = false;
		$scope.form.actions = [];
		addEnv.prepareCertificates($scope, () => {
			addEnv.createEnvironment($scope, (error) => {
				if (error) {
					$scope.form.actions = getFormActions($scope);
					$scope.displayAlert('danger', error.message);
				}
				else {
					//call check status
					checkEnvDeploymentStatus($scope, (error) => {
						if(error){
							addEnv.removeEnvironment($scope, () => {
								$scope.displayAlert('danger', error);
								$scope.form.actions = getFormActions($scope);
								overviewFunction($scope);
							});
						}
					});
				}
			});
		});
	}
	
	let finalResponse = function ($scope) {
		addEnv.getPermissions($scope, () => {
			delete $localStorage.addEnv;
			$scope.form.formData = {};
			delete $scope.wizard;
			$scope.displayAlert('success', "Environment Created");
			$timeout(function(){
				$scope.$parent.go("#/environments");
			}, 1000);
		});
	};
	
	let checkEnvDeploymentStatus = function ($scope, cb){
		$scope.showProgress = true;
		
		var autoRefreshTimeoutProgress = $timeout(() => {
			addEnv.checkDeploymentStatus($scope, null, (error, response) =>{
				if(error){
					$scope.showProgress = false;
					return cb(error);
				}
				else {
					$scope.status = {};
					$scope.progressCounter = 0;
					$scope.overall = response.overall;
					delete response.soajsauth;
					delete response.overall;
					$scope.maxCounter = Object.keys(response).length;
					
					for(let step in response){
						if(response[step]){
							$scope.status[step] = {};
						}
						
						if(response[step].done && response[step].id){
							$scope.progressCounter++;
							$scope.status[step].done = true;
						}
					}
					
					if(response.error){
						$scope.progressCounter = 0;
						$scope.statusType = "danger";
						$scope.statusMsg = response.error;
						$scope.form.actions = getFormActions($scope, 3);
					}
					else{
						if($scope.overall) {
							$scope.progressCounter = $scope.maxCounter;
							
							for(let section in response){
								if(response[section].exception){
									$scope.statusType = "warning";
									$scope.statusMsg = response[section].exception.code + ":" + response[section].exception.msg;
									$scope.status[section].exception = $scope.statusMsg;
								}
							}
							$scope.form.actions = getFormActions($scope, 2);
						}
						else{
							checkEnvDeploymentStatus($scope, cb);
						}
					}
				}
			});
		}, 5000);
		
		$scope.$on("$destroy", function () {
			$timeout.cancel(autoRefreshTimeoutProgress);
		});
	};
	
	return {
		'run': overviewFunction,
		'check': overviewResume
	};
	
}]);