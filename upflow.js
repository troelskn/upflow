/** upflow -- Flowing markdown upstream */
upflow = {};

// some utilities
upflow.showdown = new Attacklab.showdown.converter();

upflow.escapeHtmlBr = function(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/(\n\r|\n|\r)/g, "<br/>");
};

upflow.escapeHtml = function(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

upflow.deferredEvent = function(element, event, handler) {
  var tout;
  var canceller = function() {
    if (tout) {
      clearTimeout(tout);
    }
  };
  element["on" + event] = function() {
    canceller();
    tout = setTimeout(handler, 100);
  };
  return canceller;
};

upflow.keys = function(list) {
  var keys = [];
  for (var key in list) {
    keys.push(key);
  }
  return keys;
};

upflow.computedStyle = function(elem, cssProperty) {
  var arr = cssProperty.split('-');
  var cssProperty = arr[0];
  for (var i = 1; i < arr.length; i++) {
    cssProperty += arr[i].charAt(0).toUpperCase() + arr[i].substring(1);
  }
  if (cssProperty == 'opacity' && elem.filters) { // IE opacity
    try {
      return elem.filters.item('DXImageTransform.Microsoft.Alpha').opacity / 100;
    } catch (e) {
      try {
        return elem.filters.item('alpha').opacity / 100;
      } catch (e) {}
    }
  }
  if (elem.currentStyle) {
    return elem.currentStyle[cssProperty];
  }
  if (typeof(document.defaultView) == 'undefined') {
    return undefined;
  }
  if (document.defaultView === null) {
    return undefined;
  }
  var style = document.defaultView.getComputedStyle(elem, null);
  if (typeof(style) == 'undefined' || style === null) {
    return undefined;
  }
  var selectorCase = cssProperty.replace(/([A-Z])/g, '-$1').toLowerCase();
  return style.getPropertyValue(selectorCase);
};

upflow.getElementDimensions = function(elem) {
  if (typeof(elem.w) == 'number' || typeof(elem.h) == 'number') {
    return {w: elem.w || 0, h: elem.h || 0};
  }
  if (!elem) {
    return undefined;
  }
  if (upflow.computedStyle(elem, 'display') != 'none') {
    return {w: elem.offsetWidth || 0, h: elem.offsetHeight || 0};
  }
  var s = elem.style;
  var originalVisibility = s.visibility;
  var originalPosition = s.position;
  s.visibility = 'hidden';
  s.position = 'absolute';
  s.display = '';
  var originalWidth = elem.offsetWidth;
  var originalHeight = elem.offsetHeight;
  s.display = 'none';
  s.position = originalPosition;
  s.visibility = originalVisibility;
  return {w: originalWidth, h: originalHeight};
};

upflow.getElementPosition = function(obj) {
  var curleft = curtop = 0;
  if (obj.offsetParent) {
    curleft = obj.offsetLeft
      curtop = obj.offsetTop
      while (obj = obj.offsetParent) {
        curleft += obj.offsetLeft
        curtop += obj.offsetTop
      }
  }
  return {x: curleft, y: curtop};
};

/*
	Cross-Browser Split 0.3
	By Steven Levithan <http://stevenlevithan.com>
	MIT license
	Provides a consistent cross-browser, ECMA-262 v3 compliant split method
*/
upflow.splitString = function(str, s /* separator */, limit) {
	// if separator is not a regex, use the native split method
	if (!(s instanceof RegExp))
		return str.split.apply(str, arguments);

	var	flags = (s.global ? "g" : "") + (s.ignoreCase ? "i" : "") + (s.multiline ? "m" : ""),
		s2 = new RegExp("^" + s.source + "$", flags),
		output = [],
		origLastIndex = s.lastIndex,
		lastLastIndex = 0,
		i = 0, match, lastLength;

	/* behavior for limit: if it's...
	- undefined: no limit
	- NaN or zero: return an empty array
	- a positive number: use limit after dropping any decimal
	- a negative number: no limit
	- other: type-convert, then use the above rules
	*/
	if (limit === undefined || +limit < 0) {
		limit = false;
	} else {
		limit = Math.floor(+limit);
		if (!limit)
			return [];
	}

	if (s.global)
		s.lastIndex = 0;
	else
		s = new RegExp(s.source, "g" + flags);

	while ((!limit || i++ <= limit) && (match = s.exec(str))) {
		var emptyMatch = !match[0].length;

		// Fix IE's infinite-loop-resistant but incorrect lastIndex
		if (emptyMatch && s.lastIndex > match.index)
			s.lastIndex--;

		if (s.lastIndex > lastLastIndex) {
			// Fix browsers whose exec methods don't consistently return undefined for non-participating capturing groups
			if (match.length > 1) {
				match[0].replace(s2, function () {
					for (var j = 1; j < arguments.length - 2; j++) {
						if (arguments[j] === undefined)
							match[j] = undefined;
					}
				});
			}

			output = output.concat(str.slice(lastLastIndex, match.index));
			if (1 < match.length && match.index < str.length)
				output = output.concat(match.slice(1));
			lastLength = match[0].length; // only needed if s.lastIndex === str.length
			lastLastIndex = s.lastIndex;
		}

		if (emptyMatch)
			s.lastIndex++; // avoid an infinite loop
	}

	// since this uses test(), output must be generated before restoring lastIndex
	output = lastLastIndex === str.length ?
		(s.test("") && !lastLength ? output : output.concat("")) :
		(limit ? output : output.concat(str.slice(lastLastIndex)));
	s.lastIndex = origLastIndex; // only needed if s.global, else we're working with a copy of the regex
	return output;
};



// main entrypoint
upflow.attach =  function(canvas, content) {
  return new upflow.Canvas(canvas, content);
};

upflow.popupElement = null;
upflow.selectBlockType = function(current, toggler) {
  var types = upflow.keys(upflow.registry);
  if (!upflow.popupElement) {
    upflow.popupElement = document.body.appendChild(document.createElement("div"));
    upflow.popupElement.className = "upflow-popup-element";
  }
  upflow.popupElement.style.display = "block";
  while (upflow.popupElement.hasChildNodes()) {
    upflow.popupElement.removeChild(upflow.popupElement.firstChild);
  }
  var listener = function(newType) {};
  var createHandler = function(type) {
    return function() {
      upflow.popupElement.style.display = "none";
      listener(type);
    };
  };

  var table = upflow.popupElement.appendChild(document.createElement("table"));
  table.style.width = "100%";
  var tbody = table.appendChild(document.createElement("tbody"));
  var tr = tbody.appendChild(document.createElement("tr"));
  var td_main = tr.appendChild(document.createElement("td"));
  var td_close = tr.appendChild(document.createElement("td"));
  td_close.style.width = "1em";
  td_close.vAlign = "top";
  var close = td_close.appendChild(document.createElement("div"));
  close.innerHTML = "&#x2716;";
  close.title = "Click to close";
  close.className = "upflow-popup-close";
  close.onclick = function() { upflow.popupElement.style.display = "none"; }

  var table_types = td_main.appendChild(document.createElement("table"));
  table_types.style.width = "100%";
  var tbody_types = table_types.appendChild(document.createElement("tbody"));
  var tr_current = tbody_types.appendChild(document.createElement("tr"));
  for (ii in types) {
    if (tr_current.childNodes.length > 1) {
      tr_current = tbody_types.appendChild(document.createElement("tr"));
    }
    var td_type = tr_current.appendChild(document.createElement("td"));
    td_type.style.width = "50%";
    var className = types[ii];
    var element = td_type.appendChild(document.createElement("div"));
    element.style.margin = ".25em 0";
    var icon = document.createElement("div");
    if (upflow.registry[className].description) {
      icon.title = upflow.registry[className].description;
    }
    if (upflow.registry[className].symbol) {
      icon.innerHTML = upflow.registry[className].symbol;
    }
    icon.className = "upflow-toggler upflow-toggler-" + className;
    element.appendChild(icon);
    var span = element.appendChild(document.createElement("span"));
    span.style.display = "block";
    span.style.cssFloat = "left";
    span.style.height = "2em";
    span.style.lineHeight = "2em";
    span.style.marginLeft = ".25em";
    if (current == className) {
      span.style.color = "white";
    } else {
      span.style.color = "#888";
    }
    span.style.fontWeight = "bold";
    span.style.cursor = "pointer";
    span.innerHTML = upflow.escapeHtmlBr(className);
    element.appendChild(document.createElement("br")).style.clear = "both";
    element.onclick = createHandler(className);
  }

  var hr = upflow.popupElement.appendChild(document.createElement("hr"));
  var span = upflow.popupElement.appendChild(document.createElement("span"));
  span.className = "upflow-popup-action";
  span.innerHTML = "&#x2716; Delete";
  span.title = "Delete this block";
  var on_delete = function() {};
  span.onclick = function() {
    on_delete();
    upflow.popupElement.style.display = "none";
  };

  upflow.popupElement.appendChild(document.createTextNode(":"));
  var span2 = upflow.popupElement.appendChild(document.createElement("span"));
  span2.className = "upflow-popup-action";
  span2.innerHTML = "&#x21F5; Move";
  span2.title = "Move this block up or down";

  var dim = upflow.getElementPosition(toggler);
  upflow.popupElement.style.top = dim.y + "px";
  upflow.popupElement.style.left = dim.x + "px";
  var d = { onCompleted: function(callback) { listener = callback; return d; }, onDelete: function(callback) { on_delete = callback; return d; }};
  return d;
};

upflow.Canvas = function(canvas, content) {
  this.blocks = [];
  var block = upflow.createDefaultBlock(content.value);
  this.container = canvas;
  this.contentField = content;
  this.appendBlock(block);
  if (block.toMarkdown() == "") {
    block.focus();
  } else {
    upflow.roundTrip(block);
  }
};

upflow.Canvas.prototype.toMarkdown = function() {
  var out = [];
  var blocks = this.blocks;
  for (var ii = 0, ll = blocks.length; ii < ll; ii++) {
    var text = blocks[ii].toMarkdown();
    if (text != "") {
      out.push(text);
    }
  };
  return out.join("\n\n");
};

upflow.Canvas.prototype.updateContentField = function() {
  this.contentField.value = this.toMarkdown();
};

upflow.Canvas.prototype.own = function(block) {
  block.owner = this;
  this.blocks.push(block);
  this.updateContentField();
};

upflow.Canvas.prototype.loose = function(block) {
  block.owner = null;
  var blocks = this.blocks;
  var tmp = [];
  for (var ii = 0, ll = blocks.length; ii < ll; ii++) {
    if (blocks[ii] != block) {
      tmp.push(blocks[ii]);
    }
  }
  this.blocks = tmp;
  this.updateContentField();
};

upflow.Canvas.prototype.appendBlock = function(block) {
  this.container.appendChild(block.container);
  this.own(block);
};

upflow.Canvas.prototype.insertBlockAfter = function(block, relative) {
  if (relative.nextSibling) {
    this.container.insertBefore(block.container, relative.nextSibling);
  } else {
    this.container.appendChild(block.container);
  }
  this.own(block);
};

upflow.Canvas.prototype.insertBlockBefore = function(block, relative) {
  this.container.insertBefore(block.container, relative);
  this.own(block);
};

upflow.Canvas.prototype.removeBlock = function(block) {
  this.loose(block);
  this.container.removeChild(block.container);
};

upflow.Canvas.prototype.getNextBlock = function(block) {
  var found = false;
  for (var ii = 0; ii < this.blocks.length; ii++) {
    if (found) {
      return this.blocks[ii];
    }
    if (this.blocks[ii] == block) {
      found = true;
    }
  }
};

upflow.Canvas.prototype.getPreviousBlock = function(block) {
  var last = null;
  for (var ii = 0; ii < this.blocks.length; ii++) {
    if (this.blocks[ii] == block) {
      return last;
    }
    last = this.blocks[ii];
  }
};

upflow.bindKeyListeners = function(block) {
  var element = block.input;
  element.onkeypress = function(e) {
    if (!e) var e = window.event;
    if (e.keyCode) var code = e.keyCode;
    else if (e.which) var code = e.which;
    if (code == 27) {
      element.blur();
    } else if (code == 9) {
      if (e.shiftKey) {
        var next = block.previousSiblingBlock();
      } else {
        var next = block.nextSiblingBlock();
      }
      if (next) {
        next.focus();
        e.cancelBubble = true;
        if (e.stopPropagation) e.stopPropagation();
        return false;
      }
    }
  };
  return element;
};

upflow.createInputText = function() {
  var input = document.createElement("input");
  input.type = "text";
  return input;
};

upflow.createTextarea = function() {
  return document.createElement("textarea");
};

// registry of blocktypes
// you can add your own, if you fancy
upflow.registry = {
  preformatted: {
    description: "Preformatted text",
    symbol: "&#x2630;", // &#x2630; -> preformatted
    create: function(value) {
      return upflow.createBlockBase("preformatted", upflow.createTextarea, value);
    },
    match: function(text) {
      var lines = upflow.splitString(text, /\n/);
      var trimmed = [];
      for (var ii=0; ii < lines.length; ii++) {
        var match = lines[ii].match(/^\s{4}(.*)$/);
        if (!match) {
          return false;
        }
        trimmed.push(match[1]);
      }
      return trimmed.join("\n");
    },
    text2markdown: function(text) {
      return "    " + text.replace(/\n/g, "\n    ");
    },
    text2html: function(text) {
      return "<pre>" + upflow.escapeHtml(text) + "</pre>";
    }
  },

  header1: {
    description: "Header",
    symbol: "H1",
    create: function(value) {
      return upflow.createBlockBase("header1", upflow.createInputText, value);
    },
    match: function(text) {
      var match = text.match(/^([^\n]+)\n=[=]+\s*$/);
      if (match) {
        return match[1];
      }
      var match = text.match(/^\s*#\s*([^#]+[^\n]+)\s*$/);
      if (match) {
        return match[1];
      }
      return false;
    },
    text2markdown: function(text) {
      return text + "\n===";
    },
    text2html: function(text) {
      return upflow.escapeHtmlBr(text);
    }
  },

  header2: {
    description: "Subheader",
    symbol: "h2",
    create: function(value) {
      return upflow.createBlockBase("header2", upflow.createInputText, value);
    },
    match: function(text) {
      var match = text.match(/^([^\n]+)\n-[-]+\s*$/);
      if (match) {
        return match[1];
      }
      var match = text.match(/^\s*##\s*([^#]+[^\n]+)\s*$/);
      if (match) {
        return match[1];
      }
      return false;
    },
    text2markdown: function(text) {
      return text + "\n---";
    },
    text2html: function(text) {
      return upflow.escapeHtmlBr(text);
    }
  },

  header3: {
    description: "Subheader 3",
    symbol: "h3",
    create: function(value) {
      return upflow.createBlockBase("header3", upflow.createInputText, value);
    },
    match: function(text) {
      var match = text.match(/^\s*###\s*([^#]+[^\n]+)\s*$/);
      if (match) {
        return match[1];
      }
      return false;
    },
    text2markdown: function(text) {
      return "###" + text + "\n";
    },
    text2html: function(text) {
      return upflow.escapeHtmlBr(text);
    }
  },

  header4: {
    description: "Subheader 4",
    symbol: "h4",
    create: function(value) {
      return upflow.createBlockBase("header4", upflow.createInputText, value);
    },
    match: function(text) {
      var match = text.match(/^\s*####\s*([^#]+[^\n]+)\s*$/);
      if (match) {
        return match[1];
      }
      return false;
    },
    text2markdown: function(text) {
      return "####" + text + "\n";
    },
    text2html: function(text) {
      return upflow.escapeHtmlBr(text);
    }
  },

  header5: {
    description: "Subheader 5",
    symbol: "h5",
    create: function(value) {
      return upflow.createBlockBase("header5", upflow.createInputText, value);
    },
    match: function(text) {
      var match = text.match(/^\s*#####\s*([^#]+[^\n]+)\s*$/);
      if (match) {
        return match[1];
      }
      return false;
    },
    text2markdown: function(text) {
      return "#####" + text + "\n";
    },
    text2html: function(text) {
      return upflow.escapeHtmlBr(text);
    }
  },

  header6: {
    description: "Subheader 6",
    symbol: "h6",
    create: function(value) {
      return upflow.createBlockBase("header6", upflow.createInputText, value);
    },
    match: function(text) {
      var match = text.match(/^\s*######\s*([^#]+[^\n]+)\s*$/);
      if (match) {
        return match[1];
      }
      return false;
    },
    text2markdown: function(text) {
      return "######" + text + "\n";
    },
    text2html: function(text) {
      return upflow.escapeHtmlBr(text);
    }
  },

  blockquote: {
    description: "Blockquote",
    symbol: "&#x275e;",
    create: function(value) {
      return upflow.createBlockBase("blockquote", upflow.createTextarea, value);
    },
    match: function(text) {
      var lines = upflow.splitString(text, /\n/);
      var trimmed = [];
      for (var ii=0; ii < lines.length; ii++) {
        var match = lines[ii].match(/^>\s*(.*)$/);
        if (!match) {
          return false;
        }
        trimmed.push(match[1]);
      }
      return trimmed.join("\n");
    },
    text2markdown: function(text) {
      return "> " + text.replace(/\n/g, "\n> ");
    },
    text2html: function(text) {
      return "<blockquote><p>" + upflow.escapeHtml(text) + "</p></blockquote>";
    }
  },

  paragraph: {
    description: "Markdown formatted text",
    symbol: "&#182;",
    create: function(value) {
      return upflow.createBlockBase("paragraph", upflow.createTextarea, value);
    },
    match: function(text) {
      return text;
    },
    text2markdown: function(text) {
      return text;
    },
    text2html: function(text) {
      return upflow.showdown.makeHtml(text);
    }
  }

};

upflow.createDefaultBlock = upflow.registry.paragraph.create;

upflow.registerBlock = function(name, block) {
  var tmp = {};
  for (k in upflow.registry) {
    if (k == "paragraph") {
      tmp[name] = block;
    }
    tmp[k] = upflow.registry[k];
  }
  upflow.registry = tmp;
};

// markdown -> chunks
upflow.parseToTokens = function(text) {
  var chunks = upflow.splitString(
    text
    .replace(/^(\s*={2,}\s*)$/mg, "$1\n")
    .replace(/^(\s*-{2,}\s*)$/mg, "$1\n")
    /*.replace(/^\s+/g, '')*/ // causes trouble with <pre>
    .replace(/\s+$/g, '')
    .replace(/^[ \t]+$/mg, "")
    .replace(/(\r\n|\r|\n)/g, "\n")
  , /[\n]{2,}/);

  var registry = upflow.registry;
  var tokens = [];
  var find = function(text) {
    for (var type in registry) {
      var result = registry[type].match(text);
      if (result != false) {
        return {type: type, value: result, create: registry[type].create};
      }
    }
  };
  for (var i in chunks) {
    tokens.push(find(chunks[i]));
  }
  return tokens;
};

upflow.roundTrip = function(block) {
  var tokens = upflow.parseToTokens(block.toMarkdown());
  if (tokens.length == 0 || (tokens.length == 1 && tokens[0].type == block.getType())) { // dunno if == 0 is needed?
    return false;
  }
  var owner = block.owner;
  var previousSibling = block.container.previousSibling;
  var nextSibling = block.container.nextSibling;
  block.removeBlock();
  for (var i in tokens) {
    var newblock = tokens[i].create(tokens[i].value);
    if (previousSibling) {
      owner.insertBlockAfter(newblock, previousSibling);
    } else if (nextSibling) {
      owner.insertBlockBefore(newblock, nextSibling);
    } else {
      owner.appendBlock(newblock);
    }
    previousSibling = newblock.container;
  }
  return true;
};

// block types
upflow.createBlockBase = function(className, createInput, initialValue) {
  var block = new upflow.Block();
  block.type = className;
  block.initialValue = initialValue;
  block.container = document.createElement("div");
  block.container.className = "upflow-container";
  block.container.onmouseover = function() {
    block.container.className = "upflow-container-hover";
  };
  block.container.onmouseout = function() {
    block.container.className = "upflow-container";
  };

  block.toggler = document.createElement("div");
  if (upflow.registry[className].description) {
    block.toggler.title = upflow.registry[className].description;
  }
  if (upflow.registry[className].symbol) {
    block.toggler.innerHTML = upflow.registry[className].symbol;
  }
  block.toggler.className = "upflow-toggler upflow-toggler-" + className;
  block.toggler.onclick = function() {
    cancelBlur();
    block.toggleBlock();
  };
  block.container.appendChild(block.toggler);

  block.wrap = document.createElement("div");
  block.wrap.className = "upflow-field";
  block.container.appendChild(block.wrap);

  block.inputWrap = document.createElement("div");
  block.wrap.appendChild(block.inputWrap);

  block.input = createInput();
  block.input.className = "upflow-" + className;
  block.input.value = typeof(initialValue) == "undefined" ? "" : initialValue;
  var cancelBlur = upflow.deferredEvent(
    block.input,
    "blur",
    function() {
      block.onblur();
    });
  block.inputWrap.appendChild(block.input);
  upflow.bindKeyListeners(block);

  block.labelTable = document.createElement("table");
  block.labelTable.style.width = "100%";
  block.inputWrap.appendChild(block.labelTable);
  var tbody = block.labelTable.appendChild(document.createElement("tbody"));
  var tr = tbody.appendChild(document.createElement("tr"));

  if (upflow.registry[className].description) {
    block.label = document.createElement("label");
    block.label.innerHTML = upflow.escapeHtmlBr(upflow.registry[className].description);
    var td = tr.appendChild(document.createElement("td"));
    td.appendChild(block.label);
  }
  block.closeButton = document.createElement("label");
  block.closeButton.style.display = "inline";
  block.closeButton.style.cursor = "pointer";
  block.closeButton.innerHTML = "Close";
  var td = tr.appendChild(document.createElement("td"));
  td.align = "right";
  td.appendChild(block.closeButton);

  block.preview = document.createElement("div");
  block.preview.className = "upflow-preview-" + className;
  block.preview.title = "Click to edit";
  block.preview.onclick = function() {
    block.focus();
  };

  block.wrap.appendChild(block.preview);

  var breaker = document.createElement("div");
  breaker.className = "upflow-br";
  block.container.appendChild(breaker);

  // a hack. the browser needs to get control over the element, before the value is tampered
  block.tamperedValue = block.input.value;
  setTimeout(
    function() {
      block.tamperedValue = block.input.value;
    }, 1);

  // init
  block.setHtml(block.toHtml());
  return block;
};

upflow.Block = function() {
  this.owner = null;
};

// todo: rename -> setHtml
upflow.Block.prototype.setHtml = function(html) {
  this.preview.innerHTML = html;
  this.preview.style.display = "block";
  this.inputWrap.style.display = "none";
};

upflow.Block.prototype.onblur = function() {
  if (this.input.value.replace(/\s/g, "") == "") {
    if (this.isOnlyBlock()) {
      return;
    }
    this.removeBlock();
    return;
  }
  if (this.hasChanged()) {
    if (upflow.roundTrip(this)) {
      return;
    }
    this.owner.updateContentField();
  }
  this.setHtml(this.toHtml());
};

upflow.Block.prototype.blur = function() {
  this.input.blur();
};

upflow.Block.prototype.focus = function() {
  this.preview.style.display = "none";
  this.inputWrap.style.display = "block";
  this.input.focus();
};

upflow.Block.prototype.hasChanged = function() {
  return this.tamperedValue != this.input.value;
};

upflow.Block.prototype.getUntamperedValue = function() {
  if (this.hasChanged()) {
    return this.input.value;
  }
  return this.initialValue;
};

upflow.Block.prototype.toMarkdown = function() {
  return upflow.registry[this.type].text2markdown(this.input.value);
};

upflow.Block.prototype.toHtml = function() {
  return upflow.registry[this.type].text2html(this.input.value);
};

upflow.Block.prototype.getType = function() {
  return this.type;
};

upflow.Block.prototype.previousSiblingBlock = function() {
  return this.owner.getPreviousBlock(this);
};

upflow.Block.prototype.nextSiblingBlock = function() {
  return this.owner.getNextBlock(this);
};

upflow.Block.prototype.toggleBlock = function() {
  var self = this;
  upflow.selectBlockType(self.type, self.toggler)
  .onCompleted(
    function(newType) {
      if (self.type != newType) {
        self.replaceBlock(upflow.registry[newType].create);
      }
    })
  .onDelete(
    function() {
      self.removeBlock();
    });
};

upflow.Block.prototype.replaceBlock = function(ctor) {
  var replacement = ctor(this.getUntamperedValue());
  this.owner.insertBlockAfter(replacement, this.container);
  this.owner.removeBlock(this);
  replacement.focus();
};

upflow.Block.prototype.removeBlock = function() {
  this.owner.removeBlock(this);
};

upflow.Block.prototype.isOnlyBlock = function() {
  var parentNode = this.container.parentNode;
  var children = parentNode.childNodes;
  var count = 0;
  for (var i in children) {
    if (typeof(children[i]) != "undefined" && children[i].className == "upflow-container") {
      count++;
      if (count > 1) {
        return false;
      }
    }
  }
  return count == 1;
};
