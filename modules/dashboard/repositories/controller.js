'use strict';

var repositoriesApp = soajsApp.components;
repositoriesApp.controller('repositoriesAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', 'repoSrv', function ($scope, $timeout, $modal, ngDataApi, injectFiles, repoSrv) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, repositoriesAppConfig.permissions);
	
	$scope.limits = [
		{
			l: 50,
			v: 50,
		},
		{
			l: 100,
			v: 100,
		},
		{
			l: 200,
			v: 200,
		},
		{
			l: 300,
			v: 300,
		},
		{
			l: 400,
			v: 400,
		},
		{
			l: 500,
			v: 100,
		}
	];
	$scope.searchTag = {};
	$scope.repoSearch = {
		limit: $scope.limits[1]
	};
	$scope.showRepos = function (pack) {
		pack.showDetails = true;
	};
	$scope.hideRepos = function (pack) {
		pack.showDetails = false;
	};
	
	function arrayUnique(array) {
		var a = array.concat();
		for (var i = 0; i < a.length; ++i) {
			for (var j = i + 1; j < a.length; ++j) {
				if (a[i] === a[j])
					a.splice(j--, 1);
			}
		}
		return a;
	}
	
	$scope.listAccounts = function (cb) {
		getSendDataFromServer($scope, ngDataApi, {
			'method': 'get',
			'routeName': '/repositories/git/accounts'
		}, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.accounts = response;
				$scope.repoSearch.providers = [
					{
						l: "Github",
						v: "github",
					},
					{
						l: "Bitbucket",
						v: "bitbucket",
					},
					{
						l: "Bitbucket Enterprise",
						v: "bitbucket_enterprise",
					}
				];
				let orgs = [];
				$scope.accounts.forEach(function (oneAccount) {
					if (oneAccount.metadata && oneAccount.metadata.organizations) {
						orgs = orgs.concat(oneAccount.metadata.organizations);
					}
				});
				orgs = arrayUnique(orgs);
				$scope.repoSearch.organizations = [];
				orgs.forEach(function (org) {
					$scope.repoSearch.organizations.push({
						l: org,
						v: org,
						selected: false
					})
				});
				if (cb && typeof cb === "function") {
					return cb();
				}
			}
		});
	};
	
	$scope.pagination = {
		totalItems: 0,
		currentPage: 1,
		maxSize: 5,
		itemsPerPage: $scope.repoSearch.limit ? $scope.repoSearch.limit.l : 100
	};
	
	$scope.search = function (page) {
		let opts = {};
		if ($scope.repoSearch.organizations.length > 0) {
			$scope.repoSearch.organizations.forEach((org) => {
				if (org.selected) {
					if (!opts.owner) {
						opts.owner = [org.v];
					} else {
						opts.owner.push(org.v);
					}
				}
			});
		}
		if ($scope.repoSearch.providers.length > 0) {
			$scope.repoSearch.providers.forEach((provider) => {
				if (provider.selected) {
					if (!opts.provider) {
						opts.provider = [provider.v];
					} else {
						opts.provider.push(provider.v);
					}
				}
			});
		}
		if ($scope.repoSearch.active) {
			opts.active = true;
		}
		
		if ($scope.repoSearch.leaf) {
			opts.leaf = true;
		}
		
		if ($scope.repoSearch.textSearch) {
			opts.textSearch = $scope.repoSearch.textSearch;
		}
		if ($scope.repoSearch.limit) {
			opts.limit = $scope.repoSearch.limit.l;
		}
		if (page > 1) {
			opts.skip = $scope.repoSearch.limit.l * (page - 1) - 1;
		}
		getSendDataFromServer($scope, ngDataApi, {
			'method': 'post',
			'routeName': '/repositories/git/repos',
			'data': opts
		}, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.repositories = response.repositories;
				$scope.repositories.forEach(function (oneRepo) {
					oneRepo.hide = true;
					if (!oneRepo.source || oneRepo.source.length === 0) {
						oneRepo.status = 'deleted';
					} else {
						if (oneRepo.active) {
							oneRepo.status = 'active';
						} else {
							oneRepo.status = 'inactive';
						}
					}
				});
				$scope.pagination.totalItems = response.count;
				$scope.pagination.itemsPerPage = $scope.repoSearch.limit.l;
			}
		});
	};
	
	$scope.reset = function () {
		if ($scope.repoSearch.organizations) {
			$scope.repoSearch.organizations.forEach((oneProgram) => {
				oneProgram.selected = false;
			});
		}
	};
	
	$scope.activateRepo = function (repo) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'put',
			routeName: '/repositories/git/repo/activate',
			params: {
				id: repo._id.toString(),
				owner: repo.source[0].name,
				provider: repo.provider
			}
		}, function (error, result) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.search($scope.pagination.currentPage);
				$scope.displayAlert('success', result.data);
			}
		});
	};
	
	$scope.deleteRepo = function (repo) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/repositories/git/repo',
			params: {
				id: repo._id.toString(),
			}
		}, function (error, result) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.search($scope.pagination.currentPage);
				$scope.displayAlert('success', result.data);
			}
		});
	};
	$scope.deleteAllLeaf = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/repositories/git/repositories',
		}, function (error, result) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.search($scope.pagination.currentPage);
				$scope.displayAlert('success', result.data);
			}
		});
	};
	
	$scope.activateBranch = function (repo, branch) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'put',
			routeName: '/repositories/git/branch/activate',
			params: {
				id: repo._id.toString(),
				owner: repo.source[0].name,
				provider: repo.provider,
				branch: branch
			}
		}, function (error, result) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				repo.branches.forEach((oneBranch) => {
					if (oneBranch && oneBranch.name === branch) {
						oneBranch.active = true;
					}
				});
				
				let activateResponse = $modal.open({
					templateUrl: 'activateResponse.tmpl',
					size: 'lg',
					backdrop: true,
					keyboard: true,
					controller: function ($scope) {
						fixBackDrop();
						if(result && Array.isArray(result)){
							$scope.multi = true;
							$scope.activatedRespo = result;
						}
						else {
							$scope.activatedRespo = [result];
						}
						$scope.title = "Result";
						$scope.ok = function () {
							activateResponse.close();
						}
					}
				});
				$scope.displayAlert('success', result.data);
			}
		});
		
	};
	
	$scope.activateTag = function (repo, tag) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'put',
			routeName: '/repositories/git/tag/activate',
			params: {
				id: repo._id.toString(),
				owner: repo.source[0].name,
				provider: repo.provider,
				tag: tag
			}
		}, function (error, result) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (!repo.tags){
					repo.tags = [];
				}
				repo.tags.push({
					name: tag,
					active: true
				});
				
				$scope.listTags(repo);
				$scope.displayAlert('success', result.data);
			}
		});
		
	};
	
	$scope.syncRepo = function (repo, branch) {
		overlayLoading.show();
		let opsData = {
			method: 'put',
			routeName: '/repositories/git/sync/repository',
			params: {
				id: repo._id.toString(),
				owner: repo.source[0].name,
				provider: repo.provider,
			}
		};
		if (branch) {
			opsData.data.branch = branch;
		}
		getSendDataFromServer($scope, ngDataApi, opsData, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.search($scope.pagination.currentPage);
				$scope.displayAlert('success', response.data);
			}
		});
	};
	
	$scope.syncBranch = function (repo, branch) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'put',
			routeName: '/repositories/git/sync/branch',
			params: {
				id: repo._id.toString(),
				owner: repo.source[0].name,
				provider: repo.provider,
				branch: branch
			}
		}, function (error, result) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', result.data);
			}
		});
	};
	
	$scope.tags = {};
	$scope.allTags = {};
	$scope.listTags = function (repo) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/repositories/git/tags',
			params: {
				id: repo._id.toString(),
				size: 10
			}
		}, function (error, result) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				let temp = result.tags;
				
				if (repo.tags && repo.tags.length){
					repo.tags.forEach((oneTag)=>{
						if (temp && temp.length > 0){
							let found = false;
							temp.forEach((tag)=>{
								if(oneTag.name === tag.name){
									tag.active = !!oneTag.active;
									found = true
								}
							});
							if (!found){
								temp.push(oneTag)
							}
						}
					})
				}
				$scope.allTags[repo.repository] = result.tags;
				$scope.tags[repo.repository] = temp;
			}
			
		});
	};
	$scope.getTag = function (repo, tag) {
		if (!tag){
			$scope.tags[repo.repository] = 	$scope.allTags[repo.repository];
		}
		else {
			getSendDataFromServer($scope, ngDataApi, {
				method: 'get',
				routeName: '/repositories/git/tag',
				params: {
					id: repo._id.toString(),
					tag: tag
				}
			}, function (error, result) {
				$scope.searchTag[repo.repository] = !(error || !result);
				if (result){
					$scope.tags[repo.repository] = [result]
				}
				else {
					$scope.tags[repo.repository] = [];
				}
			});
		}
	};
	
	$scope.deactivateRepo = function (repo) {
		let opts = {
			method: 'put',
			routeName: '/repositories/git/repo/deactivate',
			params: {
				id: repo._id.toString(),
				owner: repo.source[0].name,
				provider: repo.provider,
			}
		};
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.search($scope.pagination.currentPage);
				$scope.displayAlert('success', response.data);
			}
		});
	};
	
	$scope.deactivateBranch = function (repo, branch) {
		let opts = {
			method: 'put',
			routeName: '/repositories/git/branch/deactivate',
			params: {
				id: repo._id.toString(),
				owner: repo.source[0].name,
				provider: repo.provider,
				branch: branch
			}
		};
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				repo.branches.forEach((oneBranch) => {
					if (oneBranch && oneBranch.name === branch) {
						oneBranch.active = false;
					}
				});
				$scope.displayAlert('success', response.data);
			}
		});
	};
	
	$scope.deactivateTag = function (repo, tag) {
		let opts = {
			method: 'put',
			routeName: '/repositories/git/tag/deactivate',
			params: {
				id: repo._id.toString(),
				owner: repo.source[0].name,
				provider: repo.provider,
				tag: tag
			}
		};
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (!repo.tags){
					repo.tags = [];
				}
				repo.tags.push({
					name: tag,
					active: false
				});
				$scope.listTags(repo);
				$scope.displayAlert('success', response.data);
			}
		});
	};
	
	$scope.configureRepoEditor = false;
	$scope.configureRepo = function (oneRepo) {
		repoSrv.configureRepo($scope, oneRepo, $scope.accounts, repositoriesAppConfig);
	};
	injectFiles.injectCss("modules/dashboard/repositories/repositories.css");
	if ($scope.access.searchRepos) {
		$scope.listAccounts(() => {
			$scope.search();
		});
	}
}]);

repositoriesApp.filter('orgSearchFilter', function () {
	return function (input, searchKeyword) {
		if (!searchKeyword) return input;
		if (!input || !Array.isArray(input) || input.length === 0) return input;
		
		var output = [];
		input.forEach(function (oneInput) {
			if (oneInput) {
				//using full_name since it's composed of owner + name
				if (oneInput.l && oneInput.l.toLowerCase().indexOf(searchKeyword.toLowerCase()) !== -1) {
					output.push(oneInput);
				}
			}
		});
		
		return output;
	}
});
