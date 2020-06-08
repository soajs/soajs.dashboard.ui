'use strict';
var gaTranslation = {
    repositories: {
        ENG: "Repositories",
        FRA: "Repositories"
    },
	gitRepositories: {
		ENG: "Git Repositories",
		FRA: "Git Repositories"
	},
	theFollowingModulesWereAdded: {
		ENG: "The following modules were added:",
		FRA: "The following modules were added:"
	},
};

for (var attrname in gaTranslation) {
    translation[attrname] = gaTranslation[attrname];
}

var gitAccountsNav = [
    {
        'id': 'git-repositories',
        'label': translation.gitRepositories[LANG],
        'checkPermission': {
            'service': 'repositories',
            'route': '/git/repos',
            'method': 'get'
        },
        'url': '#/gitRepositories',
        'tplPath': 'modules/dashboard/repositories/directives/list.tmpl',
        'icon': 'git',
        'pillar': {
            'name': 'development',
            'label': translation.develop[LANG],
            'position': 4
        },
        'mainMenu': true,
        'tracker': true,
        'order': 4,
        'scripts': ['modules/dashboard/repositories/config.js', 'modules/dashboard/repositories/controller.js', 'modules/dashboard/repositories/services.js'],
        'ancestor': [translation.home[LANG]]
    }
];
navigation = navigation.concat(gitAccountsNav);
