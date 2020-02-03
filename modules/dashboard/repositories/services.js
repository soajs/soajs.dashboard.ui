"use strict";
var repoService = soajsApp.components;
repoService.service('repoSrv', ['ngDataApi', '$timeout', '$modal', '$cookies', '$window', '$compile', 'detectBrowser', function (ngDataApi, $timeout, $modal, $cookies, $window, $compile, detectBrowser) {

	function configureRepo(currentScope, oneRepo, gitAccount, config) {
		currentScope.configureRepoEditor = true;
		var exceptionProviders = ['drone'];
		currentScope.services = {};
		currentScope.tabLabel = 'Version ';
		currentScope.default = false;
		currentScope.gitAccount = gitAccount;
		currentScope.myCurrentRepo = oneRepo;
		currentScope.alerts = [];
		currentScope.imagePath = 'themes/' + themeToUse + '/img/loading.gif';
		currentScope.images = {
			travis: "./themes/" + themeToUse + "/img/travis_logo.png",
			drone: "./themes/" + themeToUse + "/img/drone_logo.png",
			jenkins: "./themes/" + themeToUse + "/img/jenkins_logo.png",
			teamcity: "./themes/" + themeToUse + "/img/teamcity_logo.png"
		};
		currentScope.myBrowser = detectBrowser();
		currentScope.activatedRepo = false;

		currentScope.showBuildLogs = function(oneBuild){
			oneBuild.hide = !oneBuild.hide;
			
			if(oneBuild.hide){
				jQuery("#build_" + oneBuild.id).slideUp();
			}
			else{
				jQuery("#build_" + oneBuild.id).slideDown();
				buildLogsEditor.setValue(oneBuild.logs);
			}
		};
		
		function reRenderEditor(editor, id, newHeight){
			editor.clearSelection();
			var heightUpdateFunction = function () {
				editor.renderer.scrollBar.setHeight(newHeight.toString() + "px");
				editor.renderer.scrollBar.setInnerHeight(newHeight.toString() + "px");
				jQuery('#' + id).height(newHeight.toString() + "px");
			};
			
			$timeout(function () {
				editor.heightUpdate = heightUpdateFunction();
				// Set initial size to match initial content
				heightUpdateFunction();
				
				// Whenever a change happens inside the ACE editor, update
				// the size again
				editor.getSession().on('change', heightUpdateFunction);
				editor.setOption("highlightActiveLine", false);
			}, 10);
		}
		
		var buildLogsEditor;
		currentScope.aceLoaded = function (_editor) {
			_editor.setShowPrintMargin(false);
			_editor.$blockScrolling = Infinity;
			_editor.renderer.setScrollMargin(20, 20, 20, 50);
			buildLogsEditor =  _editor;
		};
		
		currentScope.updateEditorScope = function(e){
			let newHeight = 50;
			if(e[0].data && e[0].data.lines){
				newHeight += e[0].data.lines.length *  16.4;
				newHeight = Math.ceil(newHeight);
				reRenderEditor(buildLogsEditor, e[1].container.id, newHeight);
			}
		};
		
		var configEditor;
		currentScope.aceLoaded2 = function (_editor) {
			_editor.setShowPrintMargin(false);
			_editor.$blockScrolling = Infinity;
			_editor.renderer.setScrollMargin(20, 20, 20, 50);
			configEditor = _editor;
		};
		
		currentScope.updateEditorScope2 = function(e){
			let newHeight = 50;
			if(e[0].data && e[0].data.lines){
				newHeight += e[0].data.lines.length *  16.5;
				newHeight = Math.ceil(newHeight);
				reRenderEditor(configEditor, e[1].container.id, newHeight);
			}
		};
		
		currentScope.goTOCI = function () {
			currentScope.$parent.go('#/continuous-integration');
		};

		currentScope.cancel = function () {
			currentScope.configureRepoEditor = false;
			//currentScope.listAccounts();
		};

		currentScope.toggleStatus = function (provider, status) {
			if(!currentScope.access.enableDisableCIRepo){
				currentScope.displayAlert('danger', "You do not have access to Turn ON/Off a repo at CI provider.");
			}
			else{
				toggleStatus(currentScope, status, oneRepo, provider, function () {
					currentScope.activatedRepo = !status;
					if (status) {
						currentScope.showCIConfigForm(provider);
					}
					else {
						currentScope.form = {};
					}
				});
			}
		};

		currentScope.displayAlert = function (type, msg, isCode, service, orgMesg) {
			currentScope.alerts = [];
			if (isCode) {
				var msgT = getCodeMessage(msg, service, orgMesg);
				if (msgT) {
					msg = msgT;
				}
			}
			currentScope.alerts.push({'type': type, 'msg': msg});
		};

		currentScope.closeAlert = function (index) {
			currentScope.alerts.splice(index, 1);
		};

		currentScope.showCIConfigForm = function (oneProvider) {
			currentScope.ciRepoName = oneRepo.full_name;
			currentScope.activatedRepo = false;
			currentScope.noCiConfig = (oneProvider) ? false : true;
			
			if (currentScope.noCiConfig) {
				currentScope.activatedRepo = true;
				return false;
			}
			$timeout(function(){
				overlayLoading.show();
				getRepoCIBuildDetails(currentScope, oneRepo, oneProvider, () => {
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'get',
						routeName: '/dashboard/ci/settings',
						params: {
							'id': oneRepo.full_name,
							"provider": oneProvider.provider,
							"owner": oneProvider.owner
						}
					}, function (error, response) {
						overlayLoading.hide();
						if (error) {
							if(error.code === 976){
								currentScope.activatedRepo = true;
							}
							else{
								currentScope.displayAlert('danger', error.message);
							}
						}
						else {
							currentScope.activatedRepo = !response.settings.active;
							
							var customEnvs = response.envs;
							var formConfig = angular.copy(config.form.settings);
							
							var providerSettings = angular.copy(config.providers[oneProvider.provider]);
							formConfig.entries[0].entries = providerSettings;
							
							for (var oneVar in oneProvider.variables) {
								formConfig.entries[1].entries.push({
									'name': oneVar,
									'label': oneVar,
									'value': oneProvider.variables[oneVar],
									'disabled': true,
									'type': 'text'
								});
							}
							formConfig.entries[1].entries.push({
								"type": "html",
								"value": "<br /><p><em>Once you submit this form, the above SOAJS environment variables will be added to your repository configuration.</em></p>"
							});
							if (oneProvider.customeVariables && Object.keys(oneProvider.customeVariables).length > 0){
								for (var oneVar in oneProvider.customeVariables) {
									formConfig.entries[2].entries.push({
										'name': oneVar,
										'label': oneVar,
										'value': oneProvider.customeVariables[oneVar],
										'disabled': true,
										'type': 'text'
									});
								}
							}
							
							formConfig.entries[2].entries.push({
								"type": "html",
								"value": "<br /><p><em>Once you submit this form, the above custom environment variables will be added to your repository configuration.</em></p>"
							});
							
							var count = 0;
							formConfig.entries[3].entries = [];
							customEnvs.forEach(function (enVar) {
								if (!oneProvider.variables[enVar.name] && !oneProvider.customeVariables[enVar.name]) {
									var oneClone = angular.copy(config.form.envVar);
									for (var i = 0; i < oneClone.length; i++) {
										oneClone[i].name = oneClone[i].name.replace("%count%", count);
										
										if (oneClone[i].name.indexOf('envName') !== -1) {
											oneClone[i].value = enVar.name;
										}
										if (oneClone[i].name.indexOf('envVal') !== -1) {
											oneClone[i].value = enVar.value;
										}
										
										if(exceptionProviders.indexOf(oneProvider.provider) !== -1 && !oneClone[i].value || oneClone[i].value === ''){
											oneClone[i].required = false;
											if (oneClone[i] !== "<span class='red'><span class='icon icon-cross' title='Remove'></span></span>"){
												oneClone[i].fieldMsg = "If you don't want to modify this environment variable, Leave its value empty.";
											}
										}
										if (enVar.hasOwnProperty("public") && enVar.public === false && enVar.value === null) {
											oneClone[i].required = false;
											oneClone[i].disabled = true;
											oneClone[i].placeholder = "*******";
											if (oneClone[i].name.indexOf('envType') !== -1) {
												oneClone[i].value = false;
											}
										}
										else {
											if (oneClone[i].name.indexOf('envType') !== -1) {
												oneClone[i].value = true
											}
										}
									}
									formConfig.entries[3].entries = formConfig.entries[3].entries.concat(oneClone);
									count++;
								}
							});
							
							var oneClone = angular.copy(config.form.envVar);
							for (var i = 0; i < oneClone.length; i++) {
								oneClone[i].name = oneClone[i].name.replace("%count%", count);
							}
							count++;
							formConfig.entries.push({
								"name": "addEnv",
								"type": "html",
								"value": '<span class="f-left"><input type="button" class="btn btn-sm btn-success" value="Add New Variable"></span>',
								"onAction": function (id, data, form) {
									var oneClone = angular.copy(config.form.envVar);
									for (var i = 0; i < oneClone.length; i++) {
										oneClone[i].name = oneClone[i].name.replace("%count%", count);
									}
									form.entries[3].entries = form.entries[3].entries.concat(oneClone);
									count++;
								}
							});
							
							formConfig.entries.push({
								type: "html",
								value: "<hr />"
							});
							
							if(currentScope.access.getCIProviders) {
								getProviderRecipes(currentScope, {
									'provider': oneProvider.provider,
									'owner': oneProvider.owner
								}, function (providerRecipes) {
									
									currentScope.providerRecipes = providerRecipes[oneProvider.provider];
									var recipesGroup = {
										"type": "accordion",
										"name": "providerRecipes",
										"label": "Available " + oneProvider.provider + " Recipes",
										"collapsed": true,
										"entries": [
											{
												"type": "html",
												"value": "<div id='recipebuttons' class='table w-100 c-both'></div>"
											}
										],
										"fieldMsg": "The following Recipes are available at <b>" + oneProvider.provider + "</b>, and might be compatible to run the build of your repository code."
									};
									var recipes = [];
									providerRecipes[oneProvider.provider].forEach(function (oneRecipe) {
										recipes.push({
											"type": "html",
											"value": "<a id='recipe" + oneRecipe._id.toString() + "' class='btn btn-default recipeButtons' tooltip='Click to Download Recipe'>" + oneRecipe.name +
											"<span class='f-right' style='top:0;'>&nbsp;Download</span>" +
											"<span class='icon icon-download3 f-right'></span>" +
											"</a>",
											"onAction": function (id, data, form) {
												currentScope.downloadRecipe(oneRecipe._id);
												return false;
											}
										});
									});
									
									recipesGroup.entries = recipesGroup.entries.concat(recipes);
									formConfig.entries.push(recipesGroup);
									if(currentScope.access.getCIRepoCustomRecipe){
										getRepoRecipeFromBranch(currentScope, gitAccount, oneProvider, oneRepo, providerRecipes, function (branchInput) {
											formConfig.entries.push({
												"type": "accordion",
												"name": "repoRecipe",
												"label": "Repository Recipe",
												"entries": [branchInput]
											});
											
											var options = {
												timeout: $timeout,
												entries: formConfig.entries,
												name: 'repoSettings',
												data: response.settings,
												actions: [
													{
														type: 'submit',
														label: "Update Settings",
														btn: 'primary',
														action: function (formData) {
															var data = {
																"port": (mydomainport || 80)
															};
															data.port = data.port.toString();
															switch(oneProvider.provider){
																case 'travis':
																	data.settings = {
																		"build_pull_requests": formData.build_pull_requests,
																		"build_pushes": formData.build_pushes,
																		"builds_only_with_travis_yml": formData.builds_only_with_travis_yml,
																		"maximum_number_of_builds": formData.maximum_number_of_builds
																	};
																	break;
																case 'drone':
																	data.settings = {
																		"allow_push": formData.allow_push,
																		"allow_pr": formData.allow_pr,
																		"allow_tags": formData.allow_tags,
																		"allow_tag": formData.allow_tag,
																		"allow_deploys": formData.allow_deploys,
																		"allow_deploy": formData.allow_deploys,
																		"gated": formData.gated
																	};
																	response.settings.repoCiId = response.settings.full_name;
																	break;
															}
															
															data.variables = [];
															for (var i = 0; i < count; i++) {
																if (formData['envName' + i]
																&& !oneProvider.variables[formData['envName' + i]]) {
																	data.variables.push({
																		name : formData['envName' + i] ,
																		value: formData['envVal' + i],
																		public: formData['envType' + i]
																	})
																}
															}
															
															if (currentScope.access.updateCIRepoSettings) {
																overlayLoading.show();
																getSendDataFromServer(currentScope, ngDataApi, {
																	method: 'put',
																	routeName: '/dashboard/ci/settings',
																	params: {
																		'id': response.settings.repoCiId,
																		"provider": oneProvider.provider,
																		"owner": oneProvider.owner
																	},
																	data: data
																}, function (error, response) {
																	overlayLoading.hide();
																	if (error) {
																		currentScope.displayAlert('danger', error.message);
																	}
																	else {
																		currentScope.displayAlert('success', 'Repository Settings Updated.');
																		currentScope.form.formData = {};
																		currentScope.showCIConfigForm(oneProvider);
																	}
																});
															}
															else {
																currentScope.displayAlert('danger', "You Do not have access to update the Repo CI Settings.");
															}
														}
													}
												]
											};
											
											if (currentScope.providerRecipes.length > 0) {
												if (currentScope.access.downloadCDScript) {
													options.actions.unshift({
														"type": "button",
														"label": "Download CD Script",
														"btn": "success",
														"action": function () {
															if (currentScope.myBrowser === 'safari') {
																$window.alert("The Downloader is not compatible with Safari, please choose another browser.");
																return null;
															}
															
															overlayLoading.show();
															getSendDataFromServer(currentScope, ngDataApi, {
																method: 'get',
																routeName: '/dashboard/ci/script/download',
																headers: {
																	"Accept": "application/zip"
																},
																responseType: 'arraybuffer',
																params: {
																	'provider': oneProvider.provider
																}
															}, function (error, response) {
																overlayLoading.hide();
																if (error) {
																	currentScope.displayAlert('danger', error.message);
																}
																else {
																	openSaveAsDialog("soajs.cd.zip", response, "application/zip");
																}
															});
														}
													});
												}
												else {
													currentScope.displayAlert('danger', "You do not have access to download the CD Script.");
												}
											}
											
											buildForm(currentScope, null, options, function () {
											
											});
										});
									}
									else{
										currentScope.displayAlert('danger', "You do not have access to retrieve the CI Configuration Recipe of this Repo.");
									}
								});
							}
							else{
								currentScope.displayAlert('danger', "You do not have access to retrieve the CI Providers of this Repo.");
							}
						}
					});
				});
			}, 500);
		};

		currentScope.cdShowHide = function (oneSrv, name) {
			if (currentScope.cdConfiguration[oneSrv].icon === 'minus') {
				currentScope.cdConfiguration[oneSrv].icon = 'plus';
				jQuery('#cdc_' + name).slideUp();
			}
			else {
				currentScope.cdConfiguration[oneSrv].icon = 'minus';
				jQuery('#cdc_' + name).slideDown()
			}
		};
		
		currentScope.getCIRecipe = function(){
			getCIRecipe(currentScope, function(){
			
			});
		};
		
		currentScope.downloadRecipe = function(oneRecipeId){
			if(currentScope.access.downloadCIRecipe){
				downloadProviderRecipe(currentScope, oneRecipeId);
			}
			else{
				currentScope.displayAlert('danger', "You Do not have access to download a CI Recipe.");
			}
		};
		
		currentScope.refreshBuildInformation = function(oneProvider, branch){
			getRepoCIBuildDetails(currentScope, currentScope.myCurrentRepo, oneProvider, ()=> {
				oneProvider.repoBuildHistory[branch].hide = false;
			});
		};
		
		if(!currentScope.access.getCIAccountInfo){
			currentScope.displayAlert('danger', "You Do not have access to retrieve CI Account information.");
		}
		else{
			getCIRecipe(currentScope, gitAccount, function(ciProviders){
				currentScope.ciProviders = ciProviders;
				if(ciProviders.length> 0){
					currentScope.showCIConfigForm(ciProviders[0]);
				}
				else{
					currentScope.showCIConfigForm(null);
				}
			});
		}
	}
	
	function fancyTimeFormat( time ) {
		// Hours, minutes and seconds
		var hrs = Math.floor(time / 3600);
		var mins = Math.floor((time % 3600) / 60);
		var secs = time % 60;
		
		// Output like "1:01" or "4:03:59" or "123:03:59"
		var ret = "";
		
		if (hrs > 0) {
			ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
		}
		
		ret += "" + mins + " min, " + (secs < 10 ? "0" : "");
		ret += "" + secs + " sec";
		return ret;
	}
	
	function getRepoCIBuildDetails(currentScope, repo, oneProvider, cb){
		if(!oneProvider.repoBuildHistory){
			oneProvider.repoBuildHistory = {};
		}
		
		if(!cb || typeof(cb) !== 'function'){
			overlayLoading.show();
		}
		
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci/repo/builds',
			params: {
				'repo': repo.full_name,
				"provider": oneProvider.provider,
				"owner": oneProvider.owner
			}
		}, function (error, response) {
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error.message);
			} else {
				if(!cb || typeof(cb) !== 'function'){
					overlayLoading.hide();
				}
				delete response.soajsauth;
				
				oneProvider.repoBuildHistory = response;
				
				if(Object.keys(oneProvider.repoBuildHistory).length === 0){
					delete oneProvider.repoBuildHistory;
				}
				
				for( let branch in oneProvider.repoBuildHistory){
					oneProvider.repoBuildHistory[branch].hide = true;
					
					if(typeof(oneProvider.repoBuildHistory[branch].config) === 'object'){
						oneProvider.repoBuildHistory[branch].config = JSON.stringify(oneProvider.repoBuildHistory[branch].config, null, 2);
					}
					oneProvider.repoBuildHistory[branch].duration = fancyTimeFormat(oneProvider.repoBuildHistory[branch].duration);
					
					if(!oneProvider.repoBuildHistory[branch].config || oneProvider.repoBuildHistory[branch].config === ''){
						getRepoCIremoteRecipe(currentScope, {
							provider: oneProvider.provider,
							repo: repo.name,
							owner: oneProvider.owner,
							branch
						}, (config) =>{
							oneProvider.repoBuildHistory[branch].config = config.file;
						});
					}
				}
				
				if(cb && typeof cb === 'function'){
					return cb();
				}
			}
		});
	}
	
	function downloadProviderRecipe(currentScope, oneRecipeId){
		if(currentScope.myBrowser === 'safari'){
			$window.alert("The Downloader is not compatible with Safari, please choose another browser.");
			return null;
		}
		
		currentScope.providerRecipes.forEach(function(myRecipe){
			if(myRecipe._id.toString() === oneRecipeId.toString()){
				overlayLoading.show();
				getSendDataFromServer(currentScope, ngDataApi, {
					method: 'get',
					routeName: '/dashboard/ci/recipe/download',
					headers: {
						"Accept": "application/zip"
					},
					responseType: 'arraybuffer',
					params: {
						'id': oneRecipeId.toString()
					}
				}, function (error, response) {
					overlayLoading.hide();
					if (error) {
						currentScope.displayAlert('danger', error.message);
					}
					else {
						openSaveAsDialog(myRecipe.name + ".zip", response, "application/zip");
					}
				});
			}
		});
	}
	
	function getRepoRecipeFromBranch(currentScope, gitAccount, provider, repo, providerRecipes, cb){
		getServiceBranches(currentScope, {
			gitAccount: gitAccount,
			repo: repo,
			cd:false
		}, function(gitBranchResponse){
			var newInput = {
				'name': 'branch',
				'label': 'Branch',
				'type': 'select',
				'value': [],
				'fieldMsg': 'Select a branch from your repository to load the associated Continuous Integration Recipe.',
				'onAction': function(id, data, form){
					getRepoCIremoteRecipe(currentScope, {
						provider: provider.provider,
						owner: gitAccount.owner,
						repo: repo.name,
						branch: data
					}, function(response){
						var fileContent, fileSHA, message;
						var type = "warning";
						
						if(response && response.sha){
							fileContent = response.file;
							fileSHA = response.sha;
							message = "The Recipe in your repository is custom made and does not match any of the provider's recipes.";
							providerRecipes[provider.provider].forEach(function(oneRecipe){
								if(oneRecipe.sha === fileSHA){
									message = "The Recipe in your repository matches the provider's recipe named [ " + oneRecipe.name + " ].";
									type = "info";
								}
							});
						}
						else{
							message = "No Recipe found in your repository, you can download any of the above recipes from the provider's.";
						}
						
						var customRecipe = {
							_id: "custom",
							provider: provider.provider,
							name: "Custom Recipe Detected",
							sha: fileSHA,
							recipe: fileContent
						};
						
						var match = false;
						providerRecipes[provider.provider].forEach(function(recipes){
							if(recipes._id === customRecipe._id){
								recipes = customRecipe;
								match = true;
							}
						});
						
						if(!match){
							providerRecipes[provider.provider].push(customRecipe);
						}
						
						message = "<alert class='w100 c-both' type='" + type + "'><span>" + message + "</span>";
						if(response && response.sha){
							message += "<a class='btn btn-default f-right' onclick='expandCustomRecipeContent(); return false;' id='customRepoRecipeContentBTN' style='position: relative; top: -6px;'>Show Recipe Content</a>";
						}
						message += "</alert><br />";
						
						if(response && response.sha){
							message +=  "<div><pre id='customRepoRecipeContent' style='width:100%; display:none;'><code class='yaml' >" + fileContent + "</code></pre></div>";
						}
						
						form.entries.forEach(function(oneFormEntry){
							if(oneFormEntry.type === 'accordion' && oneFormEntry.name === 'repoRecipe'){
								var divExists = false;
								oneFormEntry.entries.forEach(function(oneSubEntry){
									if(oneSubEntry.name === 'repoRecipeBranchAnswer'){
										divExists = true;
									}
								});
								if(!divExists){
									oneFormEntry.entries.push({
										"type": "html",
										"name": "repoRecipeBranchAnswer",
										"value": "<br /><div id='repoRecipeBranchAnswer'></div>"
									});
								}
								
								$timeout(function(){
									var ele = angular.element(document.getElementById('repoRecipeBranchAnswer'));
									ele.html(message);
									$compile(ele.contents())(currentScope);
								}, 700);
							}
						});
					});
				}
			};
			gitBranchResponse.branches.forEach(function (oneBranch) {
				delete oneBranch.commit.url;
				newInput.value.push({'v': oneBranch.name, 'l': oneBranch.name});
			});
			
			return cb(newInput);
		});
	}
	
	function getProviderRecipes(currentScope, opts, cb){
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci/providers',
			params: {
				'provider': opts.provider,
				"owner": opts.owner
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				return cb(response);
			}
		});
	}
	
	function getRepoCIremoteRecipe(currentScope, opts, cb){
		// overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci/repo/remote/config',
			params: {
				'provider': opts.provider,
				"repo": opts.repo,
				"owner": opts.owner,
				"branch": opts.branch
			}
		}, function (error, response) {
			// overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				return cb(response);
			}
		});
	}
	
	function getCIRecipe(currentScope, gitAccount, cb) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci',
			params: {
				'port': (mydomainport || '80'),
				"variables": true,
				"owner": gitAccount.owner
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				var output = [];
				response.forEach(function(oneAccount){
					if(oneAccount.provider){
						output.push(oneAccount);
					}
				});
				if( cb && typeof cb === 'function'){
					return cb(output);
				}
			}
		});
	}
	
	function toggleStatus(currentScope, status, oneRepo, provider, cb) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci/status',
			params: {
				'id': oneRepo.full_name,
				'enable': status,
				'owner': provider.owner,
				'provider': provider.provider
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				var statusL = (status) ? 'Enabled' : 'Disabled';
				currentScope.displayAlert('success', 'Recipe ' + statusL + ' successfully');
				return cb();
			}
		});
	}
	
	function getServiceBranches(currentScope, opts, cb) {
		currentScope.loadingBranches = true;
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/gitAccounts/getBranches',
			params: {
				'id': opts.gitAccount._id,
				'provider': opts.gitAccount.provider,
				'name': opts.repo.full_name,
				'type': 'repo'
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				if(opts.cd){
					currentScope.branches = response.branches;
				}
			}
			if(opts.cd){
				currentScope.loadingBranches = false;
				cb();
			}
			else{
				return cb(response);
			}
		});
	}
	
	return {
		"getCIRecipe": getCIRecipe,
		"configureRepo": configureRepo
	}
}]);

function expandRecipeContent(elId){
	var cssProp = jQuery('#', elId).css('display');
	if(cssProp === 'none'){
		jQuery('#e_' + elId).slideDown();
		// jQuery('#customRepoRecipeContentBTN').html('Hide Recipe Content');
		jQuery('#e_'+ elId + ' code').each(function(i, block) {
			hljs.highlightBlock(block);
		});
	}
	else{
		jQuery('#' + elId).slideUp();
		// jQuery('#customRepoRecipeContentBTN').html('Show Recipe Content');
	}
	
}

function expandCustomRecipeContent(){
	var cssProp = jQuery('#customRepoRecipeContent').css('display');
	if(cssProp === 'none'){
		jQuery('#customRepoRecipeContent').slideDown();
		jQuery('#customRepoRecipeContentBTN').html('Hide Recipe Content');
		jQuery('#customRepoRecipeContent code').each(function(i, block) {
			hljs.highlightBlock(block);
		});
	}
	else{
		jQuery('#customRepoRecipeContent').slideUp();
		jQuery('#customRepoRecipeContentBTN').html('Show Recipe Content');
	}
}