"use strict";
var dbServices = soajsApp.components;
dbServices.service('overview', ['addEnv', 'productize', 'ngDataApi', '$timeout', '$cookies', '$localStorage', '$window', function (addEnv, productize, ngDataApi, $timeout, $cookies, $localStorage, $window) {
	
	let overviewFunction = function ($scope, $modal) {
		if ($scope.wizard.cluster){
			$scope.wizard.cluster.type= Object.keys($scope.wizard.cluster)[0];
		}
		
		console.log($scope.wizard);
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
						let parentScope = $scope;
						$modal.open({
							templateUrl: "progressAddEnv.tmpl",
							size: 'm',
							backdrop: 'static',
							keyboard: false,
							controller: function ($scope, $modalInstance) {
								$scope.progressCounter = 0;
								$scope.maxCounter = 2;
								if (parentScope.portalDeployment) {
									$scope.maxCounter++;
								}
								if (parentScope.wizard.controller && parentScope.wizard.controller.deploy) {
									$scope.maxCounter++;
									if (parentScope.portalDeployment) {
										$scope.maxCounter += 4;
									}
									
									if (parentScope.wizard.nginx.catalog) {
										$scope.maxCounter++;
									} else {
										$scope.maxCounter += 2;
									}
								}
								
								addEnvironment(function () {
									$timeout(function () {
										finalResponse();
									}, 2000);
								});
								
								let steps = [];
								
								function addEnvironment(cb) {
									addEnv.createEnvironment(parentScope, (error, response) => {
										if (error) {
											rollback(steps, error);
										}
										else {
											parentScope.envId = response.data;
											$scope.progressCounter++;
											$scope.createEnvironment = true;
											steps.push({method: 'removeEnvironment'});
											addEnv.uploadEnvCertificates(parentScope, (error) => {
												if (error) {
													rollback(steps, error);
												}
												else if (parentScope.portalDeployment) {
													$scope.progressCounter++;
													$scope.uploadEnvCertificates = true;
													productize(parentScope, (error) => {
														steps.push({method: 'removeProduct'});
														if (error) {
															rollback(steps, error);
														}
														else {
															$scope.progressCounter++;
															$scope.productize = true;
															handleDeployment(cb);
														}
													});
												}
												else {
													$scope.progressCounter++;
													$scope.uploadEnvCertificates = true;
													handleDeployment(cb);
												}
											});
										}
									});
								}
								
								function handleDeployment(cb) {
									if (parentScope.wizard.controller && parentScope.wizard.controller.deploy) {
										addEnv.deployController(parentScope, (error, controllerId) => {
											if (error) {
												rollback(steps, error);
											}
											else {
												$scope.controllerId = controllerId;
												$scope.progressCounter++;
												$scope.deployController = true;
												steps.push({method: 'removeController', id: $scope.controllerId});
												
												if (parentScope.portalDeployment) {
													addEnv.handleClusters(parentScope, (error) => {
														steps.push({method: 'removeCluster'});
														if (error) {
															rollback(steps, error);
														}
														
														$scope.progressCounter++;
														$scope.deployCluster = true;
														addEnv.deployUrac(parentScope, (error, uracId) => {
															if (error) {
																rollback(steps, error);
															}
															else {
																
																$scope.uracId = uracId;
																$scope.progressCounter++;
																$scope.deployUrac = true;
																steps.push({method: 'removeUrac', id: $scope.uracId});
																
																addEnv.deployOauth(parentScope, (error, oAuthId) => {
																	if (error) {
																		rollback(steps, error);
																	}
																	else {
																		$scope.oAuthId = oAuthId;
																		$scope.progressCounter++;
																		$scope.deployOauth = true;
																		steps.push({
																			method: 'removeOauth',
																			id: $scope.oAuthId
																		});
																		
																		handleNginx(() => {
																			$scope.user = true;
																			//add user and group using new tenant
																			addEnv.addUserAndGroup(parentScope, (error, response) => {
																				if (error) {
																					rollback(steps, error);
																				}
																				else {
																					$scope.progressCounter++;
																					if (typeof(response) === 'string') {
																						$window.alert(response);
																					}
																					return cb();
																				}
																			});
																		});
																	}
																});
															}
														});
													});
												}
												else {
													handleNginx(cb);
												}
											}
										});
									}
									else {
										return cb();
									}
								}
								
								function handleNginx(cb) {
									if (parentScope.wizard.nginx.catalog) {
										addEnv.deployNginx(parentScope, parentScope.wizard.nginx.catalog, (error, nginxId) => {
											if (error) {
												rollback(steps, error);
											}
											else {
												$scope.nginxId = nginxId;
												$scope.progressCounter++;
												$scope.deployNginx = true;
												steps.push({method: 'removeNginx', id: $scope.nginxId});
												return cb();
											}
										});
									}
									else {
										addEnv.createNginxRecipe(parentScope, (error, catalogId) => {
											if (error) {
												rollback(steps, error);
											}
											else {
												$scope.catalogId = catalogId;
												$scope.progressCounter++;
												$scope.createNginxRecipe = true;
												steps.push({method: 'removeCatalog', id: catalogId});
												
												addEnv.deployNginx(parentScope, catalogId, (error, nginxId) => {
													if (error) {
														rollback(steps, error);
													}
													else {
														$scope.nginxId = nginxId;
														$scope.progressCounter++;
														$scope.deployNginx = true;
														steps.push({method: 'removeNginx', id: $scope.nginxId});
														return cb();
													}
												});
											}
										});
									}
								}
								
								function rollback(steps, error) {
									//steps cases
									//['environment']
									//['environment', 'product']
									//['environment', 'controller']
									//['environment', 'product', 'controller']
									//['environment', 'controller', 'catalog']
									//['environment', 'product', 'controller', 'catalog']
									if (steps && typeof Array.isArray(steps)) {
										manualAsyncSeriesInverted(steps.length - 1);
									}
									
									function manualAsyncSeriesInverted(currentIndex) {
										// base case // last function in rollback
										if (currentIndex < 0) {
											$modalInstance.close();
											overlayLoading.hide();
											parentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
											return;
										}
										
										let oneStep = steps[currentIndex];
										
										if (oneStep.id) {
											addEnv[oneStep.method](parentScope, oneStep.id);
										}
										else {
											addEnv[oneStep.method](parentScope);
										}
										
										// i'll wait some time and do the next one
										setTimeout(function () {
											$scope.progressCounter--;
											let newIndex = currentIndex - 1;
											manualAsyncSeriesInverted(newIndex);
										}, 1000);
									}
								}
								
								function finalResponse() {
									addEnv.getPermissions(parentScope, () => {
										$modalInstance.close();
										delete $localStorage.addEnv;
										parentScope.form.formData = {};
										parentScope.remoteCertificates = {};
										delete parentScope.wizard;
										parentScope.displayAlert('success', "Environment Created");
										$timeout(function(){
											parentScope.$parent.go("#/environments");
										}, 1000);
									});
								}
							}
						});
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