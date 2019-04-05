"use strict";
var servicesApp = soajsApp.components;
servicesApp.controller('addEditPassThrough', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', 'swaggerParser', 'swaggerClient', '$cookies', 'Upload', '$routeParams', '$localStorage', '$window', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, swaggerParser, swaggerClient, $cookies, Upload, $routeParams, $localStorage, $window) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.mainEndpoint = {};
	$scope.versions = {};
	$scope.schemaCode = '';
	$scope.schemaCodeF = '';
	$scope.swaggerCode = false;
	$scope.swaggerTypes =
		[
			{'v': 'text', 'l': 'Text'},
			// {'v': 'url', 'l': 'Url'},
			{'v': 'git', 'l': 'Git'}
		];
	
	$scope.replaceDot = function (v) {
		return v.replace(/\./g, 'x');
	};
	$scope.showHideFav = function (v, version) {
		if (!version.hide) {
			jQuery('#endpoint_' + $scope.replaceDot(v) + " .body").slideUp();
			version.icon = 'plus';
			version.hide = true;
			jQuery('#endpoint_' + $scope.replaceDot(v) + " .endpointHeader").addClass("closed");
		} else {
			jQuery('#endpoint_' + $scope.replaceDot(v) + " .body").slideDown();
			jQuery('#endpoint_' + $scope.replaceDot(v) + " .endpointHeader").removeClass("closed");
			version.icon = 'minus';
			version.hide = false;
		}
	};
	
	$scope.getEndpoint = function (_id) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/apiBuilder/get",
			"params": {
				"id": _id,
				"mainType": "passThroughs"
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.message, true, 'dashboard');
			} else {
				if (!$scope.form) {
					$scope.form = {};
				}
				let data = angular.copy(response);
				if (data.maintenance) {
					data.port = data.maintenance.port ? data.maintenance.port.value : null;
					data.path = data.maintenance.readiness;
				}
				if (!data.versions) {
					data.versions = {};
				}
				if (data.src) {
					if (data.src.urls) {
						data.src.urls.forEach((oneUrl) => {
							if (data.versions[oneUrl.version]) {
								data.versions[oneUrl.version].url = oneUrl.url;
							}
						});
					}
					if (data.src.url) {
						data.simulateUrl = data.src.url;
					}
					if (data.src.swagger) {
						data.src.swagger.forEach((oneSwagger) => {
							if (data.versions[oneSwagger.version]) {
								data.versions[oneSwagger.version].swagger = {
									swaggerInputType: oneSwagger.content.type,
									swaggerInput: oneSwagger.content.content,
									git: oneSwagger.content.git
								};
							}
						});
					}
				}
				delete data.src;
				if (!$localStorage.addPassThrough) {
					$localStorage.addPassThrough = {};
				}
				$localStorage.addPassThrough.step1 = angular.copy(data);
			}
		});
	};
	
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, apiBuilderConfig.permissions);
	
	$scope.listAccounts = function (cb) {
		getSendDataFromServer($scope, ngDataApi, {
			'method': 'get',
			'routeName': '/dashboard/gitAccounts/accounts/list'
		}, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				for (let i = 0; i < response.length; i++) {
					if (response[i].owner === 'soajs') {
						response.splice(i, 1);
						break;
					}
				}
				$scope.gitAccounts = response;
			}
			if (cb) {
				return cb();
			}
		});
	};
	
	$scope.selectSwagger = function (type) {
		if (type === 'text'){
			$scope.editor.setOptions({
				readOnly: false,
				highlightActiveLine: true,
				highlightGutterLine: true
			});
		}
		if (type === 'git') {
			let currentScope = $scope;
			var modal = $modal.open({
				templateUrl: "modules/dashboard/endpoints/directives/addPassThroughGit.tmpl",
				size: 'lg',
				backdrop: true,
				keyboard: true,
				controller: function ($scope) {
					fixBackDrop();
					$scope.title = 'Select Git Repository';
					$scope.gitAccounts = currentScope.gitAccounts;
					$scope.selectedAccount = null;
					$scope.selectGitAccount = function (gitAccount) {
						$scope.gitAccounts.forEach((git) => {
							if (git._id === gitAccount) {
								$scope.selectedAccount = git;
							}
						});
						overlayLoading.show();
						if ($scope.selectedAccount) {
							let counter = 0;
							$scope.selectedAccount.loading = false;
							$scope.listRepos($scope.selectedAccount, counter, 'getRepos');
						}
					};
					$scope.defaultPerPage = 20;
					$scope.defaultPageNumber = 1;
					$scope.listRepos = function (account, counter, action) {
						var id = account._id;
						if (!account.nextPageNumber) {
							account.nextPageNumber = $scope.defaultPageNumber;
						}
						getSendDataFromServer($scope, ngDataApi, {
							"method": "get",
							"routeName": "/dashboard/gitAccounts/getRepos",
							"params": {
								id: id,
								provider: account.provider,
								per_page: $scope.defaultPerPage,
								page: (action === 'loadMore') ? account.nextPageNumber : $scope.defaultPageNumber
							}
						}, function (error, response) {
							overlayLoading.hide();
							$scope.selectedAccount.loading = true;
							if (error) {
								$scope.displayAlert('danger', error.message);
							} else {
								if (action === 'loadMore') {
									$scope.appendNewRepos(account, response);
								} else if (action === 'getRepos') {
									
									$scope.repos = response;
									
									account.nextPageNumber = 2;
									account.allowLoadMore = (response.length === $scope.defaultPerPage);
								}
							}
						});
					};
					if (currentScope.git){
						$scope.filepath = currentScope.git.filepath;
						$scope.gitAcc = angular.copy(currentScope.git.gitId);
						overlayLoading.show();
						$scope.gitAccounts.forEach((git) => {
							if (git._id === currentScope.git.gitId) {
								$scope.selectedAccount = git;
							}
						});
						if ($scope.selectedAccount) {
							let counter = 0;
							$scope.selectedAccount.loading = false;
							$scope.listRepos($scope.selectedAccount, counter, 'getRepos');
						}
					}
					
					$scope.appendNewRepos = function (account, repos) {
						account.nextPageNumber++;
						account.allowLoadMore = (repos.length === $scope.defaultPerPage);
						
						if (!$scope.repos) {
							$scope.repos = [];
						}
						
						$scope.repos = $scope.repos.concat(repos);
						setTimeout(function () {
							jQuery('#reposList').animate({scrollTop: jQuery('#reposList').prop("scrollHeight")}, 1500);
						}, 500);
					};
					
					$scope.selectRepoBranch = function (repo) {
						getSendDataFromServer($scope, ngDataApi, {
							method: 'get',
							routeName: '/dashboard/gitAccounts/getBranches',
							params: {
								name: repo.full_name,
								type: 'repo',
								id: $scope.selectedAccount._id.toString(),
								provider: $scope.selectedAccount.provider
							}
						}, function (error, result) {
							overlayLoading.hide();
							if (error) {
								$scope.displayAlert('danger', error.message);
							}
							$scope.selectedRepo = repo;
							$scope.repoBranch = result.branches;
						});
					};
					$scope.selectBranch = function (branch) {
						if (branch) {
							$scope.selectedBranch = branch.name;
						}
					};
					$scope.onSubmit = function () {
						getSendDataFromServer($scope, ngDataApi, {
							method: 'get',
							routeName: '/dashboard/gitAccounts/getAnyFile',
							params: {
								accountId: $scope.selectedAccount._id,
								repo: $scope.selectedRepo.name,
								filepath: $scope.filepath,
								branch: $scope.selectedBranch
							}
						}, function (error, result) {
							overlayLoading.hide();
							if (error) {
								currentScope.displayAlert('danger', error.message);
							}
							if (result && result.content) {
								currentScope.editor.setValue(result.content);
								currentScope.editor.setOptions({
									readOnly: true,
									highlightActiveLine: false,
									highlightGutterLine: false
								});
								currentScope.git = {
									gitId: $scope.selectedAccount._id,
									repo: $scope.selectedRepo.name,
									branch: $scope.selectedBranch,
									filepath: $scope.filepath,
								};
								currentScope.schemaCode = result.content;
								currentScope.schemaCodeF = result.content;
								currentScope.swaggerUrl = result.downloadLink;
							}
							$scope.closeModal();
						});
					};
					
					$scope.closeModal = function () {
						modal.close();
					};
				}
			});
		}
	};
	
	$scope.Step1 = function () {
		overlayLoading.show();
		
		let entries = {
			serviceName: {
				required: true
			},
			serviceGroup: {
				required: true
			},
			servicePort: {
				required: true
			},
			requestTimeout: {
				required: true
			},
			requestTimeoutRenewal: {
				required: true
			}
		};
		
		let environmentsConfigStep1Entries = [
			{
				"name": "generalInfo",
				"directive": "modules/dashboard/endpoints/directives/add-passThrough.tmpl"
			}
		];
		var configuration = angular.copy(environmentsConfigStep1Entries);
		$scope.tempFormEntries = entries;
		var options = {
			timeout: $timeout,
			entries: configuration,
			name: 'addEditEp',
			label: "Add/Edit Pass Through",
			actions: [
				{
					'type': 'submit',
					'label': "Save",
					'btn': 'primary',
					'action': function (formData) {
						
						//check mandatory fields
						for (let fieldName in $scope.tempFormEntries) {
							if ($scope.tempFormEntries[fieldName].required) {
								if (!formData[fieldName]) {
									$window.alert('Some of the fields under controller section are still missing.');
									return false;
								}
							}
						}
						
						if (!$localStorage.addPassThrough) {
							$localStorage.addPassThrough = {};
						}
						
						$localStorage.addPassThrough.step1 = angular.copy(formData);
						$scope.mainEndpoint = $scope.form.formData;
						for (let v in $scope.mainEndpoint.versions) {
							delete $scope.mainEndpoint.versions[v].hide;
							delete $scope.mainEndpoint.versions[v].icon;
						}
						$scope.saveEndpoint();
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						// todo
						delete $localStorage.addPassThrough;
						$scope.form.formData = {};
						$scope.$parent.go("/endpoints/2");
					}
				}
			]
		};
		buildForm($scope, $modal, options, function () {
			if ($localStorage.addPassThrough && $localStorage.addPassThrough.step1) {
				$scope.form.formData = angular.copy($localStorage.addPassThrough.step1);
			}
			$scope.form.closeModal = function () {
				delete $localStorage.addPassThrough;
				$scope.form.formData = {};
				$scope.$parent.go("/endpoints/2");
			};
			overlayLoading.hide();
		});
	};
	
	$scope.syncGitSwagger = function(){
		if ($scope.git){
			getSendDataFromServer($scope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/gitAccounts/getAnyFile',
				params: {
					accountId: $scope.git.gitId,
					repo: $scope.git.repo,
					filepath: $scope.git.filepath,
					branch: $scope.git.branch
				}
			}, function (error, result) {
				overlayLoading.hide();
				if (error) {
					$scope.displayAlert('danger', error.message);
				}
				if (result && result.content) {
					$scope.editor.setValue(result.content);
					$scope.editor.setOptions({
						readOnly: true,
						highlightActiveLine: false,
						highlightGutterLine: false
					});
					
					$scope.schemaCode = result.content;
					$scope.schemaCodeF = result.content;
					$scope.swaggerUrl = result.downloadLink;
				}
			});
		}
	};
	
	$scope.editGitSwagger = function(){
		$scope.selectSwagger('git');
	};
	
	$scope.addMoreVersions = function () {
		var formConfig = angular.copy(apiBuilderConfig.form.addVersion);
		$scope.versionScope = $scope.$new(true);
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'addVersion',
			label: translation.addVersion[LANG],
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function (formData) {
						if (!$scope.form.formData.versions) {
							$scope.form.formData.versions = {};
						}
						if ($scope.form.formData.versions[formData.version] || (parseFloat(formData.version) && $scope.form.formData.versions[parseFloat(formData.version)])) {
							$scope.versionScope.form.displayAlert('danger', 'Version already exist!');
						} else {
							$scope.form.formData.versions[formData.version] = {};
							$scope.versionScope.modalInstance.close();
							$scope.versionScope.form.formData = {};
						}
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function () {
						$scope.versionScope.modalInstance.dismiss('cancel');
						$scope.versionScope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal($scope.versionScope, $modal, options);
	};
	
	$scope.deleteVersion = function (v) {
		delete $scope.form.formData.versions[v];
	};
	
	$scope.editVersion = function (v) {
		var formConfig = angular.copy(apiBuilderConfig.form.addVersion);
		$scope.versionScope = $scope.$new(true);
		formConfig.entries[0].value = v;
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editVersion',
			label: translation.editVersion[LANG],
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function (formData) {
						if ($scope.form.formData.versions[formData.version] && formData.version !== v) {
							$scope.versionScope.form.displayAlert('danger', 'Version already exist!');
						} else {
							if (formData.version !== v) {
								$scope.form.formData.versions[formData.version] = angular.copy($scope.form.formData.versions[v]);
								delete $scope.form.formData.versions[v];
							}
							$scope.versionScope.modalInstance.close();
							$scope.versionScope.form.formData = {};
						}
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function () {
						$scope.versionScope.modalInstance.dismiss('cancel');
						$scope.versionScope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal($scope.versionScope, $modal, options);
	};
	
	$scope.aceLoaded = function (_editor) {
		$scope.editor = _editor;
		_editor.setShowPrintMargin(false);
	};
	
	$scope.updateScopeValue = function () {
		$scope.schemaCode = $scope.editor.getValue();
	};
	$scope.fillDefaultEditor = function () {
		if (!$scope.schemaCodeF || $scope.schemaCodeF === "") {
			if ($scope.form.formData.serviceName && $scope.form.formData.serviceName.trim() !== '') {
				var serviceName = $scope.form.formData.serviceName.trim();
				var swaggerYML = "swagger: \"2.0\"\n" +
					"info:\n" +
					"  version: \"1.0.0\"\n" +
					"  title: " + serviceName + "\n" +
					"host: localhost\n" +
					"basePath: /" + serviceName + "\n" +
					"schemes:\n" +
					"  - http\n" +
					"paths:\n\n" +
					"parameters:\n\n" +
					"definitions:\n\n";
			}
			$scope.schemaCodeF = swaggerYML;
			$timeout(function () {
				if (!$scope.schemaCodeF) {
					$scope.schemaCodeF = '';
				}
				$scope.editor.setValue($scope.schemaCodeF);
			}, 400);
		}
	};
	
	$scope.addSwagger = function (v, version) {
		overlayLoading.show();
		
		let swaggerConfiguration = [
			{
				"name": "swaggerInfo",
				"directive": "modules/dashboard/endpoints/directives/addPassThroughSwagger.tmpl"
			}
		];
		if (!$localStorage.addPassThrough) {
			$localStorage.addPassThrough = {};
		}
		$localStorage.addPassThrough.step1 = angular.copy($scope.form.formData);
		let configuration = angular.copy(swaggerConfiguration);
		let options = {
			timeout: $timeout,
			entries: configuration,
			name: 'addEditSwagger',
			label: translation.addEditSwagger[LANG],
			actions: [
				{
					'type': 'submit',
					'label': 'submit',
					'btn': 'primary',
					'action': function (formData) {
						let swagger = angular.copy($scope.schemaCodeF) && angular.copy($scope.schemaCodeF) !== '' ? angular.copy($scope.schemaCodeF) : null;
						
						if (swagger && $localStorage.addPassThrough
							&& $localStorage.addPassThrough.step1
							&& $localStorage.addPassThrough.step1.versions
							&& $localStorage.addPassThrough.step1.versions[v]) {
							$localStorage.addPassThrough.step1.versions[v].swagger = {
								"swaggerInput": swagger,
								"swaggerInputType": formData.swaggerInputType
							};
							if (formData.swaggerInputType === "git" && $scope.git) {
								$localStorage.addPassThrough.step1.versions[v].swagger.git = $scope.git;
							}
						}
						$scope.schemaCodeF = '';
						$scope.schemaCode = '';
						$scope.form.formData = {};
						$scope.Step1();
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.form.formData = {};
						$scope.schemaCodeF = '';
						$scope.schemaCode = '';
						$scope.Step1();
					}
				}
			]
		};
		buildForm($scope, $modal, options, function () {
			if ($localStorage.addPassThrough
				&& $localStorage.addPassThrough.step1
				&& $localStorage.addPassThrough.step1.versions
				&& $localStorage.addPassThrough.step1.versions[v]
				&& $localStorage.addPassThrough.step1.versions[v].swagger) {
				if ($localStorage.addPassThrough.step1.versions[v].swagger.swaggerInputType) {
					$scope.form.formData.swaggerInputType = $localStorage.addPassThrough.step1.versions[v].swagger.swaggerInputType;
				}
				if ($localStorage.addPassThrough.step1.versions[v].swagger.swaggerInput) {
					
					$scope.schemaCode = $localStorage.addPassThrough.step1.versions[v].swagger.swaggerInput;
					$timeout(function () {
						if ($localStorage.addPassThrough.step1.versions[v].swagger.swaggerInputType === 'git'){
							$scope.git = $localStorage.addPassThrough.step1.versions[v].swagger.git;
							$scope.editor.setOptions({
								readOnly: true,
								highlightActiveLine: false,
								highlightGutterLine: false
							});
						}
						else if ($localStorage.addPassThrough.step1.versions[v].swagger.swaggerInputType === 'text'){
							$scope.editor.setOptions({
								readOnly: false,
								highlightActiveLine: true,
								highlightGutterLine: true
							});
						}
						$scope.editor.setValue($localStorage.addPassThrough.step1.versions[v].swagger.swaggerInput);
					}, 400);
				}
			}
			overlayLoading.hide();
		});
	};
	
	$scope.getGitInfo = function(gitId){
		let owner;
		$scope.gitAccounts.forEach((git) => {
			if (git._id ===gitId) {
				owner = git.owner;
			}
		});
		return owner ? owner : null;
	};
	
	$scope.saveEndpoint = function () {
		let api, method, _id;
		if (mode === 'edit') {
			api = 'edit';
			method = 'put';
			_id = $routeParams.id;
		} else {
			api = 'add';
			method = 'post';
		}
		getSendDataFromServer($scope, ngDataApi, {
			"method": method,
			"routeName": "/dashboard/apiBuilder/" + api,
			"params": {
				"mainType": "passThroughs",
				"id": _id
			},
			"data": $scope.mainEndpoint
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.message, true, 'dashboard');
			} else {
				$scope.form.formData = {};
				$scope.$parent.go("/endpoints/2");
				delete $localStorage.addPassThrough;
			}
		});
	};
	
	let mode = "add";
	if ($routeParams && $routeParams.id && $routeParams.id !== "new") {
		mode = "edit";
		$scope.getEndpoint($routeParams.id);
	}
	// This function will take the yaml as a string and pass it to the simulator that will generate the APIs documentation
	$scope.moveYamlRight = function () {
		$scope.schemaCodeF = $scope.schemaCode;
		watchSwaggerSimulator(function () {
			console.log("swagger ui info has been updated");
		});
	};
	
	/*
	 * This function updates the host value of the swagger simulator and check if the YAML code is valid so it will
	 * enable the generate button.
	 */
	function watchSwaggerSimulator(cb) {
		//grab the swagger info
		var x = swaggerParser.fetch();
		if (!x || x.length === 0 || typeof (x[3]) !== 'object' || Object.keys(x[3]).length === 0) {
			$timeout(function () {
				watchSwaggerSimulator(cb);
			}, 100);
		} else {
			var dashboardDomain = apiConfiguration.domain.replace(window.location.protocol + "//", "");
			//modify the host value with the domain value of dashboard taken dynamically from the main config.js
			x[3].host = dashboardDomain;
			x[3].info.host = dashboardDomain;
			x[3].basePath = "/dashboard/swagger/simulate";
			x[3].info.basePath = "/dashboard/swagger/simulate";
			console.log("switching to host and basepath to swagger simulate api in dashboard:", x[3].host + x[3].basePath);
			$scope.swaggerCode = x[4];
			//apply the changes
			swaggerParser.execute.apply(null, x);
			return cb(null, true);
		}
	}
	
	// This scope will clear the content of the swagger UI but keeps the code in the editor
	$scope.clearYamlRight = function () {
		$scope.schemaCodeF = "";
		$scope.swaggerCode = false;
	};
	if ($scope.access.addEndpoint || $scope.access.editEndpoints) {
		injectFiles.injectCss("modules/dashboard/endpoints/endpoints.css");
		$scope.listAccounts(() => {
			$scope.Step1();
		});
	}
}]);

servicesApp.filter('reposSearchFilter', function () {
	return function (input, searchKeyword) {
		if (!searchKeyword) return input;
		if (!input || !Array.isArray(input) || input.length === 0) return input;
		
		var output = [];
		input.forEach(function (oneInput) {
			if (oneInput) {
				//using full_name since it's composed of owner + name
				if (oneInput.full_name && oneInput.full_name.toLowerCase().indexOf(searchKeyword.toLowerCase()) !== -1) {
					output.push(oneInput);
				}
			}
		});
		return output;
	}
});