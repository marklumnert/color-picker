var core = {
  "start": function () {
    core.load();
  },
  "install": function () {
    core.load();
  },
  "load": function () {
    app.interface.id = '';
    const context = config.interface.context;
    const url = app.interface.path + '?' + context;
    /*  */
    app.button.popup(context === "popup" ? url : '');
    /*  */
    app.contextmenu.create({
      "id": "tab", 
      "type": "radio", 
      "title": "Open in tab",  
      "checked": context === "tab",
      "contexts": ["browser_action"],
    }, app.error);
    /*  */
    app.contextmenu.create({
      "id": "win", 
      "type": "radio", 
      "title": "Open in win",  
      "checked": context === "win",
      "contexts": ["browser_action"],
    }, app.error);
    /*  */
    app.contextmenu.create({
      "id": "popup", 
      "type": "radio", 
      "title": "Open in popup",  
      "checked": context === "popup",
      "contexts": ["browser_action"],
    }, app.error);
  },
  "action": {
    "storage": function (changes, namespace) {
      /*  */
    },
    "window": {
      "removed": function (e) {
        if (e === app.interface.id) {
          app.interface.id = '';
        }
      }
    },
    "contextmenu": function (e) {
      app.interface.close(config.interface.context);
      config.interface.context = e.menuItemId;
      /*  */
      const context = config.interface.context;
      const url = app.interface.path + '?' + context;
      app.button.popup(context === "popup" ? url : '');
    },
    "button": function () {
      const context = config.interface.context;
      const url = app.interface.path + '?' + context;
      /*  */
      if (context === "popup") {
        app.button.popup(url);
      } else {
        if (app.interface.id) {
          if (context === "tab") {
            app.tab.get(app.interface.id, function (tab) {
              if (tab) {
                app.tab.update(app.interface.id, {"active": true});
              } else {
                app.interface.id = '';
                app.tab.open(url);
              }
            });
          }
          /*  */
          if (context === "win") {
            app.window.get(app.interface.id, function (win) {
              if (win) {
                app.window.update(app.interface.id, {"focused": true});
              } else {
                app.interface.id = '';
                app.interface.create();
              }
            });
          }
        } else {
          if (context === "tab") app.tab.open(url);
          if (context === "win") app.interface.create(url);
        }
      }
    }
  }
};

app.button.on.clicked(core.action.button);
app.window.on.removed(core.action.window.removed);
app.contextmenu.on.clicked(core.action.contextmenu);

app.on.startup(core.start);
app.on.installed(core.install);
app.on.storage(core.action.storage);
