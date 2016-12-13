# soajs.dash.example

The following repository contains a sample module and a sample service created on top of SOAJS and its Dashboard UI.

---

##Installation

```sh
$ npm install soajs.dash.example
```

---

##Starting the service

```sh
$ cd soajs.dash.example/services/
$ node.
```

---

##Starting the UI module

* Copy soajs.dash.example/ui/modules/myModule to soajs.dashboard/ui/modules/
* Edit soajs.dashboard/ui/index.html and provide the path to soajs.dashboard/ui/modules/install.js
* Update the ACL to include myService in its configuration
* Logout/Login and the module will be located and accessible from your Main Menu.