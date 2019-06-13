"use strict";
var servicesApp = soajsApp.components;
servicesApp.controller('addEditPassThrough', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', 'swaggerParser', 'swaggerClient', '$cookies', 'Upload', '$routeParams', '$localStorage', '$window', 'endpointService', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, swaggerParser, swaggerClient, $cookies, Upload, $routeParams, $localStorage, $window, endpointService) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.mainEndpoint = {};
	$scope.versions = {};
	$scope.schemaCode = '';
	$scope.schemaCodeF = '';
	$scope.swaggerCode = false;
	$scope.selectedType = false;
	$scope.swaggerTypes =
		[
			{'v': 'text', 'l': 'Text'},
			// {'v': 'url', 'l': 'Url'},
			{'v': 'git', 'l': 'Git'}
		];
	$scope.InputTypes =
		[
			{
				'v': 'manual',
				'l': 'Manual',
				'description': ' Select to enter Manually the endpoint information. You will be able to add the swagger information as text (copy/paste) or point to a GIT repository. '
			},
			{
				'v': 'git',
				'l': 'Git',
				'description': 'Select if you have the endpoint (soa.json) and the swagger information in a GIT repository.'
			}
		];
	
	$scope.replaceDot = function (v) {
		return v.replace(/\./g, 'x');
	};
	$scope.empty = function (obj) {
		return obj ? Object.keys(obj).length === 0 : false;
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
	
	$scope.selectInputType = function (input) {
		let currentScope = $scope;
		if (input.v === 'git' || input.type === 'git') {
			let modal = $modal.open({
				templateUrl: "modules/dashboard/endpoints/directives/addPassThroughGit.tmpl",
				size: 'lg',
				backdrop: true,
				keyboard: true,
				controller: function ($scope) {
					fixBackDrop();
					$scope.hideFilePath = true;
					$scope.message = {};
					$scope.title = 'Select Git Repository';
					$scope.gitAccounts = currentScope.gitAccounts;
					$scope.selectedAccount = null;
					$scope.defaultPerPage = 20;
					$scope.defaultPageNumber = 1;
					
					function processSoaFile(soa, cb) {
						let data = {};
						endpointService.processSoaJSON(data, soa);
						let swaggerName = "/swagger.yml";
						if (soa.swaggerFilename) {
							swaggerName = soa.swaggerFilename;
						}
						let git = {
							"gitId": $scope.selectedAccount._id,
							"repo": $scope.selectedRepo.name,
							"branch": $scope.selectedBranch,
							"owner": $scope.selectedRepo.owner.login
						};
						data.soa = {
							git: git,
							type: "git"
						};
						let version = soa.serviceVersion || 1;
						data.versions[version].soaVersion = {
							git: git,
							type: "git"
						};
						getSendDataFromServer($scope, ngDataApi, {
							method: 'get',
							routeName: '/dashboard/gitAccounts/getAnyFile',
							params: {
								accountId: $scope.selectedAccount._id,
								repo: $scope.selectedRepo ? $scope.selectedRepo.name : null,
								owner: $scope.selectedRepo.owner.login,
								filepath: swaggerName,
								branch: $scope.selectedBranch
							}
						}, function (error, result) {
							overlayLoading.hide();
							if (error) {
								return cb(error, data);
							}
							if (result && result.content) {
								data.versions[soa.serviceVersion].swagger = {
									swaggerInput: result.content,
									swaggerInputType: "git",
									git: {
										gitId: $scope.selectedAccount._id,
										repo: $scope.selectedRepo.name,
										branch: $scope.selectedBranch,
										filepath: swaggerName,
										owner: $scope.selectedRepo.owner.login
									}
								};
								if (result.downloadLink) {
									currentScope.swaggerUrl = result.downloadLink;
									currentScope.schemaCodeF = result.content;
									currentScope.schemaCode = result.content;
									$scope.schemaCode = result.content;
								}
								return cb(null, data);
							}
						});
					}
					
					$scope.selectGitAccount = function (gitAccount) {
						$scope.gitAccounts.forEach((git) => {
							if (git._id === gitAccount) {
								$scope.selectedAccount = git;
							}
						});
						if ($scope.selectedAccount) {
							let counter = 0;
							$scope.selectedAccount.loading = false;
							$scope.listRepos($scope.selectedAccount, counter, 'getRepos');
						}
					};
					let disablePaginations = false;
					$scope.listRepos = function (account, counter, action, name) {
						let id = account._id;
						if (name) {
							disablePaginations = true;
						}
						if (!account.nextPageNumber) {
							account.nextPageNumber = $scope.defaultPageNumber;
						}
						
						let opts = {
							"method": "get",
							"routeName": "/dashboard/gitAccounts/getRepos",
							"params": {
								id: id,
								provider: account.provider,
								per_page: $scope.defaultPerPage,
								page: (action === 'loadMore') ? account.nextPageNumber : $scope.defaultPageNumber
							}
						};
						if (name && name.length > 2 && ($scope.selectedAccount.provider === "bitbucket" || $scope.selectedAccount.provider === "bitbucket_enterprise")) {
							opts.params.name = name;
						}
						
						if (disablePaginations) {
							opts.params.page = $scope.defaultPageNumber;
						}
						if (!name || name.length > 2) {
							overlayLoading.show();
							getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
								overlayLoading.hide();
								$scope.selectedAccount.loading = true;
								if (error) {
									if (!opts.params.name) {
										disablePaginations = false;
									}
									$scope.displayAlert('danger', error.message);
								} else {
									if (opts.params.name || disablePaginations) {
										$scope.repos = response;
									} else if (action === 'loadMore') {
										$scope.appendNewRepos(account, response);
									} else if (action === 'getRepos') {
										$scope.repos = response;
										account.nextPageNumber = 2;
										account.allowLoadMore = (response.length === $scope.defaultPerPage);
									}
									if (!opts.params.name) {
										disablePaginations = false;
									}
								}
							});
						}
					};
					
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
						let selectedRepo = angular.copy($scope.selectedRepo);
						if (selectedRepo && selectedRepo.id !== repo.id) {
							jQuery('[id^="repo_full_name_"]').removeClass("onClickRepo");
							jQuery('#repo_full_name_' + repo.id).addClass('onClickRepo');
						}
						if ((selectedRepo && selectedRepo.id === repo.id) || !selectedRepo) {
							jQuery('#repo_full_name_' + repo.id).addClass('onClickRepo');
						}
						
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
							} else if (result) {
								$scope.selectedRepo = repo;
								$scope.repoBranch = result.branches;
							}
						});
					};
					
					$scope.selectBranch = function (branch) {
						if (branch) {
							$scope.selectedBranch = branch;
						}
					};
					
					$scope.displayAlert = function (type, message) {
						$scope.message[type] = message;
						$timeout(() => {
							$scope.message = {};
						}, 5000);
					};
					
					$scope.submit = function () {
						overlayLoading.show();
						getSendDataFromServer($scope, ngDataApi, {
							method: 'get',
							routeName: '/dashboard/gitAccounts/getAnyFile',
							params: {
								accountId: $scope.selectedAccount._id,
								repo: $scope.selectedRepo ? $scope.selectedRepo.name : null,
								owner: $scope.selectedRepo.owner.login,
								filepath: '/soa.json',
								branch: $scope.selectedBranch
							}
						}, function (error, result) {
							currentScope.selectedType = "git";
							if (error) {
								overlayLoading.hide();
								$scope.displayAlert('danger', error.message);
							}
							if (result && result.content) {
								try {
									processSoaFile(JSON.parse(result.content), (err, data) => {
										//todo fix this!
										if (err) {
											currentScope.displayAlert('danger', err.message ? err.message : err);
										}
										if (!$localStorage.addPassThrough) {
											$localStorage.addPassThrough = {};
										}
										$localStorage.addPassThrough.step1 = angular.copy(data);
										currentScope.form.formData = $localStorage.addPassThrough.step1;
										currentScope.git = angular.copy($localStorage.addPassThrough.step1.soa.git);
										modal.close();
										
									});
								} catch (e) {
									overlayLoading.hide();
									$scope.displayAlert('danger', "Error parsing contents of soa.js file.");
									console.log(e);
								}
							}
						});
					};
					
					$scope.closeModal = function () {
						modal.close();
					};
					if ($localStorage.addPassThrough && $localStorage.addPassThrough.step1
						&& $localStorage.addPassThrough.step1.versions
						&& Object.keys($localStorage.addPassThrough.step1.versions) > 0) {
						if ($localStorage.addPassThrough.step1.soa
							&& $localStorage.addPassThrough.step1.soa.type
							&& $localStorage.addPassThrough.step1.soa.type === 'git') {
							if ($localStorage.addPassThrough.step1.soa.git) {
								$scope.selectedAccount = $localStorage.addPassThrough.step1.soa.gitId;
								$scope.gitAcc = $localStorage.addPassThrough.step1.soa.gitId;
								$scope.selectGitAccount($scope.selectedAccount);
							}
						}
					}
				}
			});
		} else if (input.v === 'manual') {
			$scope.selectedType = true;
			$scope.form.formData.soa = {type: "manual"}
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
					if (data.src.soaVersion) {
						data.src.soaVersion.forEach((oneSoa) => {
							if (data.versions[oneSoa.version]) {
								data.versions[oneSoa.version].soaVersion = {
									git: oneSoa.content.git,
									type: oneSoa.content.type
								};
							}
						});
					}
					if (data.src.soa) {
						data.soa = data.src.soa;
						
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
		if (type === 'text') {
			$timeout(function () {
				if ($scope.editor) {
					$scope.editor.setOptions({
						readOnly: false,
						highlightActiveLine: true,
						highlightGutterLine: true
					});
				}
			}, 400);
		}
		if (type === 'git') {
			let currentScope = $scope;
			let modal = $modal.open({
				templateUrl: "modules/dashboard/endpoints/directives/addPassThroughGit.tmpl",
				size: 'lg',
				backdrop: true,
				keyboard: true,
				controller: function ($scope) {
					fixBackDrop();
					$scope.hideFilePath = false;
					$scope.message = {};
					$scope.title = 'Select Git Repository';
					$scope.gitAccounts = currentScope.gitAccounts;
					$scope.selectedAccount = null;
					$scope.filepath = null;
					$scope.selectGitAccount = function (gitAccount) {
						$scope.gitAccounts.forEach((git) => {
							if (git._id === gitAccount) {
								$scope.selectedAccount = git;
							}
						});
						if ($scope.selectedAccount) {
							let counter = 0;
							$scope.selectedAccount.loading = false;
							$scope.listRepos($scope.selectedAccount, counter, 'getRepos');
						}
					};
					$scope.defaultPerPage = 50;
					$scope.defaultPageNumber = 1;
					let disablePaginations = false;
					$scope.listRepos = function (account, counter, action, name) {
						if (name) {
							disablePaginations = true;
						}
						let id = account._id;
						if (!account.nextPageNumber) {
							account.nextPageNumber = $scope.defaultPageNumber;
						}
						
						let opts = {
							"method": "get",
							"routeName": "/dashboard/gitAccounts/getRepos",
							"params": {
								id: id,
								provider: account.provider,
								per_page: $scope.defaultPerPage,
								page: (action === 'loadMore') ? account.nextPageNumber : $scope.defaultPageNumber
							}
						};
						if (name && name.length > 2 && ($scope.selectedAccount.provider === "bitbucket" || $scope.selectedAccount.provider === "bitbucket_enterprise")) {
							opts.params.name = name;
						}
						
						if (disablePaginations) {
							opts.params.page = $scope.defaultPageNumber;
						}
						if (!name || name.length > 2) {
							overlayLoading.show();
							getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
								overlayLoading.hide();
								$scope.selectedAccount.loading = true;
								if (error) {
									if (!opts.params.name) {
										disablePaginations = false;
									}
									$scope.displayAlert('danger', error.message);
								} else {
									if (opts.params.name || disablePaginations) {
										$scope.repos = response;
									} else if (action === 'loadMore') {
										$scope.appendNewRepos(account, response);
									} else if (action === 'getRepos') {
										
										$scope.repos = response;
										
										account.nextPageNumber = 2;
										account.allowLoadMore = (response.length === $scope.defaultPerPage);
										if (!opts.params.name) {
											disablePaginations = false;
										}
									}
								}
							});
						}
					};
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
						let selectedRepo = angular.copy($scope.selectedRepo);
						if (selectedRepo && selectedRepo.id !== repo.id) {
							jQuery('[id^="repo_full_name_"]').removeClass("onClickRepo");
							jQuery('#repo_full_name_' + repo.id).addClass('onClickRepo');
						}
						if ((selectedRepo && selectedRepo.id === repo.id) || !selectedRepo) {
							jQuery('#repo_full_name_' + repo.id).addClass('onClickRepo');
						}
						
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
							} else if (result) {
								$scope.selectedRepo = repo;
								$scope.repoBranch = result.branches;
							}
						});
					};
					$scope.selectBranch = function (branch) {
						if (branch) {
							$scope.selectedBranch = branch;
						}
					};
					$scope.displayAlert = function (type, message) {
						$scope.message[type] = message;
						$timeout(() => {
							$scope.message = {};
						}, 5000);
					};
					$scope.submit = function (data) {
						let opts = {
							method: 'get',
							routeName: '/dashboard/gitAccounts/getAnyFile',
							params: {
								accountId: $scope.selectedAccount._id,
								filepath: $scope.filepath,
								branch: $scope.selectedBranch
							}
						};
						if ($scope.swaggerRepo) {
							opts.params.owner = $scope.swaggerRepo.owner;
							opts.params.repo = $scope.swaggerRepo.name;
						} else if ($scope.selectedRepo) {
							opts.params.repo = $scope.selectedRepo.name;
							opts.params.owner = $scope.selectedRepo.owner.login;
						}
						overlayLoading.show();
						getSendDataFromServer($scope, ngDataApi, opts, function (error, result) {
							overlayLoading.hide();
							if (error) {
								$scope.displayAlert('danger', error.message);
							}
							if (result && result.content && typeof result.content === 'string') {
								currentScope.editor.setValue(result.content);
								currentScope.editor.setOptions({
									readOnly: true,
									highlightActiveLine: false,
									highlightGutterLine: false
								});
								currentScope.git = {
									gitId: $scope.selectedAccount._id,
									owner: $scope.selectedRepo ? $scope.selectedRepo.name.login : $scope.swaggerRepo.owner,
									repo: $scope.selectedRepo ? $scope.selectedRepo.name : $scope.swaggerRepo.name,
									branch: $scope.selectedBranch,
									filepath: $scope.filepath,
								};
								currentScope.schemaCode = result.content;
								currentScope.schemaCodeF = result.content;
								currentScope.swaggerUrl = result.downloadLink;
								$scope.closeModal();
							} else {
								$scope.displayAlert('danger', "Error parsing contents of soa.js file.");
							}
						});
					};
					
					if ($localStorage.addPassThrough.step1.soa
						&& $localStorage.addPassThrough.step1.soa.type
						&& $localStorage.addPassThrough.step1.soa.type === "git"
						&& $localStorage.addPassThrough.step1.soa.git) {
						$scope.gitSoa = true;
						$scope.gitAcc = $localStorage.addPassThrough.step1.soa.git.gitId;
						$scope.gitAccounts.forEach((git) => {
							if (git._id === currentScope.git.gitId) {
								$scope.selectedAccount = git;
								$scope.selectedAccount.loading = true;
							}
						});
						if (currentScope.git) {
							$scope.filepath = currentScope.git.filepath;
							$scope.selectedBranch = currentScope.git.branch;
						}
						$scope.swaggerRepo = {
							owner: $localStorage.addPassThrough.step1.git.owner,
							name: $localStorage.addPassThrough.step1.soa.git.repo
						};
						overlayLoading.show();
						getSendDataFromServer($scope, ngDataApi, {
							method: 'get',
							routeName: '/dashboard/gitAccounts/getBranches',
							params: {
								name: $scope.swaggerRepo.owner + "/" + $scope.swaggerRepo.name,
								type: 'repo',
								id: $scope.selectedAccount._id.toString(),
								provider: $scope.selectedAccount.provider
							}
						}, function (error, result) {
							overlayLoading.hide();
							if (error) {
								$scope.displayAlert('danger', error.message);
							} else if (result) {
								$scope.repoBranch = result.branches;
							}
						});
					} else if (currentScope.git) {
						$scope.filepath = currentScope.git.filepath;
						$scope.gitAcc = angular.copy(currentScope.git.gitId);
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
					$scope.closeModal = function () {
						modal.close();
					};
				}
			});
		}
	};
	
	$scope.syncGitInformation = function (v) {
		let params;
		if (v && $localStorage.addPassThrough
			&& $localStorage.addPassThrough.step1
			&& $localStorage.addPassThrough.step1.versions
			&& $localStorage.addPassThrough.step1.versions[v]
			&& $localStorage.addPassThrough.step1.versions[v].type === "git"
			&& $localStorage.addPassThrough.step1.versions[v].soaVersion
			&& $localStorage.addPassThrough.step1.versions[v].soaVersion.git) {
			params = {
				accountId: $localStorage.addPassThrough.step1.versions[v].soaVersion.git.gitId,
				repo: $localStorage.addPassThrough.step1.versions[v].soaVersion.git.repo,
				filepath: '/soa.json',
				owner: $localStorage.addPassThrough.step1.versions[v].soaVersion.git.owner,
				branch: $localStorage.addPassThrough.step1.versions[v].soaVersion.git.branch
			}
		} else {
			if ($localStorage.addPassThrough
				&& $localStorage.addPassThrough.step1
				&& $localStorage.addPassThrough.step1.soa
				&& $localStorage.addPassThrough.step1.soa.type === "git"
				&& $localStorage.addPassThrough.step1.soa.git) {
				params = {
					accountId: $localStorage.addPassThrough.step1.soa.git.gitId,
					repo: $localStorage.addPassThrough.step1.soa.git.repo,
					filepath: '/soa.json',
					owner: $localStorage.addPassThrough.step1.soa.git.owner,
					branch: $localStorage.addPassThrough.step1.soa.git.branch
				}
			}
		}
		if (params) {
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/gitAccounts/getAnyFile',
				params: params
			}, function (error, result) {
				overlayLoading.hide();
				if (error) {
					$scope.displayAlert('danger', error.message);
				}
				if (result && result.content) {
					try {
						let jsonData = JSON.parse(result.content);
						if (v) {
							let versionCheck = endpointService.checkSoaVersion($localStorage.addPassThrough.step1, jsonData);
							if (!versionCheck.allowed) {
								overlayLoading.hide();
								$scope.displayAlert('danger', `You cannot sync this version from this branch, the ${versionCheck.reason.join(',')} are not the same!`);
							} else {
								endpointService.processSoaVersion($localStorage.addPassThrough.step1.versions[v], JSON.parse(result.content));
								$scope.form.formData = $localStorage.addPassThrough.step1;
							}
						} else {
							endpointService.processSoaJSON($localStorage.addPassThrough.step1, JSON.parse(result.content), true);
							$scope.form.formData = $localStorage.addPassThrough.step1;
						}
						
					} catch (e) {
						overlayLoading.hide();
						$scope.displayAlert('danger', "Error parsing contents of soa.js file.");
						console.log(e);
					}
				}
			});
		}
	};
	
	$scope.editGitInformation = function (v) {
		if (v && $localStorage.addPassThrough
			&& $localStorage.addPassThrough.step1
			&& $localStorage.addPassThrough.step1.versions
			&& $localStorage.addPassThrough.step1.versions[v]
			&& $localStorage.addPassThrough.step1.versions[v].soaVersion
			&& $localStorage.addPassThrough.step1.versions[v].soaVersion.type === 'git'
		
		) {
			$scope.selectInputType($localStorage.addPassThrough.step1.versions[v].soaVersion);
		} else {
			$scope.selectInputType({type: 'git'});
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
				required: false
			},
			requestTimeoutRenewal: {
				required: false
			},
			versions: {
				required: true,
				properties: {
					url: {
						required: true
					}
				}
			},
			path: {
				required: false
			},
			port: {
				required: false
			}
		};
		
		let environmentsConfigStep1Entries = [
			{
				"name": "generalInfo",
				"directive": "modules/dashboard/endpoints/directives/add-passThrough.tmpl"
			}
		];
		let configuration = angular.copy(environmentsConfigStep1Entries);
		
		$scope.tempFormEntries = entries;
		let options = {
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
								if ($scope.tempFormEntries[fieldName].properties) {
									for (let prop in $scope.tempFormEntries[fieldName].properties) {
										if ($scope.tempFormEntries[fieldName].properties[prop].required) {
											for (let key in formData[fieldName]) {
												if (!formData[fieldName][key] || !formData[fieldName][key][prop]) {
													$window.alert('Some of the fields under controller section are still missing.');
													return false;
												}
											}
										}
									}
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
				if ($localStorage.addPassThrough.step1.soa) {
					$scope.selectedType = $localStorage.addPassThrough.step1.soa.type;
					if ($localStorage.addPassThrough.step1.soa.type === "git" && $localStorage.addPassThrough.step1.soa.git) {
						$scope.git = angular.copy($localStorage.addPassThrough.step1.soa.git);
					}
					
				}
			}
			$scope.form.closeModal = function () {
				delete $localStorage.addPassThrough;
				$scope.form.formData = {};
				$scope.$parent.go("/endpoints/2");
			};
			overlayLoading.hide();
		});
	};
	
	$scope.syncGitSwagger = function (branch, filepath, v, cb) {
		let git = {};
		
		if (branch && filepath) {
			git.branch = branch;
			git.filepath = filepath;
		} else {
			git.branch = $scope.git.branch;
			git.filepath = $scope.git.filepath;
		}
		
		if ($scope.git && $scope.git.gitId && git.branch && git.filepath) {
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/gitAccounts/getAnyFile',
				params: {
					accountId: $scope.git.gitId,
					repo: $scope.git.repo,
					filepath: git.filepath,
					owner: $scope.git.owner,
					branch: git.branch
				}
			}, function (error, result) {
				overlayLoading.hide();
				if (error) {
					$scope.displayAlert('danger', error.message);
					if (cb && typeof cb === "function") {
						return cb();
					}
				}
				if (result && result.content) {
					if (branch && filepath) {
						$scope.form.formData.versions[v].swagger = {
							git: $scope.form.formData.versions[v].soaVersion.git,
							swaggerInput: result.content,
							swaggerInputType: "git"
						};
						$scope.form.formData.versions[v].swagger.git.filepath = git.filepath;
						if (cb && typeof cb === "function") {
							return cb();
						}
					} else {
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
				} else {
					if (cb && typeof cb === "function") {
						return cb();
					}
				}
			});
		}
	};
	
	$scope.editGitSwagger = function () {
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
			} else if (result) {
				$scope.selectedRepo = repo;
				$scope.repoBranch = result.branches;
			}
		});
		$scope.selectSwagger('git');
	};
	
	$scope.addMoreVersions = function (type, v) {
		let formConfig = angular.copy(apiBuilderConfig.form.addVersion);
		if (type === 'edit') {
			formConfig.entries[0].value = v;
		}
		$scope.versionScope = $scope.$new(true);
		let options = {
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
						/*
							new version conditions :
								1. check version is found
								2. if the version is a number, parse float it and check its existence
							edit version conditions(type = edit):
								1. check if new version is not equal to old version
									==> check if its exists
									==> if the version is a number, parse float it and check its existence
						 */
						if (($scope.form.formData.versions[formData.version] && type !== 'edit')
							|| (parseFloat(formData.version) && $scope.form.formData.versions[parseFloat(formData.version)] && type !== 'edit')
							|| (type === 'edit' && ($scope.form.formData.versions[formData.version] || (parseFloat(formData.version) && $scope.form.formData.versions[parseFloat(formData.version)])) && formData.version !== v)) {
							$scope.versionScope.form.displayAlert('danger', 'Version already exist!');
						} else {
							if (type === 'edit') {
								if (formData.version !== v) {
									$scope.form.formData.versions[formData.version] = angular.copy($scope.form.formData.versions[v]);
									delete $scope.form.formData.versions[v];
								}
							} else {
								$scope.form.formData.versions[formData.version] = {};
							}
							let version = 1;
							if ($localStorage.addPassThrough
								&& $localStorage.addPassThrough.step1
								&& $localStorage.addPassThrough.step1.versions) {
								if (type === 'edit' && $localStorage.addPassThrough.step1.versions[formData.version]) {
									version = formData.version;
								}
								if (Object.keys($localStorage.addPassThrough.step1.versions).length > 0) {
									version = Object.keys($localStorage.addPassThrough.step1.versions)[0];
								}
							}
							if ($localStorage.addPassThrough
								&& $localStorage.addPassThrough.step1
								&& $localStorage.addPassThrough.step1.versions
								&& $localStorage.addPassThrough.step1.versions[version]
								&& $localStorage.addPassThrough.step1.versions[version].soaVersion
								&& $localStorage.addPassThrough.step1.versions[version].soaVersion.type === "git") {
								overlayLoading.show();
								getSendDataFromServer($scope, ngDataApi, {
									method: 'get',
									routeName: '/dashboard/gitAccounts/getAnyFile',
									params: {
										accountId: $localStorage.addPassThrough.step1.versions[version].soaVersion.git.gitId,
										repo: $localStorage.addPassThrough.step1.versions[version].soaVersion.git.repo,
										filepath: '/soa.json',
										owner: $localStorage.addPassThrough.step1.versions[version].soaVersion.git.owner,
										branch: formData.branch
									}
								}, function (error, result) {
									if (error) {
										overlayLoading.hide();
										$scope.versionScope.form.displayAlert('danger', error.message);
									}
									if (result && result.content) {
										try {
											let jsonData = JSON.parse(result.content);
											let versionCheck = endpointService.checkSoaVersion($localStorage.addPassThrough.step1, jsonData);
											if (!versionCheck.allowed) {
												overlayLoading.hide();
												$scope.versionScope.form.displayAlert('danger', `You cannot add this version from this branch, the ${versionCheck.reason.join(' | ')} are not the same!`);
											} else {
												endpointService.processSoaVersion($scope.form.formData.versions[formData.version], jsonData);
												let swaggerFilePath = jsonData.swaggerFilename ? jsonData.swaggerFilename : "/swagger.yml";
												$scope.form.formData.versions[formData.version].soaVersion = {
													type: "git",
													git: angular.copy($localStorage.addPassThrough.step1.versions[version].soaVersion.git)
												};
												$scope.form.formData.versions[angular.copy(formData.version)].soaVersion.git.branch = angular.copy(formData.branch);
												$scope.syncGitSwagger(formData.branch, swaggerFilePath, formData.version, () => {
													overlayLoading.hide();
													$localStorage.addPassThrough.step1 = $scope.form.formData;
													$scope.versionScope.modalInstance.close();
													$scope.versionScope.form.formData = {};
												});
											}
										} catch (e) {
											overlayLoading.hide();
											$scope.versionScope.form.displayAlert('danger', "Error parsing contents of soa.js file.");
											console.log(e);
										}
									} else {
										overlayLoading.hide();
										$scope.versionScope.form.displayAlert('danger', "Error parsing contents of soa.js file.");
									}
								});
							} else {
								$scope.versionScope.modalInstance.close();
								$scope.versionScope.form.formData = {};
							}
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
		if (!v && $localStorage.addPassThrough
			&& $localStorage.addPassThrough.step1
			&& $localStorage.addPassThrough.step1.versions) {
			v = Object.keys($localStorage.addPassThrough.step1.versions).length > 0 ? Object.keys($localStorage.addPassThrough.step1.versions)[0] : null;
		}
		if ($localStorage.addPassThrough
			&& $localStorage.addPassThrough.step1
			&& $localStorage.addPassThrough.step1.soa
			&& $localStorage.addPassThrough.step1.soa.type === "git"
			&& $localStorage.addPassThrough.step1.soa.git) {
			$scope.gitAccounts.forEach((git) => {
				if (git._id === $scope.git.gitId) {
					$scope.selectedAccount = git;
					$scope.selectedAccount.loading = true;
				}
			});
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/gitAccounts/getBranches',
				params: {
					name: $localStorage.addPassThrough.step1.soa.git.owner + "/" + $localStorage.addPassThrough.step1.soa.git.repo,
					type: 'repo',
					id: $scope.selectedAccount._id.toString(),
					provider: $scope.selectedAccount.provider
				}
			}, function (error, result) {
				overlayLoading.hide();
				if (error) {
					$scope.versionScope.displayAlert('danger', error.message);
				} else if (result && result.branches) {
					let branches = [];
					result.branches.forEach((oneBranch) => {
						let temp = {l: oneBranch.name, v: oneBranch.name};
						if (type === 'edit'
							&& $localStorage.addPassThrough.step1.versions[v].soaVersion
							&& $localStorage.addPassThrough.step1.versions[v].soaVersion.git
							&& $localStorage.addPassThrough.step1.versions[v].soaVersion.git.branch
							&& $localStorage.addPassThrough.step1.versions[v].soaVersion.git.branch === oneBranch.name) {
							temp.selected = true;
						}
						branches.push(temp)
					});
					options.form.entries.push({
						'name': 'branch',
						'label': 'Select Branch',
						'type': 'select',
						'value': branches,
						'required': true,
						'tooltip': 'Select a branch to retrieve your soa.json information from.'
					});
					buildFormWithModal($scope.versionScope, $modal, options);
				}
			});
		} else {
			buildFormWithModal($scope.versionScope, $modal, options);
		}
	};
	
	$scope.deleteVersion = function (v) {
		delete $scope.form.formData.versions[v];
	};
	
	$scope.editVersion = function (v) {
		let formConfig = angular.copy(apiBuilderConfig.form.addVersion);
		$scope.versionScope = $scope.$new(true);
		formConfig.entries[0].value = v;
		let options = {
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
			if ($localStorage.addPassThrough && $localStorage.addPassThrough.step1) {
				if ($localStorage.addPassThrough.step1.soa && $localStorage.addPassThrough.step1.soa.type === 'git') {
					$scope.swaggerTypes =
						[
							{'v': 'git', 'l': 'Git'}
						];
				}
				if ($localStorage.addPassThrough.step1.versions
					&& $localStorage.addPassThrough.step1.versions[v] &&
					$localStorage.addPassThrough.step1.versions[v].swagger) {
					if ($localStorage.addPassThrough.step1.versions[v].swagger.swaggerInputType) {
						$scope.form.formData.swaggerInputType = $localStorage.addPassThrough.step1.versions[v].swagger.swaggerInputType;
					}
					if ($localStorage.addPassThrough.step1.versions[v].swagger.swaggerInput) {
						$scope.schemaCode = $localStorage.addPassThrough.step1.versions[v].swagger.swaggerInput;
						$timeout(function () {
							if ($localStorage.addPassThrough.step1.versions[v].swagger.swaggerInputType === 'text') {
								$scope.editor.setOptions({
									readOnly: false,
									highlightActiveLine: true,
									highlightGutterLine: true
								});
							} else if ($localStorage.addPassThrough.step1.versions[v].swagger.swaggerInputType === 'git') {
								$scope.git = $localStorage.addPassThrough.step1.versions[v].swagger.git;
								$scope.editor.setOptions({
									readOnly: true,
									highlightActiveLine: false,
									highlightGutterLine: false
								});
								$scope.syncGitSwagger();
							}
							$scope.editor.setValue($localStorage.addPassThrough.step1.versions[v].swagger.swaggerInput);
						}, 400);
					}
				}
				
			}
			overlayLoading.hide();
		});
	};
	
	$scope.computeParser = function (data) {
		if (data) {
			return (data.indexOf(".json") === -1) ? 'yaml' : 'json';
		} else {
			return 'yaml';
		}
	};
	
	$scope.getGitInfo = function (gitId) {
		let owner;
		$scope.gitAccounts.forEach((git) => {
			if (git._id === gitId) {
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
		$scope.selectedType = true;
	}
	// This function will take the yaml as a string and pass it to the simulator that will generate the APIs documentation
	$scope.moveYamlRight = function () {
		$scope.schemaCodeF = $scope.schemaCode;
		try {
			$scope.schemaCodeF= YAML.parse($scope.schemaCode);
		}
		catch (e) {
			try {
				$scope.schemaCodeF= JSON.parse($scope.schemaCode);
			}
			catch (e) {
			}
		}
		$scope.editor.setValue( $scope.schemaCode);
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
		let x = swaggerParser.fetch();
		if (!x || x.length === 0 || typeof (x[3]) !== 'object' || Object.keys(x[3]).length === 0) {
			$timeout(function () {
				watchSwaggerSimulator(cb);
			}, 100);
		} else {
			let dashboardDomain = apiConfiguration.domain.replace(window.location.protocol + "//", "");
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