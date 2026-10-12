var config  = {
  "clipboard": '',
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "notifications": {
    "instance": null,
    "create": function (message, type) {
      const saved = config.storage.read("notify-timeout");
      const timeout = Math.max(1, Math.min(20, parseInt(saved) || 5));
      config.notifications.instance = config.notifications.instance || new Notify();
      config.notifications.instance.display(message, type || "info", timeout * 1000);
    }
  },
  "copy": {
    "listener": function (e) {
      const selection = window.getSelection ? window.getSelection().toString() : '';
      if (selection) return;
      /*  */
      e.clipboardData.setData("text/plain", config.clipboard);
      e.preventDefault();
    },
    "clipboard": function () {
      navigator.clipboard.writeText(config.clipboard).catch(function () {
        document.execCommand("copy");
      });
    }
  },
  "resize": {
    "timeout": null,
    "method": function () {
      const context = document.documentElement.getAttribute("context");
      if (context === "win") {
        if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
        config.resize.timeout = window.setTimeout(async function () {
          let current = await chrome.windows.getCurrent();
          /*  */
          config.storage.write("interface.size", {
            "top": current.top,
            "left": current.left,
            "width": current.width,
            "height": current.height
          });
        }, 1000);
      }
    }
  },
  "update": function (color, persist) {
    if (color) {
      if (persist !== false) config.storage.write("color-picker-current", color);
      /*  */
      document.getElementById("picker").value = color;
      document.getElementById("picker").parentNode.style.backgroundColor = color;
      /*  */
      const details = document.getElementById("details");
      details.textContent = '';
      /*  */
      config.color.add.numeric.values(details, color, null, "HEX");
      config.color.add.numeric.values(details, color, "hex2hsb", "HSB");
      config.color.add.numeric.values(details, color, "hex2rgb", "RGB");
      config.color.add.numeric.values(details, color, "hex2hsl", "HSL");
      config.color.add.numeric.values(details, color, "hex2hwb", "HWB");
      config.color.add.numeric.values(details, color, "hex2cmyk", "CMYK");
      /*  */
      const block = config.sections.block("user");
      if (block && block.open && persist !== false) config.sections.fill(block, true);
    }
  },
  "storage": {
    "local": {},
    "read": function (id) {
      return config.storage.local[id];
    },
    "load": function (callback) {
      chrome.storage.local.get(null, function (e) {
        config.storage.local = e;
        callback();
      });
    },
    "write": function (id, data) {
      if (id) {
        if (data !== '' && data !== null && data !== undefined) {
          let tmp = {};
          tmp[id] = data;
          config.storage.local[id] = data;
          chrome.storage.local.set(tmp);
        } else {
          delete config.storage.local[id];
          chrome.storage.local.remove(id);
        }
      }
    }
  },
  "port": {
    "name": '',
    "connect": function () {
      config.port.name = "webapp";
      const context = document.documentElement.getAttribute("context");
      /*  */
      if (chrome.runtime) {
        if (chrome.runtime.connect) {
          if (context !== config.port.name) {
            if (document.location.search === "?tab") config.port.name = "tab";
            if (document.location.search === "?win") config.port.name = "win";
            if (document.location.search === "?popup") config.port.name = "popup";
            /*  */
            if (config.port.name === "popup") {
              document.documentElement.style.width = "790px";
              document.documentElement.style.height = "590px";
            }
            /*  */
            chrome.runtime.connect({"name": config.port.name});
          }
        }
      }
      /*  */
      document.documentElement.setAttribute("context", config.port.name);
    }
  },
  "pane": {
    "show": function (id) {
      document.querySelectorAll(".pane").forEach(p => {p.hidden = true});
      document.querySelector(".picker").hidden = true;
      document.getElementById(id).hidden = false;
    },
    "close": function () {
      document.querySelectorAll(".pane").forEach(p => {p.hidden = true});
      document.querySelector(".picker").hidden = false;
    }
  },
  "tiles": {
    "size": function (value) {
      let size = parseInt(value);
      if (isNaN(size) || size < 8) size = 8;
      if (size > 128) size = 128;
      /*  */
      document.documentElement.style.setProperty('--tile-height', size + "px");
      document.documentElement.style.setProperty('--tile-width', size + "px");
      return size;
    }
  },
  "palette": {
    "color": function (value) {
      return /^#[0-9a-f]{6}$/i.test(value);
    },
    "name": function (value) {
      const name = (value || '').trim();
      return name && name.length <= 40 && !/[\u0000-\u001f<>"'`]/.test(name) ? name : null;
    },
    "unique": function (name, ignore) {
      const map = config.palette.read();
      for (const key in map) {
        if (key.toLowerCase() === name.toLowerCase() && key !== ignore) return false;
      }
      return true;
    },
    "read": function () {
      const map = config.storage.read("palette-map");
      return map && typeof map === "object" && !Array.isArray(map) ? map : {};
    },
    "current": function () {
      const map = config.palette.read();
      const name = config.storage.read("palette-current");
      if (name && map[name] !== undefined) return name;
      for (const key in map) return key;
      return '';
    },
    "write": function (map, current) {
      config.storage.write("palette-map", map);
      config.storage.write("palette-current", current);
    },
    "add": function (color) {
      if (!color || !config.palette.color(color)) return;
      color = color.toLowerCase();
      const map = config.palette.read();
      let name = config.palette.current();
      if (!name) {
        name = "My colors";
        map[name] = [color];
      } else {
        const tmp = map[name] || [];
        if (tmp.includes(color)) return;
        tmp.push(color);
        /*
          user palette caps at 300
          oldest colors drop first
        */
        while (tmp.length > 300) tmp.shift();
        map[name] = tmp;
      }
      /*  */
      config.palette.write(map, name);
      config.sections.render();
    },
    "select": function () {
      const select = document.getElementById("palette-select");
      if (!select) return;
      /*  */
      const map = config.palette.read();
      const current = config.palette.current();
      select.textContent = '';
      /*  */
      for (const name in map) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        if (name === current) option.setAttribute("selected", true);
        select.appendChild(option);
      }
      /*  */
      if (!current) {
        const option = document.createElement("option");
        option.value = '';
        option.textContent = "(no palette)";
        option.setAttribute("selected", true);
        option.setAttribute("disabled", true);
        select.appendChild(option);
      }
    },
    "strip": function (container) {
      const select = document.createElement("select");
      select.id = "palette-select";
      select.setAttribute("title", "Select a palette");
      /*  */
      const result = {};
      result["new"] = function () {
        const name = config.palette.name(window.prompt("Name of the new palette"));
        const map = config.palette.read();
        if (!name) return;
        if (!config.palette.unique(name)) {
          config.notifications.create("A palette with this name already exists", "warning");
          return;
        }
        /*  */
        map[name] = [];
        config.palette.write(map, name);
        config.sections.render();
        config.notifications.create("The palette '" + name + "' is created");
      };
      /*  */
      result.rename = function () {
        const current = config.palette.current();
        const map = config.palette.read();
        if (!current) return;
        /*  */
        const name = config.palette.name(window.prompt("Rename the palette '" + current + "'", current));
        if (!name || name === current) return;
        /*  */
        if (!config.palette.unique(name, current)) {
          config.notifications.create("A palette with this name already exists", "warning");
          return;
        }
        /*  */
        const fresh = {};
        for (const key in map) {
          fresh[key === current ? name : key] = map[key];
        }
        /*  */
        config.palette.write(fresh, name);
        config.sections.render();
        config.notifications.create("The palette '" + name + "' is renamed");
      };
      /*  */
      result["delete"] = function () {
        const current = config.palette.current();
        const map = config.palette.read();
        /*  */
        if (!current) return;
        const action = window.confirm("Delete the palette '" + current + "' with all its colors?");
        if (action !== true) return;
        /*  */
        delete map[current];
        const rest = Object.keys(map);
        /*  */
        config.palette.write(map, rest.length ? rest[0] : '');
        config.sections.render();
        config.notifications.create("The palette '" + current + "' is deleted");
      };
      /*  */
      result.add = function () {
        const color = config.storage.read("color-picker-current");
        if (!color || !config.palette.color(color)) {
          config.notifications.create("Pick a color first, then add it to the palette", "warning");
          return;
        }
        /*  */
        const name = config.palette.current() || "My colors";
        const lowercase = color.toLowerCase();
        const existing = config.palette.read()[name] || [];
        if (existing.includes(lowercase)) {
          config.notifications.create("The color is already in '" + name + "'", "warning");
          return;
        }
        /*  */
        config.palette.add(color);
        config.notifications.create("The color is added to '" + config.palette.current() + "'");
      };
      /*  */
      select.addEventListener("change", function (e) {
        if (e.target.value) config.palette.write(config.palette.read(), e.target.value);
        config.sections.render();
      });
      /*  */
      const icons = config.icon;
      /*  */
      container.appendChild(select);
      container.appendChild(icons.button("palette", "New palette", result["new"]));
      container.appendChild(icons.button("plus", "Add the current color to this palette", result.add));
      container.appendChild(icons.button("edit", "Rename this palette", result.rename));
      container.appendChild(icons.button("trash", "Delete this palette", result["delete"]));
    }
  },
  "icon": {
    "set": {
      "chevron-up": {
        "size": 12,
        "viewBox": "0 0 32 32",
        "parts": [
          {
            "d": "M 31.340012,21.928592 27.767344,25.501258 16.022007,13.755922 4.27667,25.501258 0.704,21.928592 16.022007,6.6105862 Z"
          }
        ]
      },
      "chevron-down": {
        "size": 12,
        "viewBox": "0 0 32 32",
        "parts": [
          {
            "d": "M 31.340012,10.183252 27.767344,6.6105862 16.022007,18.355922 4.27667,6.6105862 0.704,10.183252 16.022007,25.501258 Z"
          }
        ]
      },
      "pick": {
        "size": 13,
        "viewBox": "0 0 48 48",
        "parts": [
          {
            "d": "M 35.906476,25.148906 12.562765,1.8051949 8.8679796,5.4999776 15.08253,11.714523 1.6481437,25.148906 C 0.12061846,26.676428 0.12061846,29.15703 1.6481437,30.684552 L 16.009483,45.045899 C 16.766726,45.816189 17.772016,46.194805 18.777306,46.194805 19.782607,46.194805 20.787897,45.816189 21.545129,45.045899 L 35.906476,30.684552 C 37.433998,29.15703 37.433998,26.676428 35.906476,25.148906 Z M 6.25683,27.916729 18.777306,15.40931 31.297794,27.916729 Z M 42.277691,31.833458 C 42.277691,31.833458 37.055382,37.486604 37.055382,40.972496 37.055382,43.857819 39.392368,46.194805 42.277691,46.194805 45.163014,46.194805 47.5,43.857819 47.5,40.972496 47.5,37.486604 42.277691,31.833458 42.277691,31.833458 Z"
          }
        ]
      },
      "palette": {
        "size": 14,
        "viewBox": "0 0 512 512",
        "parts": [
          {
            "d": "M425.705,86.587A238.427,238.427,0,0,0,256,16.292c-63.856,0-123.95,21.059-169.212,59.3C41.14,114.154,16,165.544,16,220.292c0,52.418,23.319,102.223,65.663,140.24,41.8,37.534,98.163,60.027,158.7,63.335a8.039,8.039,0,0,1,7.64,7.987V471.7a24.019,24.019,0,0,0,24.054,24q.873,0,1.747-.064a240.007,240.007,0,0,0,151.9-409.055ZM120,208a40,40,0,1,1,40-40A40,40,0,0,1,120,208Zm112-64a40,40,0,1,1,40-40A40,40,0,0,1,232,144Zm80-8a40,40,0,1,1,40,40A40,40,0,0,1,312,136Zm96,152a40,40,0,1,1,40-40A40,40,0,0,1,408,288Z"
          }
        ]
      },
      "edit": {
        "size": 15,
        "viewBox": "0 0 512 512",
        "parts": [
          {
            "d": "M 325.87552,65.922685 C 235.55415,156.24692 145.22984,246.56379 54.898669,336.89141 L 54.895441,336.89628 54.890562,336.89941 C 50.651898,341.1485 48.622304,346.80156 48.449738,352.23235 L 48.446485,352.35885 V 440.40472 C 48.437737,452.48561 58.407264,462.4504 70.484262,462.4504 H 165.36124 165.36279 C 171.33482,462.44803 176.81084,459.92055 180.79951,456.14069 L 180.87723,456.06788 180.95338,455.99178 C 270.12895,366.82623 359.29553,277.64794 448.45383,188.48972 L 448.67405,188.27105 448.87802,188.03146 C 461.40228,173.39903 461.42793,152.41631 448.53309,139.1552 L 448.49436,139.11471 375.29243,65.922685 C 359.76446,52.582145 339.16696,53.037343 325.87552,65.922685 Z M 350.57999,103.58006 410.79328,163.78683 381.2962,193.28547 321.08122,133.07217 Z M 289.90842,164.25311 350.12171,224.46641 156.22443,418.35718 H 92.530145 V 361.62321 Z"
          }
        ]
      },
      "trash": {
        "size": 12,
        "viewBox": "0 0 26 31",
        "parts": [
          {
            "d": "M23.524,5H19V0H7v5H2.476C0.946,5,0,5.939,0,7.468V9h26V7.468C26,5.939,25.053,5,23.524,5z M9,2h8v3H9V2z"
          },
          {
            "d": "M1.035,11l3.49,17.478C4.525,29.854,5.643,31,7.019,31H13h5.981c1.376,0,2.493-1.146,2.493-2.522L24.965,11 H13H1.035z"
          }
        ]
      },
      "remove": {
        "size": 10,
        "viewBox": "0 0 512 512",
        "parts": [
          {
            "x": 112.26851,
            "y": -28.276203,
            "width": 499.08917,
            "height": 65.118034,
            "transform": "matrix(1.0842783,0,0,1.0842783,-18.118477,-24.53228) rotate(45)"
          },
          {
            "y": 329.25357,
            "x": -245.26077,
            "width": 499.08716,
            "height": 65.118034,
            "transform": "matrix(1.0842783,0,0,1.0842783,-18.118477,-24.53228) matrix(-0.70710678,0.70710678,0.70710678,0.70710678,0,0)"
          }
        ]
      },
      "plus": {
        "size": 14,
        "viewBox": "0 0 122.8799 122.8799",
        "parts": [
          {
            "x": 2.498,
            "y": 54.916,
            "width": 117.37268,
            "height": 13.079653
          },
          {
            "x": 2.7702174,
            "y": -67.724174,
            "width": 117.37268,
            "height": 13.079653,
            "transform": "rotate(90)"
          }
        ]
      }
    },
    "make": function (name) {
      const spec = config.icon.set[name];
      const space = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      /*  */
      svg.setAttribute("width", spec.size);
      svg.setAttribute("height", spec.size);
      svg.setAttribute("viewBox", spec.viewBox);
      /*  */
      for (const part of spec.parts) {
        const kind = part.d ? "path" : "rect";
        const element = document.createElementNS(space, kind);
        /*  */
        for (const attribute in part) {
          element.setAttribute(attribute, part[attribute]);
        }
        /*  */
        svg.appendChild(element);
      }
      /*  */
      return svg;
    },
    "button": function (name, title, action) {
      const button = document.createElement("button");
      /*  */
      button.setAttribute("type", "button");
      button.setAttribute("title", title);
      button.appendChild(config.icon.make(name));
      button.addEventListener("click", action);
      /*  */
      return button;
    }
  },
  "sections": {
    "block": function (key) {
      return document.querySelector('details[key="' + key + '"]');
    },
    "visible": function () {
      const catalog = config.color.js.keys;
      const list = config.storage.read("sections-visible");
      /*  */
      if (!Array.isArray(list)) return catalog.slice(0);
      return list.filter(key => catalog.includes(key));
    },
    "state": function (block) {
      const key = block.getAttribute("key");
      const map = config.storage.read("section-open") || {};
      /*  */
      if (map[key] !== undefined) return map[key] === true;
      return true;
    },
    "order": function () {
      const visible = [];
      /*  */
      for (const block of document.querySelectorAll("#sections details")) {
        visible.push(block.getAttribute("key"));
      }
      /*  */
      config.storage.write("sections-visible", visible);
      config.settings.sync();
    },
    "list": function (key) {
      if (key === "user") {
        const map = config.palette.read();
        const list = map[config.palette.current()] || [];
        /*  */
        return Array.isArray(list) ? list : [];
      } else {
        const saved = config.storage.read("color-" + key + "-list");
        if (Array.isArray(saved)) return saved;
        /*  */
        return config.color.js.values[config.color.js.keys.indexOf(key)] || [];
      }
    },
    "fill": function (element, force) {
      const block = typeof element === "string" ? config.sections.block(element) : element;
      if (!block) return;
      /*  */
      const tiles = block.querySelector(".tiles");
      if (tiles.dataset.filled === "true" && force !== true) return;
      /*  */
      const key = block.getAttribute("key");
      const list = config.sections.list(key);
      let current;
      /*  */
      tiles.dataset.filled = "true";
      tiles.textContent = '';
      /*  */
      if (list.length) {
        const fragment = document.createDocumentFragment();
        current = key === "user" ? config.storage.read("color-picker-current") : config.storage.read("color-" + key + "-current");
        /*  */
        for (let i = 0; i < list.length; i++) {
          const input = document.createElement("input");
          input.style.backgroundColor = list[i];
          input.setAttribute("color", list[i]);
          input.setAttribute("title", list[i]);
          /*  */
          if (current && list[i].toLowerCase() === current.toLowerCase()) input.setAttribute("value", "✓");
          input.setAttribute("readonly", true);
          input.setAttribute("type", "text");
          input.addEventListener("click", function (e) {config.sections.pick(key, e.target.getAttribute("color"))});
          fragment.appendChild(input);
        }
        /*  */
        tiles.appendChild(fragment);
      } else {
        if (key === "user") {
          const span = document.createElement("span");
          /*  */
          span.className = "strip-hint";
          span.textContent = config.palette.current() ? "Palette is empty — pick a color to add it" : "No palette yet — press the + button above to create one";
          tiles.appendChild(span);
        }
      }
    },
    "pick": function (key, current) {
      const color = current.toLowerCase();
      /*  */
      if (key === "user") {
        config.update(color);
      } else {
        config.storage.write("color-" + key + "-current", color);
        config.update(color);
        /*  */
        const block = config.sections.block(key);
        for (const input of block.querySelectorAll(".tiles input")) {
          if (input.getAttribute("color").toLowerCase() === color) input.value = "✓";
          else input.value = '';
        }
      }
    },
    "assemble": function (key) {
      const block = document.createElement("details");
      const summary = document.createElement("summary");
      const span = document.createElement("span");
      block.setAttribute("key", key);
      /*  */
      span.textContent = config.color.js.titles[key];
      summary.appendChild(span);
      config.sections.controls(summary, key);
      block.appendChild(summary);
      /*  */
      if (key === "user") {
        const strip = document.createElement("div");
        strip.className = "strip";
        block.appendChild(strip);
        config.palette.strip(strip);
      }
      /*  */
      const tiles = document.createElement("div");
      tiles.className = "tiles";
      block.appendChild(tiles);
      /*  */
      summary.addEventListener("click", function (e) {
        if (e.target.closest("button, select, input")) e.preventDefault();
      });
      /*  */
      block.addEventListener("toggle", function () {
        if (block.open) config.sections.fill(block);
        /*  */
        const map = config.storage.read("section-open") || {};
        map[key] = block.open;
        config.storage.write("section-open", map);
        config.settings["sync-buttons"]();
      });
      /*  */
      return block;
    },
    "controls": function (summary, key) {
      const strip = document.createElement("span");
      strip.className = "scontrols";
      /*  */
      strip.appendChild(config.icon.button("chevron-up", "Move this section up", function () {
        const target = summary.parentNode;
        const previous = target.previousElementSibling;
        if (previous) {
          target.parentNode.insertBefore(target, previous);
          config.sections.order();
        }
      }));
      /*  */
      strip.appendChild(config.icon.button("chevron-down", "Move this section down", function () {
        const target = summary.parentNode;
        const next = target.nextElementSibling;
        if (next) {
          target.parentNode.insertBefore(next, target);
          config.sections.order();
        }
      }));
      /*  */
      strip.appendChild(config.icon.button("remove", "Remove this section (re-add it in settings)", function () {
        const target = summary.parentNode;
        target.remove();
        config.sections.order();
      }));
      /*  */
      summary.appendChild(strip);
    },
    "render": function () {
      const container = document.getElementById("sections");
      const visible = config.sections.visible();
      container.textContent = '';
      /*  */
      for (const key of visible) {
        const block = config.sections.assemble(key);
        block.open = config.sections.state(block) === true;
        if (block.open) config.sections.fill(block);
        container.appendChild(block);
      }
      /*  */
      if (visible.includes("user")) config.palette.select();
      /*  */
      config.tiles.size(config.storage.read("tile-size") !== undefined ? config.storage.read("tile-size") : config.color.js.tile.size);
    }
  },
  "settings": {
    "sync": function () {
      const theme = config.storage.read("theme") !== undefined ? config.storage.read("theme") : "light";
      const tile = config.storage.read("tile-size") !== undefined ? config.storage.read("tile-size") : config.color.js.tile.size;
      /*  */
      document.getElementById("size").value = tile;
      document.getElementById("setting-size").value = tile;
      document.getElementById("theme-dark").checked = theme === "dark";
      document.getElementById("theme-auto").checked = theme === "auto";
      document.getElementById("theme-light").checked = theme === "light";
      document.getElementById("setting-autoadd").checked = config.storage.read("auto-add") !== false;
      document.getElementById("setting-pagescroll").checked = config.storage.read("whole-page-scroll") === true;
      document.getElementById("setting-timeout").value = config.storage.read("notify-timeout") !== undefined ? config.storage.read("notify-timeout") : 5;
      /*  */
      config.settings.checklist();
      config.settings["sync-buttons"]();
    },
    "checklist": function () {
      const container = document.getElementById("section-list");
      const visible = config.sections.visible();
      container.textContent = '';
      /*  */
      config.color.js.keys.forEach(key => {
        const span = document.createElement("span");
        const chip = document.createElement("label");
        const input = document.createElement("input");
        /*  */
        input.type = "checkbox";
        input.checked = visible.includes(key);
        span.textContent = config.color.js.titles[key];
        /*  */
        input.addEventListener("change", function (e) {
          let fresh = config.sections.visible();
          if (e.target.checked && !fresh.includes(key)) fresh.push(key);
          if (!e.target.checked) fresh = fresh.filter(k => k !== key);
          /*  */
          config.storage.write("sections-visible", fresh);
          config.sections.render();
          config.settings.sync();
        });
        /*  */
        chip.appendChild(input);
        chip.appendChild(span);
        container.appendChild(chip);
      });
    },
    "sync-buttons": function () {
      const open = document.getElementById("section-open");
      const check = document.getElementById("section-check");
      /*  */
      if (!open || !check) return;
      /*  */
      const blocks = [...document.querySelectorAll("#sections details")];
      const close = blocks.length ? blocks.every(block => {return block.open === true}) : false;
      const selected = config.sections.visible().length === config.color.js.keys.length;
      /*  */
      const first = config.icon.make(close === true ? "chevron-up" : "chevron-down");
      const second = config.icon.make(selected === true ? "remove" : "plus");
      open.textContent = '';
      open.appendChild(first);
      open.title = close === true ? "Close all sections" : "Open all sections";
      check.textContent = '';
      check.appendChild(second);
      check.title = selected === true ? "Unselect all sections" : "Select all sections";
      open.hidden = false;
      check.hidden = false;
    },
    "export": function () {
      const envelope = {
        "app": "color-picker",
        "format": 1,
        "settings": {
          "palette-map": config.palette.read(),
          "palette-current": config.palette.current(),
          "sections-visible": config.sections.visible(),
          "auto-add": config.storage.read("auto-add") !== false,
          "whole-page-scroll": config.storage.read("whole-page-scroll") === true,
          "theme": config.storage.read("theme") !== undefined ? config.storage.read("theme") : "light",
          "notify-timeout": config.storage.read("notify-timeout") !== undefined ? config.storage.read("notify-timeout") : 5,
          "tile-size": config.tiles.size(config.storage.read("tile-size") !== undefined ? config.storage.read("tile-size") : config.color.js.tile.size)
        }
      };
      /*  */
      config.clipboard = JSON.stringify(envelope);
      config.copy.clipboard();
      config.notifications.create("Settings and palettes are copied to the clipboard");
    },
    "validate": function (settings) {
      const map = {};
      const seen = {};
      const result = {};
      /*  */
      let current;
      result.theme = ["dark", "light", "auto"].includes(settings["theme"]) ? settings["theme"] : "light";
      result.tile = config.tiles.size(settings["tile-size"] !== undefined ? settings["tile-size"] : config.color.js.tile.size);
      result.timeout = Math.max(1, Math.min(20, parseInt(settings["notify-timeout"]) || 5));
      result.autoadd = settings["auto-add"] !== false;
      result.pagescroll = settings["whole-page-scroll"] === true;
      /*  */
      const clean = [];
      const source = Array.isArray(settings["sections-visible"]) ? settings["sections-visible"] : [];
      for (const key of source) {
        if (config.color.js.keys.includes(key) && !clean.includes(key)) clean.push(key);
      }
      /*  */
      result.visible = Array.isArray(settings["sections-visible"]) ? clean : config.color.js.keys;
      /*  */
      const source2 = settings["palette-map"] && typeof settings["palette-map"] === "object" && !Array.isArray(settings["palette-map"]) ? settings["palette-map"] : {};
      for (const name in source2) {
        const nameclean = config.palette.name(name);
        if (!nameclean || seen[nameclean.toLowerCase()]) continue;
        seen[nameclean.toLowerCase()] = true;
        /*  */
        const colors = [];
        const source3 = Array.isArray(source2[name]) ? source2[name] : [];
        for (const color of source3) {
          const lowercase = typeof color === "string" ? color.toLowerCase() : '';
          if (config.palette.color(lowercase) && !colors.includes(lowercase)) {
            colors.push(lowercase);
            if (colors.length >= 300) break;
          }
        }
        /*  */
        map[nameclean] = colors;
      }
      /*  */
      current = config.palette.name(settings["palette-current"]);
      if (!current || map[current] === undefined) current = Object.keys(map)[0] || '';
      /*  */
      result.map = map;
      result.current = current;
      return result;
    },
    "import": function (text) {
      let envelope;
      try {
        envelope = JSON.parse(text);
      } catch (error) {
        config.notifications.create("Import failed: the text is not valid JSON", "error");
        return;
      }
      /*  */
      const ok = envelope && envelope.app === "color-picker" && typeof envelope.format === "number" && envelope.settings && typeof envelope.settings === "object" && !Array.isArray(envelope.settings);
      if (!ok) {
        config.notifications.create("Import failed: this is not a color-picker settings export", "error");
        return;
      }
      /*  */
      const result = config.settings.validate(envelope.settings);
      /*  */
      config.storage.write("theme", result.theme);
      config.storage.write("tile-size", result.tile);
      config.storage.write("palette-map", result.map);
      config.storage.write("auto-add", result.autoadd);
      config.storage.write("notify-timeout", result.timeout);
      config.storage.write("palette-current", result.current);
      config.storage.write("sections-visible", result.visible);
      config.storage.write("whole-page-scroll", result.pagescroll);
      /*  */
      config.app.restart();
      config.notifications.create("Settings imported successfully");
    },
    "reset": function () {
      const action = window.confirm("Reset all settings, palettes and sections to the factory defaults?");
      if (action !== true) return;
      /*  */
      const keys = ["theme", "tile-size", "notify-timeout", "auto-add", "whole-page-scroll", "sections-visible", "section-open", "palette-map", "palette-current", "color-picker-current", "color-user-list", "color-user-current"];
      config.color.js.keys.forEach(key => {
        if (key !== "user") keys.push("color-" + key + "-current", "color-" + key + "-list");
      });
      /*  */
      keys.forEach(key => {
        delete config.storage.local[key];
        chrome.storage.local.remove(key);
      });
      /*  */
      config.notifications.create("Factory reset complete — reloading");
      window.setTimeout(function () {document.location.reload()}, 800);
    }
  },
  "app": {
    "migrate": function () {
      if (config.storage.read("palette-map") !== undefined) return;
      const map = {};
      let current = '';
      const legacy = config.storage.read("color-user-list");
      /*  */
      if (Array.isArray(legacy) && legacy.length) {
        map["My colors"] = legacy.filter(color => config.palette.color(color)).map(color => color.toLowerCase()).filter((color, index, self) => self.indexOf(color) === index);
        if (map["My colors"].length) current = "My colors";
      }
      /*  */
      config.palette.write(map, current);
    },
    "top": function () {
      const attribute = config.storage.read("whole-page-scroll") === true;
      document.documentElement.setAttribute("page-scroll", attribute ? "true" : '');
    },
    "theme": function () {
      const stored = config.storage.read("theme") !== undefined ? config.storage.read("theme") : "light";
      const scheme = stored === "auto" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : stored;
      document.documentElement.setAttribute("theme", scheme === "dark" ? "dark" : "light");
    },
    "render": function () {
      if (config.storage.read("autoload-count") !== undefined) {
        delete config.storage.local["autoload-count"];
        chrome.storage.local.remove("autoload-count");
      }
      /*  */
      config.app.migrate();
      config.app.top();
      config.app.theme();
      config.tiles.size(config.storage.read("tile-size") !== undefined ? config.storage.read("tile-size") : config.color.js.tile.size);
      config.settings.sync();
      config.sections.render();
    },
    "restart": function () {
      config.app.top();
      config.app.theme();
      config.tiles.size(config.storage.read("tile-size") !== undefined ? config.storage.read("tile-size") : config.color.js.tile.size);
      config.settings.sync();
      config.sections.render();
      /*  */
      const current = config.storage.read("color-picker-current");
      if (current) config.update(current);
    },
    "start": function () {
      const button = document.querySelector(".picker .button");
      const current = config.storage.read("color-picker-current");
      /*  */
      if (button) {
        button.style.background = 'url("../icons/168.png") no-repeat calc(50% + 22px) center';
      }
      /*  */
      config.app.render();
      /*  */
      if (current) {
        config.update(current);
      } else {
        let fallback = '';
        for (const key of config.sections.visible()) {
          const list = config.sections.list(key);
          if (list.length) {
            fallback = list[0];
            break;
          }
        }
        /*  */
        if (fallback) {
          config.update(fallback);
        }
      }
    }
  },
  "color": {
    "js": {
      "tile": {
        "size": 28
      },
      "values": [
        null,
        ARTISTIC,
        FAVORITE,
        UI,
        POPULAR,
        DRAWING,
        GAME,
        CSS3,
        MATERIAL,
        RAINBOW,
        SPECTRUM,
        SAFE,
        RANDOM,
        MONITOR,
        COMIC,
        LARGE,
        HUES,
        PASTEL,
        NEON,
        VINTAGE,
        EARTH,
        OCEAN,
        SUNSET,
        CANDY,
        NATURE,
        METALLIC,
        SKIN
      ],
      "keys": [
        "user",
        "artistic",
        "favorite",
        "ui",
        "popular",
        "drawing",
        "game",
        "css3",
        "material",
        "rainbow",
        "spectrum",
        "safe",
        "random",
        "monitor",
        "comic",
        "large",
        "hues",
        "pastel",
        "neon",
        "vintage",
        "earth",
        "ocean",
        "sunset",
        "candy",
        "nature",
        "metallic",
        "skin"
      ],
      "titles": {
        "skin": "Skin tones",
        "game": "Game colors",
        "css3": "CSS3 colors",
        "hues": "Hues colors",
        "neon": "Neon colors",
        "user": "User defined",
        "comic": "Comic colors",
        "earth": "Earth tones",
        "ocean": "Ocean colors",
        "candy": "Candy colors",
        "ui": "UI design colors",
        "nature": "Nature colors",
        "sunset": "Sunset colors",
        "pastel": "Pastel colors",
        "vintage": "Vintage colors",
        "popular": "Popular colors",
        "drawing": "Drawing colors",
        "rainbow": "Rainbow colors",
        "monitor": "Monitor colors",
        "safe": "Safe set of colors",
        "artistic": "Artistic colors",
        "favorite": "Favorite colors",
        "material": "Material colors",
        "spectrum": "Spectrum colors",
        "metallic": "Metallic colors",
        "random": "Nice Random colors",
        "large": "Large set of colors"
      }
    },
    "add": {
      "numeric": {
        "values": function (e, color, method, title) {
          const input = document.createElement("input");
          /*  */
          input.setAttribute("type", "text");
          input.setAttribute("readonly", true);
          input.setAttribute("title", title);
          input.value = method ? config.convert[method](color) : color;
          input.style.textTransform = method ? "none" : "uppercase";
          /*  */
          e.appendChild(input);
          /*  */
          input.addEventListener("click", function (e) {
            const message = "Color code is copied to the clipboard:\n" + e.target.value;
            /*  */
            config.notifications.create(message);
            config.clipboard = e.target.value;
            config.copy.clipboard();
          });
        }
      }
    }
  },
  "load": function () {
    const size = document.getElementById("size");
    const theme = document.getElementById("theme");
    const clear = document.getElementById("clear");
    const reload = document.getElementById("reload");
    const picker = document.getElementById("picker");
    const support = document.getElementById("support");
    const text = document.getElementById("paste-text");
    const imported = document.getElementById("import");
    const exported = document.getElementById("export");
    const settings = document.getElementById("settings");
    const donation = document.getElementById("donation");
    const apply = document.getElementById("paste-apply");
    const cancel = document.getElementById("paste-cancel");
    const reset = document.getElementById("setting-reset");
    const pane_paste = document.getElementById("pane-paste");
    const eyedropper = document.getElementById("eyedropper");
    const themedarks = document.getElementById("theme-dark");
    const themeautos = document.getElementById("theme-auto");
    const themelights = document.getElementById("theme-light");
    const colorpicker = document.getElementById("colorpicker");
    const settings_size = document.getElementById("setting-size");
    const section_open = document.getElementById("section-open");
    const section_check = document.getElementById("section-check");
    const settings_timeout = document.getElementById("setting-timeout");
    const settings_autoadd = document.getElementById("setting-autoadd");
    const settings_pagescroll = document.getElementById("setting-pagescroll");
    /*  */
    const container = picker.parentNode;
    /*  */
    clear.addEventListener("click", function () {
      const name = config.palette.current();
      if (!name) {
        config.notifications.create("There is no palette to clear", "warning");
        return;
      }
      /*  */
      const action = window.confirm("Do you really want to clear all the colors of the palette '" + name + "' from storage?");
      if (action !== true) return;
      /*  */
      const map = config.palette.read();
      map[name] = [];
      config.palette.write(map, name);
      config.sections.render();
      config.notifications.create("The palette '" + name + "' is cleared");
    }, false);
    /*  */
    support.addEventListener("click", function () {
      const url = config.addon.homepage();
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    donation.addEventListener("click", function () {
      const url = config.addon.homepage() + "?reason=support";
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    size.addEventListener("change", function (e) {
      const value = config.tiles.size(e.target.value);
      e.target.value = value;
      settings_size.value = value;
      config.storage.write("tile-size", value);
    }, false);
    /*  */
    theme.addEventListener("click", function () {
      const current = config.storage.read("theme") === "dark" ? "dark" : "light";
      const next = current === "dark" ? "light" : "dark";
      /*  */
      config.storage.write("theme", next);
      config.app.theme();
      config.settings.sync();
    });
    /*  */
    eyedropper.addEventListener("click", function () {
      if (typeof EyeDropper === "undefined") {
        config.notifications.create("The eye dropper is not supported in this browser");
        return;
      }
      /*  */
      const target = new EyeDropper();
      target.open().then(e => {
        const color = e.sRGBHex ? e.sRGBHex.toLowerCase() : '';
        if (color && config.palette.color(color)) {
          if (config.storage.read("auto-add") !== false) config.palette.add(color);
          config.update(color);
        }
      }).catch(() => {});
    });
    /*  */
    exported.addEventListener("click", function () {config.settings.export()});
    /*  */
    imported.addEventListener("click", function () {
      config.pane.show("pane-paste");
      text.value = '';
      text.focus();
    });
    /*  */
    apply.addEventListener("click", function () {
      const value = (text.value || '').trim();
      if (value) {
        config.pane.close();
        config.settings["import"](value);
      } else {
        config.notifications.create("The import box is empty — paste the exported text first", "warning");
      }
    });
    /*  */
    cancel.addEventListener("click", function () {config.pane.close()});
    /*  */
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      const open = [...document.querySelectorAll(".pane")].some(p => {return p.hidden === false});
      if (open) config.pane.close();
    });
    /*  */
    settings.addEventListener("click", function () {
      if (document.getElementById("pane-settings").hidden) {
        config.pane.show("pane-settings");
      } else {
        config.pane.close();
      }
    });
    /*  */
    settings_size.addEventListener("change", function (e) {
      const value = config.tiles.size(e.target.value);
      e.target.value = value;
      size.value = value;
      config.storage.write("tile-size", value);
    }, false);
    /*  */
    settings_timeout.addEventListener("change", function (e) {
      const value = Math.max(1, Math.min(20, parseInt(e.target.value) || 5));
      e.target.value = value;
      config.storage.write("notify-timeout", value);
    }, false);
    /*  */
    settings_autoadd.addEventListener("change", function (e) {
      config.storage.write("auto-add", e.target.checked === true);
    }, false);
    /*  */
    settings_pagescroll.addEventListener("change", function (e) {
      config.storage.write("whole-page-scroll", e.target.checked === true);
      config.app.top();
    }, false);
    /*  */
    section_open.addEventListener("click", function () {
      const blocks = [...document.querySelectorAll("#sections details")];
      if (!blocks.length) return;
      const close = blocks.every(block => {return block.open === true});
      for (const block of blocks) block.open = !close;
    }, false);
    /*  */
    section_check.addEventListener("click", function () {
      const all = config.sections.visible().length === config.color.js.keys.length;
      const fresh = all === true ? [] : config.color.js.keys.slice();
      config.storage.write("sections-visible", fresh);
      config.sections.render();
      config.settings.sync();
    }, false);
    /*  */
    reset.addEventListener("click", config.settings.reset);
    /*  */
    themelights.addEventListener("change", function (e) {
      if (e.target.checked) {
        config.storage.write("theme", "light");
        config.app.theme();
      }
    }, false);
    /*  */
    themedarks.addEventListener("change", function (e) {
      if (e.target.checked) {
        config.storage.write("theme", "dark");
        config.app.theme();
      }
    }, false);
    /*  */
    themeautos.addEventListener("change", function (e) {
      if (e.target.checked) {
        config.storage.write("theme", "auto");
        config.app.theme();
      }
    }, false);
    /*  */
    config.scheme = window.matchMedia("(prefers-color-scheme: dark)");
    config.scheme.addEventListener("change", function () {
      if (config.storage.read("theme") === "auto") {
        config.app.theme();
      }
    });
    /*  */
    container.addEventListener("click", function () {picker.click()});
    colorpicker.addEventListener("click", function () {picker.click()});
    reload.addEventListener("click", function () {document.location.reload()}, false);
    picker.addEventListener("input", function (e) {config.update(e.target.value.toLowerCase(), false)}, false);
    /*  */
    picker.addEventListener("change", function (e) {
      const color = e.target.value.toLowerCase();
      if (config.storage.read("auto-add") !== false) config.palette.add(color);
      config.update(color);
    }, false);
    /*  */
    config.storage.load(config.app.start);
    window.removeEventListener("load", config.load, false);
  },
  "convert": {
    "hex2rgb": function (hex) {
      const tmp = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!tmp) return hex;
      const r = parseInt(tmp[1], 16), g = parseInt(tmp[2], 16), b = parseInt(tmp[3], 16);
      /*  */
      return "RGB(" + r + ', ' + g + ', ' + b + ')';
    },
    "hex2cmyk": function (hex) {
      const tmp = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!tmp) return hex;
      const r = parseInt(tmp[1], 16) / 255, g = parseInt(tmp[2], 16) / 255, b = parseInt(tmp[3], 16) / 255;
      /*  */
      let c, m, y, k, max;
      max = Math.max(r, g, b);
      k = 1 - max;
      if (k == 1) {c = 0; m = 0; y = 0;}
      else {
        c = (1 - r - k) / (1 - k);
        m = (1 - g - k) / (1 - k);
        y = (1 - b - k) / (1 - k);
      }
      /*  */
      return "CMYK(" + Math.floor(c * 100) + '%, ' + Math.floor(m * 100) + '%, ' + Math.floor(y * 100) + '%, ' + Math.floor(k * 100) + '%)';
    },
    "hex2hwb": function (hex) {
      const tmp = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!tmp) return hex;
      let r = parseInt(tmp[1], 16) / 255, g = parseInt(tmp[2], 16) / 255, b = parseInt(tmp[3], 16) / 255;
      /*  */
      let h, w, B, delta, max, min;
      delta = 0;
      max = Math.max(r, g, b);
      min = Math.min(r, g, b);
      delta = max - min;
      /*  */
      if (delta === 0) h = 0;
      else if (r === max) h = (g - b) / delta;
      else if (g === max) h = ((b - r) / delta) + 2;
      else h = ((r - g) / delta) + 4;
      h = Math.min(h * 60, 360);
      if (h < 0) h += 360;
      /*  */
      w = min;
      B = 1 - max;
      return "HWB(" + Math.floor(h) + ', ' + Math.floor(w * 100) + '%, ' + Math.floor(B * 100) + '%)';
    },
    "hex2hsb": function (hex) {
      const tmp = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!tmp) return hex;
      let r = parseInt(tmp[1], 16) / 255, g = parseInt(tmp[2], 16) / 255, b = parseInt(tmp[3], 16) / 255;
      /*  */
      let computedH, computedS, computedV, d, h, maxRGB, minRGB;
      minRGB = Math.min(r, Math.min(g, b));
      maxRGB = Math.max(r, Math.max(g, b));
      if (minRGB === maxRGB) {
        computedV = Math.floor(100 * minRGB);
        return "HSB(" + 0 + ', ' + 0 + ', ' + computedV + ')';
      }
      /*  */
      d = (r === minRGB) ? g - b : ((b === minRGB) ? r - g : b - r);
      h = (r === minRGB) ? 3 : ((b === minRGB) ? 1 : 5);
      computedH = Math.floor(60 * (h - d / (maxRGB - minRGB)));
      computedS = Math.floor(100 * (maxRGB - minRGB) / maxRGB);
      computedV = Math.floor(100 * maxRGB);
      /*  */
      return "HSB(" + computedH + ', ' + computedS + ', ' + computedV + ')';
    },
    "hex2hsl": function (hex) {
      const tmp = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!tmp) return hex;
      const r = parseInt(tmp[1], 16) / 255, g = parseInt(tmp[2], 16) / 255, b = parseInt(tmp[3], 16) / 255;
      /*  */
      let min, max, i, l, s, maxcolor, h, rgb = [];
      rgb[0] = r, rgb[1] = g, rgb[2] = b;
      min = rgb[0], max = rgb[0], maxcolor = 0;
      /*  */
      for (i = 0; i < rgb.length - 1; i++) {
        if (rgb[i + 1] <= min) min = rgb[i + 1];
        if (rgb[i + 1] >= max) {
          max = rgb[i + 1];
          maxcolor = i + 1;
        }
      }
      /*  */
      if (maxcolor === 0) h = (rgb[1] - rgb[2]) / (max - min);
      if (maxcolor === 1) h = 2 + (rgb[2] - rgb[0]) / (max - min);
      if (maxcolor === 2) h = 4 + (rgb[0] - rgb[1]) / (max - min);
      if (isNaN(h)) h = 0;
      /*  */
      h = h * 60;
      if (h < 0) h = h + 360;
      /*  */
      l = (min + max) / 2;
      if (min === max) s = 0;
      else {
        if (l < 0.5) s = (max - min) / (max + min);
        else s = (max - min) / (2 - max - min);
      }
      /*  */
      return "HSL(" + Math.floor(h) + ', ' + Math.floor(s * 100) + '%, ' + Math.floor(l * 100) + '%)';
    }
  }
};

config.port.connect();

window.addEventListener("load", config.load, false);
window.addEventListener("resize", config.resize.method, false);
document.addEventListener("copy", config.copy.listener, false);
