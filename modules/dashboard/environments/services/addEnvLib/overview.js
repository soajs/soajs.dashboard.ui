"use strict";
var dbServices = soajsApp.components;
dbServices.service('overview', ['addEnv', 'ngDataApi', '$timeout', '$cookies', '$localStorage', '$window', function (addEnv, ngDataApi, $timeout, $cookies, $localStorage, $window) {
	
	let overviewFunction = function ($scope, $modal) {
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
			actions: [
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
						/*
						 1- create environment record in db
						 2- if controller.deploy = true
						 2.1- deploy controller
						 2.2- wait for controllers to become available
						 2.3- if recipe already exists --> deploy nginx
						 2.4- if no recipe
						 2.4.1- create recipe
						 2.4.2- deploy nginx using recipe
						 */
						$scope.showProgress = true;
						let parentScope = $scope;
						
						addEnvironment(function () {
							$timeout(function () {
								finalResponse();
							}, 2000);
						});
						
						function addEnvironment(cb) {
							addEnv.prepareCertificates(parentScope, () => {
								console.log(parentScope.wizard);
								addEnv.createEnvironment(parentScope, (error, response) => {
									if (error) {
									
									}
									else {
										//call check status
										checkEnvDeploymentStatus((error) => {
											if(error){
												addEnv.removeEnvironment(parentScope);
											}
											else return cb();
										});
									}
								});
							});
						}
						
						function checkEnvDeploymentStatus(cb){
							addEnv.checkDeploymentStatus(parentScope, cb);
						}
						
						function finalResponse() {
							addEnv.getPermissions(parentScope, () => {
								delete $localStorage.addEnv;
								parentScope.form.formData = {};
								delete parentScope.wizard;
								parentScope.displayAlert('success', "Environment Created");
								$timeout(function(){
									parentScope.$parent.go("#/environments");
								}, 1000);
							});
						}
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
			]
		};
		buildForm($scope, $modal, options, function () {
		});
	};
	
	return overviewFunction;
	
}]);