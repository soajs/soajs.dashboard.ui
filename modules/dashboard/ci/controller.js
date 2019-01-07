'use strict';

var ciApp = soajsApp.components;
ciApp.controller('ciAppCtrl', ['$scope', '$timeout', '$modal', '$cookies', 'ngDataApi', 'injectFiles',"$location", function ($scope, $timeout, $modal, $cookies, ngDataApi, injectFiles, $location) {
	$scope.$parent.isUserLoggedIn();
	$scope.showSOAJSStoreLink = $scope.$parent.$parent.showSOAJSStoreLink;
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, ciAppConfig.permissions);

	$scope.ciData = {};

	$scope.images = {
		travis: "./themes/" + themeToUse + "/img/travis_logo.png",
		drone: "./themes/" + themeToUse + "/img/drone_logo.png",
		jenkins: "./themes/" + themeToUse + "/img/jenkins_logo.png",
		teamcity: "./themes/" + themeToUse + "/img/teamcity_logo.png"
	};

	$scope.unsupported = ['jenkins', 'teamcity'];

	$scope.listAccounts = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			'method': 'get',
			'routeName': '/dashboard/ci'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.accounts = [];
				var processed = [];
				response.forEach(function(oneEntry){
					if(oneEntry.owner && oneEntry.gitProvider && processed.indexOf(oneEntry.owner + oneEntry.gitProvider) === -1){
						var oneAccount = {
							owner: oneEntry.owner,
							hide: true,
							icon: 'plus',
							providers: [],
							gitProvider: oneEntry.gitProvider
						};

						response.forEach(function(oneEntryAgain){
							if(oneEntryAgain.owner === oneAccount.owner && $scope.images[oneEntryAgain.provider]){
								oneEntryAgain.icon = $scope.images[oneEntryAgain.provider];
								oneEntryAgain.locked = ($scope.unsupported.indexOf(oneEntryAgain.provider) !== -1);
								oneAccount.providers.push(oneEntryAgain);
							}
						});

						$scope.accounts.push(oneAccount);
						processed.push(oneEntry.owner + oneEntry.gitProvider);
					}
				});

				$scope.accounts.forEach(function(oneAccount){
					var logos = angular.copy($scope.images);
					oneAccount.providers.forEach(function(oneProvider){
						if(logos[oneProvider.provider]){
							delete logos[oneProvider.provider];
						}
					});
					for(var logo in logos){
						var nEntry = {
							provider: logo,
							icon: logos[logo]
						};
						nEntry.locked = ($scope.unsupported.indexOf(logo) !== -1);

						oneAccount.providers.push(nEntry);
					}
				});

				$scope.accounts[0].hide = false;
				$scope.accounts[0].icon = 'minus';
			}
		});
	};

	$scope.deactivateAccount = function(provider){
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			'method': 'put',
			'routeName': '/dashboard/ci/provider',
			'data':{
				'owner': provider.owner,
				'provider': provider.provider
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', "Provider has been deactivated");
				$scope.listAccounts();
			}
		});
	};

	$scope.activateAccount = function(owner, provider){
		var formConfig;

		switch(provider.provider){
			case 'travis':
				formConfig = angular.copy(ciAppConfig.form.f1.travis);
				formConfig.entries[0].value = 'api.travis-ci.com';
				break;
			case 'drone':
				formConfig = angular.copy(ciAppConfig.form.f1.drone);
				formConfig.entries[0].value = '';
				break;
		}
		let envCounter = 0;
		if (provider.variables && provider.variables.length > 0){
			formConfig.entries.push({
				'type': 'html',
				'value': "<h4>Environment Variables</h4>",
				'name': 'addCustomEnvVariables'
			});
			provider.variables.forEach((oneVariable)=>{
				let oneEnv = angular.copy(ciAppConfig.form.f1.customEnv);
				oneEnv[0].name += envCounter;
				oneEnv[1].name += envCounter;
				oneEnv[1].value = oneVariable.name;
				oneEnv[2].name += envCounter;
				oneEnv[2].value = oneVariable.value;
				oneEnv[2].disabled = true;
				oneEnv[3].name += envCounter;
				formConfig.entries = formConfig.entries.concat(oneEnv);
				envCounter++;
				oneEnv[3].onAction= function (id, value, form){
					var count = parseInt(id.replace('rLabel', ''));
					for (let i = form.entries.length - 1; i >= 0; i--) {
						if (form.entries[i].name === 'labelName' + count
							|| form.entries[i].name === 'labelValue' + count
							|| form.entries[i].name === 'rLabel' + count
							|| form.entries[i].name === 'hr' + count) {
							//remove from formData
							for (var fieldname in form.formData) {
								if (['labelName' + count, 'labelValue' + count].indexOf(fieldname) !== -1) {
									delete form.formData[fieldname];
								}
							}
							//remove from formEntries
							form.entries.splice(i, 1);
						}
					}
					if(form.entries.length === 4){
						form.entries.pop();
					}
				};
			});
		}
		formConfig.entries[2].onAction = function (id, value, formData){
			let customEnv = angular.copy(ciAppConfig.form.f1.customEnv);
			customEnv[0].name += envCounter;
			customEnv[1].name += envCounter;
			customEnv[2].name += envCounter;
			customEnv[3].name += envCounter;
			if(formData.entries.length === 3){
				formData.entries.push({
					'type': 'html',
					'value': "<h4>Environment Variables</h4>",
					'name': 'addCustomEnvVariables'
				});
			}
			formData.entries = formData.entries.concat(customEnv);
			envCounter++;
			customEnv[3].onAction= function (id, value, form){
				var count = parseInt(id.replace('rLabel', ''));
				for (let i = form.entries.length - 1; i >= 0; i--) {
					if (form.entries[i].name === 'labelName' + count
						|| form.entries[i].name === 'labelValue' + count
						|| form.entries[i].name === 'rLabel' + count
						|| form.entries[i].name === 'hr' + count) {
						//remove from formData
						for (var fieldname in form.formData) {
							if (['labelName' + count, 'labelValue' + count].indexOf(fieldname) !== -1) {
								delete form.formData[fieldname];
							}
						}
						//remove from formEntries
						form.entries.splice(i, 1);
					}
				}
				if(formData.entries.length === 4){
					formData.entries.pop();
				}
			};
			
			
		};
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'continuousIntegration',
			label: 'Integrating with ' + provider.provider,
			actions: [
				{
					type: 'submit',
					label: "Submit",
					btn: 'success',
					action: function (formData) {
						var data = {
							"domain": formData.domain,
							"gitToken": formData.gitToken,
							"owner": owner,
							"provider": provider.provider,
							"variables": []
						};
						let count = 0;
						for (var fieldname in formData) {
							if (['labelName' + count].indexOf(fieldname) !== -1) {
								data.variables.push({
									name : formData['labelName' + count],
									value : formData['labelValue' + count]
								});
								count++;
							}
						}
						if(formData.version){
							if(Array.isArray(formData.version)){
								data.version = formData.version[0];
							}
							else{
								data.version = formData.version;
							}
						}

						//test if protocol is supplied
						var regex = /^[^:]+(?=:\/\/)/;
						if (regex.test(formData.domain) && formData.domain.match(regex)[0] !== 'http' && formData.domain.match(regex)[0] !== 'https') {
							$scope.form.displayAlert('danger', "Invalid domain name provided!");
						}
						else {
							overlayLoading.show();
							getSendDataFromServer($scope, ngDataApi, {
								method: 'post',
								routeName: '/dashboard/ci/provider',
								data: data
							}, function (error, response) {
								overlayLoading.hide();
								if (error) {
									$scope.form.displayAlert('danger', error.message);
								}
								else {
									$scope.displayAlert('success', 'Provider has been integrated');
									$scope.form.formData = {};
									if ($scope.modalInstance) {
										$scope.modalInstance.close();
									}
									$scope.listAccounts();
								}
							});
						}
					}
				},
				{
					type: "reset",
					label: "Cancel",
					btn: "danger",
					action: function(){
						$scope.form.formData = {};
						$scope.modalInstance.close();
					}
				}
			]
		};
		buildFormWithModal($scope, $modal, options);
	};
	
	$scope.updateAccount = function(provider){
		var formConfig;
		switch(provider.provider){
			case 'travis':
				formConfig = angular.copy(ciAppConfig.form.f1.travis);
				formConfig.entries[0].value = 'api.travis-ci.org';
				break;
			case 'drone':
				formConfig = angular.copy(ciAppConfig.form.f1.drone);
				formConfig.entries[0].value = '';
				break;
		}
		let envCounter = 0;
		if (provider.variables && provider.variables.length > 0){
			formConfig.entries.push({
				'type': 'html',
				'value': "<h4>Environment Variables</h4>",
				'name': 'addCustomEnvVariables'
			});
			provider.variables.forEach((oneVariable)=>{
				let oneEnv = angular.copy(ciAppConfig.form.f1.customEnv);
				oneEnv[0].name += envCounter;
				oneEnv[1].name += envCounter;
				oneEnv[1].value = oneVariable.name;
				oneEnv[2].name += envCounter;
				oneEnv[2].value = oneVariable.value;
				oneEnv[2].disabled = true;
				oneEnv[3].name += envCounter;
				formConfig.entries = formConfig.entries.concat(oneEnv);
				envCounter++;
				oneEnv[3].onAction= function (id, value, form){
					var count = parseInt(id.replace('rLabel', ''));
					for (let i = form.entries.length - 1; i >= 0; i--) {
						if (form.entries[i].name === 'labelName' + count
							|| form.entries[i].name === 'labelValue' + count
							|| form.entries[i].name === 'rLabel' + count
							|| form.entries[i].name === 'hr' + count) {
							//remove from formData
							for (var fieldname in form.formData) {
								if (['labelName' + count, 'labelValue' + count].indexOf(fieldname) !== -1) {
									delete form.formData[fieldname];
								}
							}
							//remove from formEntries
							form.entries.splice(i, 1);
						}
					}
					if(form.entries.length === 4){
						form.entries.pop();
					}
				};
			});
		}
		formConfig.entries[2].onAction = function (id, value, formData){
			let customEnv = angular.copy(ciAppConfig.form.f1.customEnv);
			customEnv[0].name += envCounter;
			customEnv[1].name += envCounter;
			customEnv[2].name += envCounter;
			customEnv[3].name += envCounter;
			if(formData.entries.length === 3){
				formData.entries.push({
					'type': 'html',
					'value': "<h4>Environment Variables</h4>",
					'name': 'addCustomEnvVariables'
				});
			}
			formData.entries = formData.entries.concat(customEnv);
			envCounter++;
			customEnv[3].onAction= function (id, value, form){
				var count = parseInt(id.replace('rLabel', ''));
				for (let i = form.entries.length - 1; i >= 0; i--) {
					if (form.entries[i].name === 'labelName' + count
						|| form.entries[i].name === 'labelValue' + count
						|| form.entries[i].name === 'rLabel' + count
						|| form.entries[i].name === 'hr' + count) {
						//remove from formData
						for (var fieldname in form.formData) {
							if (['labelName' + count, 'labelValue' + count].indexOf(fieldname) !== -1) {
								delete form.formData[fieldname];
							}
						}
						//remove from formEntries
						form.entries.splice(i, 1);
					}
				}
				if(formData.entries.length === 4){
					formData.entries.pop();
				}
			};
		};
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'continuousIntegration',
			label: 'Updating Integrating with ' + provider.provider,
			data: provider,
			actions: [
				{
					type: 'submit',
					label: "Submit",
					btn: 'success',
					action: function (formData) {
						var data = {
							"id": provider._id,
							"domain": formData.domain,
							"gitToken": formData.gitToken,
							"owner": provider.owner,
							"provider": provider.provider,
							"variables": []
						};
						let count = 0;
						for (var fieldname in formData) {
							if (['labelName' + count].indexOf(fieldname) !== -1) {
								data.variables.push({
									name : formData['labelName' + count],
									value : formData['labelValue' + count]
								});
								count++;
							}
						}
						if(formData.version){
							if(Array.isArray(formData.version)){
								data.version = formData.version[0];
							}
							else{
								data.version = formData.version;
							}
						}

						//test if protocol is supplied
						var regex = /^[^:]+(?=:\/\/)/;
						if (regex.test(formData.domain) && formData.domain.match(regex)[0] !== 'http' && formData.domain.match(regex)[0] !== 'https') {
							$scope.form.displayAlert('danger', "Invalid domain name provided!");
						}
					    else {
							overlayLoading.show();
							getSendDataFromServer($scope, ngDataApi, {
								method: 'post',
								routeName: '/dashboard/ci/provider',
								data: data
							}, function (error, response) {
								overlayLoading.hide();
								if (error) {
									$scope.form.displayAlert('danger', error.message);
								}
								else {
									$scope.displayAlert('success', 'Provider integration has been updated');
									$scope.form.formData = {};
									if ($scope.modalInstance) {
										$scope.modalInstance.close();
									}
									$scope.listAccounts();

								}
							});
						}

					}
				},
				{
					type: "reset",
					label: "Cancel",
					btn: "danger",
					action: function(){
						$scope.form.formData = {};
						$scope.modalInstance.close();
					}
				}
			]
		};
		buildFormWithModal($scope, $modal, options);
	};

	$scope.showHide = function (account) {
		if (!account.hide) {
			jQuery('#a_' + account.owner + " .body .inner").slideUp();
			account.icon = 'plus';
			account.hide = true;
		}
		else {
			jQuery('#a_' + account.owner + " .body .inner").slideDown();
			account.icon = 'minus';
			account.hide = false;
		}
	};

	$scope.listUniqueProviders = function(){
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			'method': 'get',
			'routeName': '/dashboard/ci/providers'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.providers = angular.copy(response);
				//angular doesn't allow referencing Object prototype
				$scope.ObjectKeys = Object.keys;
				delete $scope.providers.soajsauth;
			}
		});
	};

	$scope.addRecipe = function (provider, type) {
		var formConfig = angular.copy(ciAppConfig.form.f2);

		if (type === 'blank') {
			formConfig.entries.splice(0, 1);
		}
		else{
			$scope.providers[provider].forEach(function (oneRecipe) {
				var label = oneRecipe.name;
				formConfig.entries[0].value.push({ l: label, v: oneRecipe });
			});

			formConfig.entries[0].onAction = function (id, data, form) {
				var recipeTemplate = angular.copy(data);
				delete recipeTemplate._id;
				delete recipeTemplate.locked;
				form.formData.name = recipeTemplate.name;
				form.formData.recipe = recipeTemplate.recipe;
			};
		}

		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'addRecipe',
			label: 'Add New Recipe',
			actions: [
				{
					type: 'submit',
					label: 'Submit',
					btn: 'primary',
					action: function (formData) {
						overlayLoading.show();
						getSendDataFromServer($scope, ngDataApi, {
							method: 'post',
							routeName: '/dashboard/ci/recipe',
							data: {
								provider: provider,
								name: formData.name,
								recipe: formData.recipe
							}
						}, function (error, response) {
							overlayLoading.hide();
							if (error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.displayAlert('success', 'Recipe added successfully');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listUniqueProviders();
							}
						});
					}
				},
				{
					type: 'reset',
					label: 'Cancel',
					btn: 'danger',
					action: function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.viewRecipe = function (recipe) {
		var formConfig = angular.copy(ciAppConfig.form.f2);
		formConfig.entries.splice(0,2);
		formConfig.entries[0].value = recipe.recipe;

		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'viewRecipe',
			label: 'Viewing ' + recipe.name,
			actions: [
				{
					type: 'reset',
					label: 'Close',
					btn: 'primary',
					action: function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.updateRecipe = function (recipe) {
		var formConfig = angular.copy(ciAppConfig.form.f2);
		formConfig.entries.splice(0, 1);

		formConfig.entries[0].readonly = true;
		formConfig.entries[0].disabled = true;

		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editRecipe',
			label: 'Edit Recipe',
			data: recipe,
			actions: [
				{
					type: 'submit',
					label: 'Submit',
					btn: 'primary',
					action: function (formData) {
						overlayLoading.show();
						getSendDataFromServer($scope, ngDataApi, {
							method: 'put',
							routeName: '/dashboard/ci/recipe',
							params: {
								id: recipe._id
							},
							data: {
								provider: recipe.provider,
								name: formData.name,
								recipe: formData.recipe
							}
						}, function (error, response) {
							overlayLoading.hide();
							if (error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.displayAlert('success', 'Recipe updated successfully');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listUniqueProviders();
							}
						});
					}
				},
				{
					type: 'reset',
					label: 'Cancel',
					btn: 'danger',
					action: function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.deleteRecipe = function (recipe) {
		var params = {
			id: recipe._id
		};

		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/dashboard/ci/recipe',
			params: params
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', 'Recipe deleted successfully');
				$scope.listUniqueProviders();
			}
		});
	};

	$scope.filterData = function (provider, query) {
		if(!$scope.originalRecipes){
			$scope.originalRecipes = angular.copy($scope.providers[provider]);
		}

		if (query && query !== "") {
			query = query.toLowerCase();
			var filtered = [];
			for (var i = 0; i < $scope.providers[provider].length; i++) {
				if ($scope.providers[provider][i].name.toLowerCase().indexOf(query) !== -1) {
					filtered.push($scope.providers[provider][i]);
				}
			}
			$scope.providers[provider] = filtered;
		} else {
			$scope.providers[provider] = $scope.originalRecipes;
			delete $scope.originalRecipes;
		}
	};

    $scope.go = function (path, method) {
        if (path) {
            $cookies.put("method", method, { 'domain': interfaceDomain });
            $location.path(path);
        }
    };

	injectFiles.injectCss("modules/dashboard/ci/ci.css");

	//start here
	if ($scope.access.get) {
		$scope.listAccounts();
	}

}]);
