var config  = {
  "clipboard": '',
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "notifications": {
    "create": function (message) {
      var notify = new Notify();
      notify.display(message, "info");
    }
  },
  "copy": (function () {
    document.oncopy = function (e) {
      e.clipboardData.setData("text/plain", config.clipboard);
      e.preventDefault();
    };
    /*  */
    return {
      "clipboard": function () {
        document.execCommand("Copy", false, null);
      }
    }
  })(),
  "resize": {
    "timeout": null,
    "method": function () {
      var context = document.documentElement.getAttribute("context");
      if (context === "win") {
        if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
        config.resize.timeout = window.setTimeout(function () {
          config.storage.write("interface.size", {
            "width": window.innerWidth || window.outerWidth,
            "height": window.innerHeight || window.outerHeight
          });
        }, 300);
      }
    }
  },
  "update": function (color) {
    if (color) {
      config.storage.write("color-picker-current", color);
      /*  */
      document.getElementById("picker").value = color;
      document.getElementById("picker").parentNode.style.backgroundColor = color;
      /*  */
      var details = document.getElementById("details");
      details.textContent = '';
      if (color) {
        config.color.add.numeric.values(details, color, null);
        config.color.add.numeric.values(details, color, "hex2hsb");
        config.color.add.numeric.values(details, color, "hex2rgb");
        config.color.add.numeric.values(details, color, "hex2hsl");
        config.color.add.numeric.values(details, color, "hex2hwb");
        config.color.add.numeric.values(details, color, "hex2cmyk");
      }
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
          var tmp = {};
          tmp[id] = data;
          config.storage.local[id] = data;
          chrome.storage.local.set(tmp, function () {});
        } else {
          delete config.storage.local[id];
          chrome.storage.local.remove(id, function () {});
        }
      }
    }
  },
  "port": {
    "name": '',
    "connect": function () {
      config.port.name = "webapp";
      var context = document.documentElement.getAttribute("context");
      /*  */
      if (chrome.runtime) {
        if (chrome.runtime.connect) {
          if (context !== config.port.name) {
            if (document.location.search === "?tab") config.port.name = "tab";
            if (document.location.search === "?win") config.port.name = "win";
            if (document.location.search === "?popup") config.port.name = "popup";
            /*  */
            if (config.port.name === "popup") {
              document.documentElement.style.width = "770px";
              document.documentElement.style.height = "570px";
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
  "render": function (key, fill) {
    var tiles = document.querySelector("." + key + "-tiles");
    tiles.textContent = '';
    /*  */
    if (fill) {
      var fragment  = document.createDocumentFragment();
      for (var i = 0; i < config.color[key].list.length; i++) {
        var input = document.createElement("input");
        var size = (config.storage.read("tile-size") !== undefined ? config.storage.read("tile-size") : config.color.js.tile.size);
        /*  */
        input.addEventListener("click", function (e) {config.color.store(key, e.target.getAttribute("color"))});
        document.documentElement.style.setProperty('--tile-height', size + "px");
        document.documentElement.style.setProperty('--tile-width', size + "px");
        input.style.backgroundColor = config.color[key].list[i];
        input.setAttribute("color", config.color[key].list[i]);
        input.style.color = "rgb(189, 187, 187)";
        input.setAttribute("readonly", true);
        input.setAttribute("type", "text");
        input.style.fontSize = "12px";
        /*  */
        if (config.color[key].list[i] === config.color[key].current) {
          input.value = '✓';
          input.style.boxShadow = "0 0 1px #000";
        }
        /*  */
        fragment.appendChild(input);
      }
      /*  */
      tiles.appendChild(fragment);
    }
    /*  */
    config.resize.method();
  },
  "app": {
    "start": async function () {
      var size = document.getElementById("size");
      size.value = config.storage.read("tile-size") !== undefined ? config.storage.read("tile-size") : config.color.js.tile.size;
      /*  */
      var details = [...document.querySelectorAll("details")];
      for (var i = 0; i < details.length; i++) {
        details[i].addEventListener("click", function (e) {
          if (e.target.tagName.toLowerCase() === "summary") {
            var i = parseInt(this.getAttribute("index"));
            if (i > -1) {
              var key = config.color.js.keys[i];
              var value = config.color.js.values[i];
              var list = config.storage.read("color-" + key + "-list");
              var current = config.storage.read("color-" + key + "-current");
              /*  */
              config.color[key] = {};
              config.color[key].list = list !== undefined ? list : value;
              config.color[key].current = current !== undefined ? current : (value && value.lenth ? value[0] : '');
              config.render(key, this.open === false);
            }
          }
        });
      }
      /*  */
      var button = document.querySelector(".picker .button");
      if (button) button.style.background = 'url("../icons/128.png") no-repeat center center';
      /*  */
      for (var i = 0; i < config.color.js.max.details.to.load; i++) {
        var detail = document.querySelector("details[index='" + i + "']");
        if (detail) detail.querySelector("summary").click();
        await (new Promise(resolve => window.setTimeout(resolve, 100)));
      }
      /*  */
      var current = config.storage.read("color-picker-current");
      if (current) config.update(current);
      else {
        var input = document.querySelector("input[color='#b48ead']");
        if (input) input.click();
      }
    }
  },
  "load": function () {
    var size = document.getElementById("size");
    var clear = document.getElementById("clear");
    var reload = document.getElementById("reload");
    var picker = document.getElementById("picker");
    var support = document.getElementById("support");
    var donation = document.getElementById("donation");
    var container = picker.parentNode;
    /*  */
    clear.addEventListener("click", function () {
      var action = window.confirm("Do you really want to clear all the user colors from storage?");
      if (action === true) config.color.store("user", null);
    }, false);
    /*  */
    support.addEventListener("click", function () {
      var url = config.addon.homepage();
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    donation.addEventListener("click", function () {
      var url = config.addon.homepage() + "?reason=support";
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    size.addEventListener("change", function (e) {
      config.storage.write("tile-size", e.target.value);
      document.documentElement.style.setProperty("--tile-width", e.target.value + "px");
      document.documentElement.style.setProperty("--tile-height", e.target.value + "px");
    }, false);
    /*  */
    container.addEventListener("click", function () {picker.click()});
    reload.addEventListener("click", function () {document.location.reload()}, false);
    picker.addEventListener("input", function (e) {config.color.store(null, e.target.value)}, false);
    picker.addEventListener("change", function (e) {config.color.store("user", e.target.value)}, false);
    /*  */
    config.storage.load(config.app.start);
    window.removeEventListener("load", config.load, false);
  },
  "color": {
    "js": {
      "tile": {"size": 22},
      "max": {"details": {"to": {"load": 6}}},
      "values": [[], ARTISTIC, FAVORITE, UI, POPULAR, DRAWING, GAME, CSS3, MATERIAL, RAINBOW, SPECTRUM, SAFE, RANDOM, MONITOR, COMIC, LARGE, HUES],
      "keys": ["user", "artistic", "favorite", "ui", "popular", "drawing", "game", "css3", "material", "rainbow", "spectrum", "safe", "random", "monitor", "comic", "large", "hues"]
    },
    "add": {
      "numeric": {
        "values": function (e, color, method) {
          var input = document.createElement("input");
          input.setAttribute("type", "text");
          input.setAttribute("readonly", true);
          input.value = method ? config.convert[method](color) : color;
          input.style.textTransform = method ? "none" : "uppercase";
          e.appendChild(input);
          /*  */
          input.addEventListener("click", function (e) {
            var message = "Color code is copied to the clipboard:\n" + e.target.value;
            config.notifications.create(message);
            config.clipboard = e.target.value;
            config.copy.clipboard();
          });
        }
      }
    },
    "store": function (key, current) {
      if (current) config.update(current);
      if (key) {
        if (key === "user") {
          if (current) {
            var tmp = config.color.user.list;
            tmp.push(current);
            tmp = [...new Set(tmp)];
            while (tmp.length > 100) tmp.shift();
            /*  */
            config.color.user.list = tmp;
            config.color.user.current = current;
          } else {
            config.color.user.list = [];
            config.color.user.current = '';
          }
          /*  */
          config.storage.write("color-user-list", config.color.user.list);
          config.storage.write("color-user-current", config.color.user.current);
          /*  */
          config.render("user", true);
        } else {
          config.color[key].current = current;
          config.storage.write("color-" + key +"-current", config.color[key].current);
          /*  */
          config.render(key, true);
        }
      }
    }
  },
  "convert": {
    "hex2rgb": function (hex) {
      var tmp = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      var r = parseInt(tmp[1], 16), g = parseInt(tmp[2], 16), b = parseInt(tmp[3], 16);
      /*  */
      return (r >= 0 && g >= 0 && b >= 0) ? "RGB(" + r + ', ' + g + ', ' + b + ')' : "RGB(184, 39, 179)";
    },
    "hex2cmyk": function (hex) {
      var tmp = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      var r = parseInt(tmp[1], 16), g = parseInt(tmp[2], 16), b = parseInt(tmp[3], 16);
      /*  */
      var c, m, y, k;
      r = r / 255; g = g / 255; b = b / 255;
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
      var tmp = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      var r = parseInt(tmp[1], 16), g = parseInt(tmp[2], 16), b = parseInt(tmp[3], 16);
      /*  */
      var h, w, B;
      r = r / 255, g = g / 255, b = b / 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var delta = max - min;
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
      var tmp = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      var r = parseInt(tmp[1], 16), g = parseInt(tmp[2], 16), b = parseInt(tmp[3], 16);
      /*  */
      var computedH = 0, computedS = 0, computedV;
      if (r < 0 || g < 0 || b < 0 || r > 255 || g > 255 || b > 255) return "hsb(302, 78, 72)";
      if (r === null || g === null || b === null || isNaN(r) || isNaN(g) || isNaN(b)) return "hsb(302, 78, 72)";
      /*  */
      r = r / 255; g = g / 255; b = b / 255;
      var minRGB = Math.min(r, Math.min(g, b));
      var maxRGB = Math.max(r, Math.max(g, b));
      if (minRGB === maxRGB) {
        computedV = minRGB;
        return "hsb(" + 0 + ', ' + 0 + ', ' + computedV + ')';
      }
      /*  */
      var d = (r === minRGB) ? g - b : ((b === minRGB) ? r - g : b - r);
      var h = (r === minRGB) ? 3 : ((b === minRGB) ? 1 : 5);
      computedH = Math.floor(60 * (h - d / (maxRGB - minRGB)));
      computedS = Math.floor(100 * (maxRGB - minRGB) / maxRGB);
      computedV = Math.floor(100 * maxRGB);
      /*  */
      return "HSB(" + computedH + ', ' + computedS + ', ' + computedV + ')';
    },
    "hex2hsl": function (hex) {
      var tmp = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      var r = parseInt(tmp[1], 16), g = parseInt(tmp[2], 16), b = parseInt(tmp[3], 16);
      /*  */
      var min, max, i, l, s, maxcolor, h, rgb = [];
      rgb[0] = r / 255, rgb[1] = g / 255, rgb[2] = b / 255;
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
      s = s;
      return "HSL(" + Math.floor(h) + ', ' + Math.floor(s * 100) + '%, ' + Math.floor(l * 100) + '%)';
    }
  }
};

config.port.connect();

window.addEventListener("load", config.load, false);
window.addEventListener("resize", config.resize.method, false);