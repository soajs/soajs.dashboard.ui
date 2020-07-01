let gitAccManagementConfig = {
	'form': {
		'login': {
			'entries': [
				{
					'name': 'provider',
					'label': translation.accountProvider[LANG],
					'type': 'select',
					'value': [{'v': 'github', 'l': 'GitHub'}, {'v': 'bitbucket', 'l': 'Bitbucket'}, {'v': 'bitbucket_enterprise', 'l': 'Bitbucket Enterprise'}],
					'tooltip': translation.chooseAccountProvider[LANG],
					'required': true,
					'onAction': function (id, selected, form) {
						if (selected === 'github') {
							form.entries[1].value = 'github.com';
							form.entries[1].type = 'readonly';
							
							form.entries[5].label = 'Username';
							
						}
						else {
							
							if (selected === 'bitbucket') {
								form.entries[1].value = 'bitbucket.org';
								form.entries[1].type = 'readonly';
								
								form.entries[5].label = 'Email Address';
							}
							else if (selected === 'bitbucket_enterprise') {
								form.entries[1].value = ' ';
								form.entries[1].type = 'text';
								
								form.entries[5].label = 'Username';
							}
						}
						form.entries = form.entries.slice(0, 6);
						form.refresh();
					}
				},
				{
					'name': 'providerDomain',
					'label': 'Provider Domain',
					'type': 'text',
					'value': '',
					'required': true
				},
				{
					'name': 'accountType',
					'label': 'Account Type',
					'type': 'radio',
					'class': 'accountType',
					'value': [
						{'v': 'personal', 'l': 'Personal Account', 'selected': true},
						{'v': 'organization', 'l': 'Organization Account'}
					],
					'required': true,
				},
				{
					'name': 'type',
					'label': 'Access Type',
					'class': 'accessType',
					'type': 'radio',
					'value': [
						{'v': 'public', 'l': 'Public Repositories', 'selected': true},
						{'v': 'private', 'l': 'Public and Private Repositories'}
					],
					'required': true,
					onAction: function (label, selected, formConfig) {
						if (selected === 'private') {
							if (!formConfig.entries[6] || (formConfig.entries[6] && formConfig.entries[6].name !== 'token')) {
								let password = {
									'name': 'token',
									'label': 'Personal Token',
									'type': 'text',
									'value': '',
									'tooltip': 'Account Personal Token',
									'placeholder': 'Your Personal Token',
									'required': true
								};
								formConfig.entries.splice(6, 0, password);
							}
							
							let currentProvider;
							for (let i =0; i < formConfig.entries[0].value.length; i++) {
								if (formConfig.entries[0].value[i].selected) {
									currentProvider = formConfig.entries[0].value[i];
								}
							}
							if (currentProvider && currentProvider.v === 'bitbucket' && !formConfig.entries[8] && !formConfig.entries[9]) {
								let oauth = [
									{
										'name': 'oauthKey',
										'label': 'OAuth 2.0 Consumer Key',
										'type': 'text',
										'value': '',
										'placeholder': 'OAuth consumer key generated using Bitbucket account settings',
										'required': true
									},
									{
										'name': 'oauthSecret',
										'label': 'OAuth 2.0 Consumer Secret',
										'type': 'text',
										'value': '',
										'placeholder': 'OAuth consumer secret generated using Bitbucket account settings',
										'required': true
									},
									{
										"name": "bitbucketMessage",
										"type": "html",
										"value": "<br><p><b>In order to generate OAuth consumer key/secret, follow the following steps:</b><br><ul><li>Login to your bitbucket account, go to Bitbucket Settings > OAuth</li><li>Under OAuth consumers section, click on Add consumer and fill in the required information</li><li>Make sure you grant this consumer permission to: [repositories - read] and [account - read] </li><li>Finally, grab the generated key and secret and use them to login to SOAJS Git app using your bitbucket account</li></ul></p>"
									}
								];
								formConfig.entries.splice(7, 0, oauth[0], oauth[1], oauth[2]);
							}
							else if (currentProvider && currentProvider.v === 'github') {
								let githubMessage = {
									"name": "tokenMessage",
									"type": "html",
									"value": "<br><p><b>In order to generate Personal Token, follow the following steps:</b><br><ul><li>Login to your Github account, go to Github Settings > Developer Options</li><li>Under Developer Options section, click on Personal access tokens >  Generate new token</li><li>Make sure you grant this token scope permission to: repo -  Full control of private repositories </li><li>Finally, grab the generated personal and use them to login to SOAJS Git app using your Github account</li></ul></p>"
								};
								formConfig.entries.splice(7, 1, githubMessage);
							}
						}
						else {
							
							if (formConfig.entries[9] && formConfig.entries[9].name === 'bitbucketMessage') {
								formConfig.entries.splice(9, 1);
							}
							if (formConfig.entries[8] && formConfig.entries[8].name === 'oauthSecret') {
								formConfig.entries.splice(8, 1);
							}
							if (formConfig.entries[7] && formConfig.entries[7].name === 'oauthKey' || formConfig.entries[7] && formConfig.entries[7].name === 'tokenMessage' ) {
								formConfig.entries.splice(7, 1);
							}
							if (formConfig.entries[6] && formConfig.entries[6].name === 'password') {
								formConfig.entries.splice(6, 1);
							}
						}
					}
				},
				{
					'name': 'label',
					'label': translation.accountLabel[LANG],
					'type': 'text',
					'value': '',
					'tooltip': translation.chooseAccountName[LANG],
					'placeholder': translation.exampleMyAccount[LANG],
					'required': true
				},
				{
					'name': 'username',
					'label': translation.username[LANG],
					'type': 'text',
					'value': '',
					'placeholder': translation.yourUsername[LANG],
					'required': true
				}
			]
		},
		'upgrade': {
			'github' : {
				'entries': [
					{
						'name': 'token',
						'label': 'Personal Token',
						'type': 'text',
						'value': '',
						'tooltip': 'Account Personal Token',
						'placeholder': 'Your Personal Token',
						'required': true
					},
					{
						"name": "tokenMessage",
						"type": "html",
						"value": "<br><p><b>In order to generate Personal Token, follow the following steps:</b><br><ul><li>Login to your Github account, go to Github Settings > Developer Options</li><li>Under Developer Options section, click on Personal access tokens >  Generate new token</li><li>Make sure you grant this token scope permission to: repo -  Full control of private repositories </li><li>Finally, grab the generated personal and use them to login to SOAJS Git app using your Github account</li></ul></p>"
					}
				]
			},
			'bitbucket' : {
				'entries': [
					{
						'name': 'password',
						'label': translation.pleaseProvidePassword[LANG],
						'type': 'password',
						'value': '',
						'placeholder': translation.gitPassword[LANG],
						'required': true
					},
					{
						'name': 'oauthKey',
						'label': 'OAuth 2.0 Consumer Key',
						'type': 'text',
						'value': '',
						'placeholder': 'OAuth consumer key generated using Bitbucket account settings',
						'required': true
					},
					{
						'name': 'oauthSecret',
						'label': 'OAuth 2.0 Consumer Secret',
						'type': 'text',
						'value': '',
						'placeholder': 'OAuth consumer secret generated using Bitbucket account settings',
						'required': true
					},
					{
						"name": "bitbucketMessage",
						"type": "html",
						"value": "<br><p><b>In order to generate OAuth consumer key/secret, follow the following steps:</b><br><ul><li>Login to your bitbucket account, go to Bitbucket Settings > OAuth</li><li>Under OAuth consumers section, click on Add consumer and fill in the required information</li><li>Make sure you grant this consumer permission to: [repositories - read] and [account - read] </li><li>Finally, grab the generated key and secret and use them to login to SOAJS Git app using your bitbucket account</li></ul></p>"
					}
				]
			},
			'bitbucket_enterprise' : {
				'entries': [
					{
						'name': 'password',
						'label': translation.pleaseProvidePassword[LANG],
						'type': 'password',
						'value': '',
						'placeholder': translation.gitPassword[LANG],
						'required': true
					}
				]
			}
		}
	},
	
	'permissions': {
		listAccounts: ['repositories', '/git/account', 'get'],
		login: ['repositories', '/git/account', 'post'],
		logout: ['repositories', '/git/account', 'delete'],
		upgrade: ['repositories', '/git/account', 'delete'],
		sync: ['repositories', '/git/sync/account', 'delete']
	}
};
