'use strict';

var gitAccManagement = soajsApp.components;
gitAccManagement.controller('gitAccManagementCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, ngDataApi, injectFiles, repoSrv) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	
	constructModulePermissions($scope, $scope.access, gitAccManagementConfig.permissions);
	
	$scope.showHide = function (account) {
		if (!account.hide) {
			jQuery('#a_' + account._id + " .body .inner").slideUp();
			account.icon = 'plus';
			account.hide = true;
			// jQuery('#s_' + account._id + " .header").addClass("closed");
		} else {
			jQuery('#a_' + account._id + " .body .inner").slideDown();
			// jQuery('#s_' + account._id + " .header").removeClass("closed");
			account.icon = 'minus';
			account.hide = false;
		}
	};
	
	$scope.listAccounts = function () {
		getSendDataFromServer($scope, ngDataApi, {
			'method': 'get',
			'routeName': '/repositories/git/accounts'
		}, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.accounts = response;
				
				$scope.accounts.forEach(function (oneAccount) {
					oneAccount.hide = true;
					
				});
				
				if ($scope.accounts.length === 1) {
					$scope.accounts[0].hide = false;
					$scope.accounts[0].icon = 'minus';
				}
			}
		});
	};
	
	
	$scope.delete = function (account) {
		if (account.access === 'public' || account.provider !== 'github') {
			getSendDataFromServer($scope, ngDataApi, {
				'method': 'delete',
				'routeName': '/repositories/git/account',
				'params': {
					id: account._id.toString()
				}
			}, function (error) {
				if (error) {
					$scope.displayAlert('danger', error.message);
				} else {
					$scope.displayAlert('success', translation.logoutSuccessful[LANG]);
					$scope.listAccounts();
				}
			});
		} else if (account.access === 'private') {
			var formConfig = angular.copy(gitAccManagementConfig.form.logout);
			var options = {
				timeout: $timeout,
				form: formConfig,
				name: 'removeGithubAccount',
				label: 'Remove GitHub Account',
				actions: [
					{
						'type': 'submit',
						'label': 'Submit',
						'btn': 'primary',
						'action': function (formData) {
							var params = {
								id: account._id.toString(),
								password: formData.password
							};
							getSendDataFromServer($scope, ngDataApi, {
								'method': 'delete',
								'routeName': '/repositories/git/account',
								'params': params
							}, function (error, response) {
								if (error) {
									$scope.$parent.displayAlert('danger', error.message);
									$scope.modalInstance.close();
									if (error.message.indexOf(420) > -1){
										formConfig.entries = formConfig.entries.concat(angular.copy(gitAccManagementConfig.form.twoFactorAuth.entries));
										var options = {
											timeout: $timeout,
											form: formConfig,
											name: 'removeGithubAccount',
											label: 'Two Factor Authentication enabled',
											actions: [
												{
													'type': 'submit',
													'label': 'Submit',
													'btn': 'primary',
													'action': function (formData) {
														params.on2fa = formData.on2fa;
														getSendDataFromServer($scope, ngDataApi, {
															'method': 'delete',
															'routeName': '/repositories/git/account',
															'params': params
														}, function (error, response) {
															if (error) {
																if (error.message.indexOf(420) > -1){
																	var options = {
																		timeout: $timeout,
																		form: formConfig,
																		name: 'removeGithubAccount',
																		label: 'Two Factor Authentication enabled',
																		actions: [
																			{
																				'type': 'submit',
																				'label': 'Submit',
																				'btn': 'primary',
																				'action': function (formData) {
																					params.on2fa = formData.on2fa;
																					getSendDataFromServer($scope, ngDataApi, {
																						'method': 'delete',
																						'routeName': '/repositories/git/account',
																						'params': params
																					}, function (error, response) {
																						if (error) {
																							$scope.$parent.displayAlert('danger', error.message);
																							$scope.modalInstance.close();
																						} else {
																							$scope.$parent.displayAlert('success', response.data);
																							$scope.modalInstance.close();
																							$scope.form.formData = {};
																							$scope.listAccounts();
																						}
																					});
																				}
																			},
																			{
																				'type': 'reset',
																				'label': 'Cancel',
																				'btn': 'danger',
																				'action': function () {
																					$scope.modalInstance.dismiss('cancel');
																					$scope.form.formData = {};
																				}
																			}
																		]
																	};
																	buildFormWithModal($scope, $modal, options);
																}
																else {
																	$scope.$parent.displayAlert('danger', error.message);
																	$scope.modalInstance.close();
																}
															} else {
																$scope.$parent.displayAlert('success', response.data);
																$scope.modalInstance.close();
																$scope.form.formData = {};
																$scope.listAccounts();
															}
														});
													}
												},
												{
													'type': 'reset',
													'label': 'Cancel',
													'btn': 'danger',
													'action': function () {
														$scope.modalInstance.dismiss('cancel');
														$scope.form.formData = {};
													}
												}
											]
										};
										buildFormWithModal($scope, $modal, options);
									}
									
								} else {
									$scope.$parent.displayAlert('success', response.message);
									$scope.modalInstance.close();
									$scope.form.formData = {};
									$scope.listAccounts();
								}
							});
						}
					},
					{
						'type': 'reset',
						'label': 'Cancel',
						'btn': 'danger',
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
	
	
	$scope.addAccount = function () {
		var formConfig = angular.copy(gitAccManagementConfig.form.login);
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'addGitAccount',
			label: translation.addNewGitAccount[LANG],
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							provider: formData.provider,
							domain: formData.providerDomain,
							label: formData.label,
							username: formData.username,
							type: formData.accountType,
							access: formData.type
						};
						
						if (formData.password) {
							postData.password = formData.password;
						}
						
						if (formData.oauthKey && formData.oauthSecret) {
							postData.oauthKey = formData.oauthKey;
							postData.oauthSecret = formData.oauthSecret;
						}
						
						overlayLoading.show();
						getSendDataFromServer($scope, ngDataApi, {
							'method': 'post',
							'routeName': '/repositories/git/account',
							'data': postData
						}, function (error, response) {
							overlayLoading.hide();
							if (error) {
								$scope.$parent.displayAlert('danger', error.message);
								$scope.modalInstance.close();
								if (error.message.indexOf(420) > -1){
									var formConfig = angular.copy(gitAccManagementConfig.form.twoFactorAuth);
									var options = {
										timeout: $timeout,
										form: formConfig,
										name: 'removeGithubAccount',
										label: 'Two Factor Authentication enabled',
										actions: [
											{
												'type': 'submit',
												'label': 'Submit',
												'btn': 'primary',
												'action': function (formData) {
													postData.on2fa = formData.on2fa;
													getSendDataFromServer($scope, ngDataApi, {
														'method': 'post',
														'routeName': '/repositories/git/account',
														'data': postData
													}, function (error, response) {
														if (error) {
															if (error.message.indexOf(420) > -1){
																var formConfig = angular.copy(gitAccManagementConfig.form.twoFactorAuth);
																var options = {
																	timeout: $timeout,
																	form: formConfig,
																	name: 'removeGithubAccount',
																	label: 'Two Factor Authentication enabled',
																	actions: [
																		{
																			'type': 'submit',
																			'label': 'Submit',
																			'btn': 'primary',
																			'action': function (formData) {
																				postData.on2fa = formData.on2fa;
																				getSendDataFromServer($scope, ngDataApi, {
																					'method': 'post',
																					'routeName': '/repositories/git/account',
																					'data': postData
																				}, function (error, response) {
																					if (error) {
																						$scope.$parent.displayAlert('danger', error.message);
																						$scope.modalInstance.close();
																					} else {
																						$scope.$parent.displayAlert('success', response.message);
																						$scope.modalInstance.close();
																						$scope.form.formData = {};
																						$scope.listAccounts();
																					}
																				});
																			}
																		},
																		{
																			'type': 'reset',
																			'label': 'Cancel',
																			'btn': 'danger',
																			'action': function () {
																				$scope.modalInstance.dismiss('cancel');
																				$scope.form.formData = {};
																			}
																		}
																	]
																};
																buildFormWithModal($scope, $modal, options);
															}
															else {
																$scope.$parent.displayAlert('danger', error.message);
																$scope.modalInstance.close();
															}
														} else {
															$scope.$parent.displayAlert('success', response.message);
															$scope.modalInstance.close();
															$scope.form.formData = {};
															$scope.listAccounts();
														}
													});
												}
											},
											{
												'type': 'reset',
												'label': 'Cancel',
												'btn': 'danger',
												'action': function () {
													$scope.modalInstance.dismiss('cancel');
													$scope.form.formData = {};
												}
											}
										]
									};
									buildFormWithModal($scope, $modal, options);
								}
							} else {
								$scope.$parent.displayAlert('success', response.message);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listAccounts();
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal($scope, $modal, options);
	};
	
	$scope.upgrade = function (account) {
		let formConfig;
		if (account.provider === "github") {
			formConfig = angular.copy(gitAccManagementConfig.form.upgrade["github"]);
		} else if (account.provider === "bitbucket") {
			formConfig = angular.copy(gitAccManagementConfig.form.upgrade["bitbucket"]);
		} else {
			formConfig = angular.copy(gitAccManagementConfig.form.upgrade["bitbucket_enterprise"]);
		}
		
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'upgradeAccount',
			label: 'Upgrade Account',
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function (formData) {
						let params = {
							id: account._id.toString(),
						};
						let body = {
							username: account.owner
						};
						if (account.provider === "github") {
							body.password = formData.password;
						} else if (account.provider === "bitbucket") {
							body.password = formData.password;
							body.oauthKey = formData.oauthKey;
							body.oauthSecret = formData.oauthSecret;
						} else {
							body.password = formData.password;
						}
						
						getSendDataFromServer($scope, ngDataApi, {
							'method': 'put',
							'routeName': '/repositories/git/account',
							'params': params,
							'data': body
						}, function (error, response) {
							if (error) {
								$scope.$parent.displayAlert('danger', error.message);
								$scope.modalInstance.close();
							} else {
								$scope.$parent.displayAlert('success', response.message);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listAccounts();
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal($scope, $modal, options);
	};
	
	$scope.sync = function (account) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			'method': 'put',
			'routeName': '/repositories/git/sync/account',
			"params": {
				id: account._id.toString()
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (error) {
					$scope.form.displayAlert('danger', error.message);
				} else {
					$scope.$parent.displayAlert('success', response.message);
					$scope.listAccounts();
				}
			}
		});
	};
	
	injectFiles.injectCss("modules/dashboard/gitManagement/gitManagement.css");
	if ($scope.access.listAccounts) {
		$scope.listAccounts();
	}
}]);
