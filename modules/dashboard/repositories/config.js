var repositoriesAppConfig = {
	'form': {
		settings: {
			entries: [
				{
					'name': 'general',
					'label': "General Settings",
					"type": "accordion",
					"entries": [
					
					]
				},
				{
					'name': 'envs',
					'label': 'SOAJS Environment Variables',
					'type': 'accordion',
					'entries': [],
					'collapsed': true
				},
				{
					'name': 'customEnvs',
					'label': 'Custom Environment Variables',
					'type': 'accordion',
					'entries': []
				},
				{
					'name': 'envs',
					'label': 'Other Environment Variables',
					'type': 'accordion',
					'entries': []
				}
			]
		},
		envVar: [
			{
				'name': 'envName%count%',
				'label': 'Name',
				'type': 'text',
				'placeholder': 'MY_ENV',
				'required': true
			},
			{
				'name': 'envVal%count%',
				'label': 'Value',
				'type': 'text',
				'placeholder': 'FOO',
				'required': true
			},
			{
				'name': 'envType%count%',
				'label': 'Public',
				'type': 'buttonSlider',
				"value": false,
				'required': true,
				'tooltip': "Enable/Disable showing value in build log"
			},
			{
				"name": "removeEnv%count%",
				"type": "html",
				"value": "<span class='red'><span class='icon icon-cross' title='Remove'></span></span>",
				"onAction": function (id, data, form) {
					var number = id.replace("removeEnv", "");
					// need to decrease count
					delete form.formData['envName' + number];
					delete form.formData['envVal' + number];
					
					form.entries.forEach(function (oneEntry) {
						if (oneEntry.type === 'accordion' && oneEntry.name === 'envs') {
							for (var i = oneEntry.entries.length - 1; i >= 0; i--) {
								if (oneEntry.entries[i].name === 'envName' + number) {
									oneEntry.entries.splice(i, 1);
								}
								else if (oneEntry.entries[i].name === 'envVal' + number) {
									oneEntry.entries.splice(i, 1);
								}
								else if (oneEntry.entries[i].name === 'envType' + number) {
									oneEntry.entries.splice(i, 1);
								}
								else if (oneEntry.entries[i].name === 'removeEnv' + number) {
									oneEntry.entries.splice(i, 1);
								}
							}
						}
					});
				}
			}
		],
		cd: {
			entries: [
				{
					'name': 'cd',
					'label': 'Continuous Delivery Strategy',
					'type': 'jsoneditor',
					'required': true,
					'height': "300px",
					'fixedHeight': true,
					'fieldMsg': "Provide an optional Continuous Delivery Update strategy for each environment."
				}
			]
		},
	},
	
	providers:{
		travis: [
			{
				'name': 'builds_only_with_travis_yml',
				'label': 'Build only if .travis.yml is present',
				'type': 'radio',
				'value': [{'v': true, 'l': 'Yes'}, {'v': false, 'l': 'No'}],
				'required': true
			},
			{
				'name': 'build_pushes',
				'label': 'Build branch updates',
				'type': 'radio',
				'value': [{'v': true, 'l': 'Yes'}, {'v': false, 'l': 'No'}],
				'required': true
			},
			{
				'name': 'build_pull_requests',
				'label': 'Build pull request updates',
				'type': 'radio',
				'value': [{'v': true, 'l': 'Yes'}, {'v': false, 'l': 'No'}],
				'required': true
			},
			{
				'name': 'maximum_number_of_builds',
				'label': 'Limit concurent jobs to a maximum of',
				'type': 'number',
				'value': 0,
				'required': false
			},
		],
		drone: [
			{
				'name': 'allow_push',
				'label': 'Push Hooks',
				'type': 'radio',
				'value': [{'v': true, 'l': 'Yes'}, {'v': false, 'l': 'No'}],
				'required': true
			},
			{
				'name': 'allow_pr',
				'label': 'Pull Request Hooks',
				'type': 'radio',
				'value': [{'v': true, 'l': 'Yes'}, {'v': false, 'l': 'No'}],
				'required': true
			},
			{
				'name': 'allow_tags',
				'label': 'Tag Hooks',
				'type': 'radio',
				'value': [{'v': true, 'l': 'Yes'}, {'v': false, 'l': 'No'}],
				'required': true
			},
			{
				'name': 'allow_deploys',
				'label': 'Deploy Hook',
				'type': 'radio',
				'value': [{'v': true, 'l': 'Yes'}, {'v': false, 'l': 'No'}],
				'required': true
			},
			{
				'name': 'gated',
				'label': 'Gated',
				'type': 'radio',
				'value': [{'v': true, 'l': 'Yes'}, {'v': false, 'l': 'No'}],
				'required': true
			}
			
		]
	},
	
	'permissions': {
	
		activateRepo: ['repositories', '/git/repo/activate', 'put'],
		activateBranch: ['repositories', '/git/branch/activate', 'put'],
		activateTag: ['repositories', '/git/repo/activate', 'put'],
		deactivateRepo: ['repositories', '/git/repo/deactivate', 'put'],
		deactivateBranch: ['repositories', '/git/branch/deactivate', 'put'],
		deactivateTag: ['repositories', '/git/tag/deactivate', 'put'],
		syncRepo: ['repositories', '/git/sync/repository', 'put'],
		syncRepoBranches: ['repositories', '/git/sync/branch', 'put'],
		searchRepos: ['repositories', '/git/repos', 'get'],
		getBranches: ['repositories', '/git/branches', 'get'],
		
		//ci
		getCIRepoSettings: ['dashboard', '/ci/settings', 'get'],
		updateCIRepoSettings: ['dashboard', '/ci/settings', 'put'],
		
		downloadCDScript: ['dashboard', '/ci/script/download', 'get'],
		downloadCIRecipe: ['dashboard', '/ci/recipe/download', 'get'],
		
		
		getCIProviders: ['dashboard', '/ci/providers', 'get'],
		getCIRepoCustomRecipe: ['dashboard', '/ci/repo/remote/config', 'get'],
		
		getCIAccountInfo: ['dashboard', '/ci', 'get'],
		enableDisableCIRepo: ['dashboard', '/ci/status', 'get'],
	}
};
