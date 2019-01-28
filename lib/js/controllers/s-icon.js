(function () {
    var cache = Object.create(null);
    var rootPath;
    var cacheBreaker = "";
    var cssAdded = false;
    function ensureCSS() {
        if (cssAdded) {
            return;
        }
        var style = document.createElement("style");
        style.setAttribute("type", "text/css");
        style.textContent = ".svg-skeleton-element-during-loading { display: none !important; }";
        document.head.appendChild(style);
        cssAdded = true;
    }

    function get(name) {
        if (typeof rootPath !== "string") {
            return rootPath.then(function () { return get(name); });
        }
        var result = cache[name];
        if (result) {
            return result;
        }
        result = new Promise(function (resolve, reject) {
            var req = new XMLHttpRequest();
            req.addEventListener("load", function () {
                resolve(req.responseText);
            });
            var url = rootPath + name + ".svg";
            if (cacheBreaker) {
                url += "?" + cacheBreaker;
            }
            req.open("GET", url);
            req.send();
        });
        cache[name] = result;
        return result;
    }

    Stacks.addController("s-icon", {

        _setSvgSource: function(svgSource) {
            var div = document.createElement("div");
            div.innerHTML = svgSource;
            var source = div.childNodes[0];

            // move all attributes over to the skeleton, with special handling for the `class` attribute, so that
            // we don't remove any classes that the caller may already have added to the skeleton
            while (source.attributes.length) {
                var attr = source.attributes[0];
                source.removeAttributeNode(attr);
                if (attr.name === "class") {
                    this.element.className += " " + attr.value;
                } else {
                    var alreadyPresent = attr.namespaceURI ? this.element.hasAttributeNS(attr.namespaceURI, attr.name) : this.element.hasAttribute(attr.name);
                    if (!alreadyPresent)
                        this.element.setAttributeNodeNS(attr);
                }
            }

            // move all child nodes of the <svg> to the (empty) skeleton.
            while (source.childNodes.length) {
                var child = source.childNodes[0];
                source.removeChild(child);
                this.element.appendChild(child);
            }
        },

        connect: function() {
            var name = this.data.get("name");
            var cached = cache[name];
            var promise;
            if (typeof cached === "string") {
                this._setSvgSource(cached);
                return;
            } else if (cached) {
                promise = cached;
            } else {
                promise = get(name);
            }
            ensureCSS();
            this.element.classList.add("svg-skeleton-element-during-loading");
            var that = this;
            get(name).then(function (svgSource) {
                that._setSvgSource(svgSource);
                // the skeleton is no longer a skeleton, so we can now remove the "hide this" class
                that.element.classList.remove("svg-skeleton-element-during-loading");
            });
        }
    });

    Stacks.icon = Object.create(null);
    rootPath = new Promise(function (resolve) {
        Stacks.icon.setSourcePath = function (rp, cb) {
            if (rp[rp.length - 1] !== "/") {
                rp += "/";
            }
            rootPath = rp;
            cacheBreaker = cb || "";
            resolve(rp);
        };
    });
})();
