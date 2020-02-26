"use strict";
var myAccountApp = soajsApp.components;

myAccountApp.controller('changeSecurityCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function ($scope, $timeout, $modal, ngDataApi) {
	$scope.$parent.isUserLoggedIn();
	$scope.$parent.$on('xferData', function (event, args) {
		$scope.memberData = args.memberData;
	});
	$scope.changeEmail = function () {
		var config = changeEmailConfig.formConf;
		var options = {
			form: config,
			'timeout': $timeout,
			'name': 'changeEmail',
			'label': translation.changeEmail[LANG],
			'actions': [
				{
					'type': 'submit',
					'label': translation.changeEmail[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'email': formData.email,
							"id": $scope.memberData._id
						};
						overlayLoading.show();
						getSendDataFromServer($scope, ngDataApi, {
							"method": "put",
							"headers": {
								"key": apiConfiguration.key
							},
							"routeName": "/urac/account/email",
							"data": postData
						}, function (error) {
							overlayLoading.hide();
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'urac', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', translation.successMsgChangeEmail[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
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
	
	$scope.changePassword = function () {
		var config = changePwConfig.formConf;
		var options = {
			form: config,
			'timeout': $timeout,
			'name': 'changePassword',
			'label': translation.changePassword[LANG],
			'actions': [
				{
					'type': 'submit',
					'label': translation.changePassword[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'password': formData.password,
							'oldPassword': formData.oldPassword,
							'confirmation': formData.confirmPassword,
							"id": $scope.memberData._id
						};
						if (formData.password != formData.confirmPassword) {
							$scope.form.displayAlert('danger', translation.errorMessageChangePassword[LANG]);
							return;
						}
						overlayLoading.show();
						getSendDataFromServer($scope, ngDataApi, {
							"method": "put",
							"headers": {
								"key": apiConfiguration.key
							},
							"routeName": "/urac/account/password",
							"data": postData
						}, function (error) {
							overlayLoading.hide();
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'urac', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', translation.successMsgChangePassword[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
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
}]);

myAccountApp.controller('myAccountCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', '$cookies', '$localStorage',
	function ($scope, $timeout, $modal, ngDataApi, $cookies, $localStorage) {
		$scope.$parent.isUserNameLoggedIn();
		
		var userCookie = $localStorage.soajs_user;
		
		var formConfig = {
			'timeout': $timeout,
			'name': 'editProfile',
			'label': translation.editProfile[LANG],
			'entries': [
				{
					'name': 'firstName',
					'label': translation.firstName[LANG],
					'type': 'text',
					'placeholder': translation.enterFirstName[LANG],
					'value': '',
					'tooltip': translation.enterFirstNameUser[LANG],
					'required': true
				},
				{
					'name': 'lastName',
					'label': translation.lastName[LANG],
					'type': 'text',
					'placeholder': translation.enterLastName[LANG],
					'value': '',
					'tooltip': translation.enterLastNameUser[LANG],
					'required': true
				},
				{
					'name': 'email',
					'label': translation.email[LANG],
					'type': 'readonly',
					'placeholder': translation.enterEmail[LANG],
					'value': '',
					'tooltip': translation.emailToolTip[LANG],
					'required': true
				},
				{
					'name': 'username',
					'label': translation.username[LANG],
					'type': 'text',
					'placeholder': translation.enterUsername[LANG],
					'value': '',
					'tooltip': translation.usernamesToolTip[LANG],
					'required': true
				},
				{
					'name': 'profile',
					'label': translation.profile[LANG],
					'type': 'jsoneditor',
					'options': {
						'mode': 'code',
						'availableModes': [{ 'v': 'code', 'l': 'Code View' }, {
							'v': 'tree',
							'l': 'Tree View'
						}, { 'v': 'form', 'l': 'Form View' }]
					},
					'height': '300px',
					"value": {},
					'required': false,
					'tooltip': translation.fillYourAdditionalProfileInformation[LANG]
				}
			],
			'data': {},
			'actions': [
				{
					'type': 'submit',
					'label': translation.editProfile[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var profileObj = (formData.profile) ? formData.profile : {};
						
						var postData = {
							'username': formData.username,
							'firstName': formData.firstName,
							'lastName': formData.lastName,
							'profile': profileObj,
							"id": $scope.uId
						};
						getSendDataFromServer($scope, ngDataApi, {
							"method": "send",
							"routeName": "/urac/account",
							"headers": {
								"key": apiConfiguration.key
							},
							"data": postData
						}, function (error) {
							if (error) {
								$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', translation.profileUpdatedSuccessfully[LANG]);
								userCookie.firstName = formData.firstName;
								userCookie.username = formData.username;
								userCookie.lastName = formData.lastName;
								userCookie.profile = profileObj;
								
								$localStorage.soajs_user = userCookie;
								$scope.$parent.$emit('refreshWelcome', {});
							}
						});
					}
				}
			],
			form: profileConfig.formConf
		};
		
		$scope.getProfile = function (username) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"headers": {
					"key": apiConfiguration.key
				},
				"routeName": "/urac/user",
				"params": { "username": username }
			}, function (error, response) {
				if (error) {
					$scope.$parent.displayAlert("danger", error.code, true, 'urac', error.message);
				}
				else {
					$scope.uId = response._id;
					var p = response.profile;
					formConfig.data = response;
					formConfig.data.profile = p;
					buildForm($scope, null, formConfig);
					
					$scope.$parent.$emit('xferData', { 'memberData': response });
				}
			});
		};
		
		if ((typeof(userCookie) !== "undefined") && (typeof(userCookie) === "object")) {
			var uname = userCookie.username;
			$scope.getProfile(uname);
		}
		else {
			$scope.$parent.displayAlert("danger", translation.youNeedToLoginFirst[LANG]);
			$scope.$parent.go("/");
		}
		
	}]);

myAccountApp.controller('validateCtrl', ['$scope', 'ngDataApi', '$route', 'isUserLoggedIn', function ($scope, ngDataApi, $route, isUserLoggedIn) {
	
	$scope.validateChangeEmail = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/urac/validate/changeEmail",
			"params": { "token": $route.current.params.token }
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', translation.yourEmailValidatedChangedSuccessfully[LANG]);
				setTimeout(function () {
					$scope.$parent.go("/myaccount");
				}, 2000);
			}
		});
	};
	
	$scope.validateChangeEmail();
}]);

myAccountApp.controller('loginCtrl', ['$scope', 'ngDataApi', '$cookies', 'isUserLoggedIn', '$localStorage', 'myAccountAccess', 'injectFiles',
	function ($scope, ngDataApi, $cookies, isUserLoggedIn, $localStorage, myAccountAccess, injectFiles) {
		var formConfig = loginConfig.formConf;
		/*
		formConfig.entries[3].entries.forEach((oneEntry)=>{
			oneEntry.onAction =  function (id) {
				$scope.thirdPartyLogin(id);
			};
		});
		*/
		formConfig.actions = [{
			'type': 'submit',
			'label': translation.login[LANG],
			'btn': 'primary',
			'action': function (formData) {
				var postData = {
					'username': formData.username,
					'password': formData.password,
					'grant_type': "password"
				};
				overlayLoading.show();
				var authValue;
				
				function loginOauth() {
					var options1 = {
						"token": false,
						"method": "get",
						"routeName": "/oauth/authorization"
					};
					getSendDataFromServer($scope, ngDataApi, options1, function (error, response) {
						if (error) {
							overlayLoading.hide();
							$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
						}
						else {
							authValue = response.data;
							
							var options2 = {
								"method": "post",
								"routeName": "/oauth/token",
								"data": postData,
								"headers": {
									'accept': '*/*',
									"Authorization": authValue
								}
							};
							getSendDataFromServer($scope, ngDataApi, options2, function (error, response) {
								if (error) {
									overlayLoading.hide();
									$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
								}
								else {
									if (Object.hasOwnProperty.call(response, "access_token")) {
										$cookies.put('access_token', response.access_token, { 'domain': interfaceDomain });
										$cookies.put('refresh_token', response.refresh_token, { 'domain': interfaceDomain });
									}
									uracLogin();
								}
							});
							
						}
					});
				}
				
				loginOauth();
				var myUser;
				
				function uracLogin() {
					var options = {
						"method": "get",
						"routeName": "/urac/user",
						"params": {
							'username': formData.username
						}
					};
					getSendDataFromServer($scope, ngDataApi, options, function (error, response) {
						if (error) {
							overlayLoading.hide();
							ngDataApi.logoutUser($scope);
							$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
						}
						else {
							myUser = response;
							//get dashboard keys
							getKeys();
						}
					});
				}
				
				function getKeys() {
					$localStorage.acl_access = null;
					$localStorage.environments = null;
					$localStorage.soajs_user = myUser;
					$cookies.put("soajs_username", myUser.username, { 'domain': interfaceDomain });
					
					myAccountAccess.getKeyPermissions($scope, function (result) {
						if (result) {
							$scope.$parent.$emit("loadUserInterface", {});
							$scope.$parent.$emit('refreshWelcome', {});
						} else {
							ngDataApi.logoutUser($scope);
						}
					});
				}
			}
		}];
		
		$scope.thirdPartyLogin = function (passport){
			overlayLoading.show();
			window.location.href = apiConfiguration.domain + "/oauth/passport/login/" + passport + "?key=" + apiConfiguration.key;
		};
		if (!isUserLoggedIn($scope)) {
			buildForm($scope, null, formConfig);
		}
		else {
			var gotoUrl = '/dashboard';
			if ($scope.$parent.mainMenu.links && $scope.$parent.mainMenu.links[0]) {
				gotoUrl = $scope.$parent.mainMenu.links[0].entries[0].url.replace("#", "");
			}
			$scope.$parent.go(gotoUrl);
		}
		//injectFiles.injectCss("modules/dashboard/myAccount/myAccount.css");
	}]);

myAccountApp.controller('forgotPwCtrl', ['$scope', 'ngDataApi', 'isUserLoggedIn', function ($scope, ngDataApi, isUserLoggedIn) {
	var formConfig = forgetPwConfig.formConf;
	formConfig.actions = [{
		'type': 'submit',
		'label': translation.submit[LANG],
		'btn': 'primary',
		'action': function (formData) {
			var postData = {
				'username': formData.username
			};
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/urac/password/forgot",
				"params": postData
			}, function (error) {
				overlayLoading.hide();
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
				}
				else {
					$scope.$parent.displayAlert('success', translation.resetLinkSentYourEmailAddress[LANG]);
					redirectToLogin($scope.$parent);
				}
			});
		}
	}];
	
	if (!isUserLoggedIn($scope)) {
		buildForm($scope, null, formConfig);
	}
	else {
		$scope.$parent.displayAlert('danger', translation.youAlreadyLoggedInLogOutFirst[LANG]);
		$scope.$parent.go($scope.$parent.mainMenu.links[0].url.replace("#", ""));
	}
}]);

myAccountApp.controller('setPasswordCtrl', ['$scope', 'ngDataApi', '$routeParams', 'isUserLoggedIn', function ($scope, ngDataApi, $routeParams, isUserLoggedIn) {
	var formConfig = setPasswordConfig.formConf;
	formConfig.actions = [{
		'type': 'submit',
		'label': translation.submit[LANG],
		'btn': 'primary',
		'action': function (formData) {
			var postData = {
				'password': formData.password,
				'confirmation': formData.confirmPassword,
				"token": $routeParams.token
			};
			if (formData.password != formData.confirmPassword) {
				$scope.$parent.displayAlert('danger', translation.errorMessageChangePassword[LANG]);
				return;
			}
			getSendDataFromServer($scope, ngDataApi, {
				"method": "put",
				"headers": {
					"key": apiConfiguration.key
				},
				"routeName": "/urac/password/reset",
				"data": postData
			}, function (error) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
				}
				else {
					$scope.$parent.displayAlert('success', translation.passwordSetSuccessfully[LANG]);
					redirectToLogin($scope.$parent);
				}
			});
		}
	}];
	
	if (!isUserLoggedIn($scope)) {
		buildForm($scope, null, formConfig);
	}
	else {
		$scope.$parent.displayAlert('danger', translation.youAlreadyLoggedInLogOutFirst[LANG]);
		var url = $scope.$parent.mainMenu.links[0].entries[0].url;
		$scope.$parent.go(url.replace("#", ""));
	}
}]);

myAccountApp.controller('resetPwCtrl', ['$scope', 'ngDataApi', '$routeParams', 'isUserLoggedIn', function ($scope, ngDataApi, $routeParams, isUserLoggedIn) {
	var formConfig = resetPwConfig.formConf;
	formConfig.actions = [{
		'type': 'submit',
		'label': translation.submit[LANG],
		'btn': 'primary',
		'action': function (formData) {
			var postData = {
				'password': formData.password,
				'confirmation': formData.confirmPassword,
				"token": $routeParams.token
			};
			if (formData.password != formData.confirmPassword) {
				$scope.$parent.displayAlert('danger', translation.passwordConfirmFieldsNotMatch[LANG]);
				return;
			}
			getSendDataFromServer($scope, ngDataApi, {
				"method": "put",
				"routeName": "/urac/password/reset",
				"data": postData
			}, function (error) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
				}
				else {
					$scope.$parent.displayAlert('success', translation.yourPasswordReset[LANG]);
					redirectToLogin($scope.$parent);
				}
			});
		}
	}];
	
	if (!isUserLoggedIn($scope)) {
		buildForm($scope, null, formConfig);
	}
	else {
		$scope.$parent.displayAlert('danger', translation.youAlreadyLoggedInLogOutFirst[LANG]);
		$scope.$parent.go($scope.$parent.mainMenu.links[0].entries[0].url.replace("#", ""));
	}
}]);