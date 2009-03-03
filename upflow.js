/** upflow -- Flowing markdown upstream */
upflow = {};

// some utilities
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

// Canvas represents the entire editing area
// A Canvas contains multiple Blocks
upflow.Canvas = function(canvas, content) {
  this.blocks = [];
  var block = upflow.createBlock(content.value);
  this.container = canvas;
  this.contentField = content;
  this.appendBlock(block);
  if (block.toMarkdown() == "") {
    block.focus();
  } else {
    upflow.roundTrip(block);
  }
};

upflow.Canvas.prototype.setContent = function(text) {
  var blocks = this.blocks;
  for (var ii = 0, ll = blocks.length; ii < ll; ii++) {
    this.removeBlock(blocks[ii]);
  }
  var block = upflow.createBlock(text);
  this.appendBlock(block);
  if (block.toMarkdown() != "") {
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

upflow.Canvas.prototype.own = function(block, deferUpdate) {
  block.owner = this;
  this.blocks.push(block);
  if (!deferUpdate) {
    this.updateContentField();
  }
};

upflow.Canvas.prototype.loose = function(block, deferUpdate) {
  block.owner = null;
  var blocks = this.blocks;
  var tmp = [];
  for (var ii = 0, ll = blocks.length; ii < ll; ii++) {
    if (blocks[ii] != block) {
      tmp.push(blocks[ii]);
    }
  }
  this.blocks = tmp;
  if (!deferUpdate) {
    this.updateContentField();
  }
};

upflow.Canvas.prototype.appendBlock = function(block, deferUpdate) {
  this.container.appendChild(block.container);
  this.own(block, deferUpdate);
};

upflow.Canvas.prototype.insertBlockAfter = function(block, relative, deferUpdate) {
  if (relative.nextSibling) {
    this.container.insertBefore(block.container, relative.nextSibling);
  } else {
    this.container.appendChild(block.container);
  }
  this.own(block, deferUpdate);
};

upflow.Canvas.prototype.insertBlockBefore = function(block, relative, deferUpdate) {
  this.container.insertBefore(block.container, relative);
  this.own(block, deferUpdate);
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

upflow.filters = [];

upflow.addFilter = function(filter) {
  upflow.filters.unshift(filter);
};

upflow.text2html = function(text) {
  for (var ii=0,ff=upflow.filters,len=ff.length; ii < len; ii++) {
    text = ff[ii](text);
  }
  return text;
};

// default filter (text -> markdown)
upflow.showdown = new Attacklab.showdown.converter();

upflow.addFilter(
  function(input) {
    return upflow.showdown.makeHtml(input);
  }
);

// markdown -> chunks
upflow.parseToTokens = function(text) {
  return upflow.splitString(
    text
    .replace(/^(\s*={2,}\s*)$/mg, "$1\n")
    .replace(/^(\s*-{2,}\s*)$/mg, "$1\n")
    .replace(/\s+$/g, '')
    .replace(/^[ \t]+$/mg, "")
    .replace(/(\r\n|\r|\n)/g, "\n")
  , /[\n]{2,}/);
};

upflow.roundTrip = function(block) {
  var tokens = upflow.parseToTokens(block.toMarkdown());
  if (tokens.length < 2) {
    return false;
  }
  var owner = block.owner;
  if (owner == null) {
    throw new Error("owner is null");
  }
  var previousSibling = block.container.previousSibling;
  var nextSibling = block.container.nextSibling;
  block.removeBlock();
  for (var i in tokens) {
    var newblock = upflow.createBlock(tokens[i]);
    if (previousSibling) {
      owner.insertBlockAfter(newblock, previousSibling, true);
    } else if (nextSibling) {
      owner.insertBlockBefore(newblock, nextSibling, true);
    } else {
      owner.appendBlock(newblock, true);
    }
    previousSibling = newblock.container;
  }
  owner.updateContentField();
  return true;
};

upflow.createBlock = function(initialValue) {
  var block = new upflow.Block();
  block.initialValue = initialValue;
  block.container = document.createElement("div");
  block.container.className = "upflow-container";
  block.container.onmouseover = function() {
    block.container.className = "upflow-container-hover";
  };
  block.container.onmouseout = function() {
    block.container.className = "upflow-container";
  };

  block.wrap = document.createElement("div");
  block.wrap.className = "upflow-field";
  block.container.appendChild(block.wrap);

  block.inputWrap = document.createElement("div");
  block.wrap.appendChild(block.inputWrap);

  block.input = document.createElement("textarea");
  block.input.className = "upflow-editor";
  block.input.value = typeof(initialValue) == "undefined" ? "" : initialValue;
  // resize textfield to match content
  var lastValue = null;
  block.input.onkeyup = function() {
    if (lastValue != block.input.value) {
      var lines = Math.max(
        block.input.value.split("\n").length,
        Math.round(block.input.value.length / 80)) + 6;
      block.input.style.height = lines + "em";
      lastValue = block.input.value;
    }
  };

  var cancelBlur = upflow.deferredEvent(
    block.input,
    "blur",
    function() {
      block.onblur();
    });
  block.inputWrap.appendChild(block.input);
  upflow.bindKeyListeners(block);

  var toolbar = block.inputWrap.appendChild(document.createElement("div"));
  toolbar.style.textAlign = "right";
  toolbar.style.paddingRight = ".5em";

  var createEventHandler = function(handler) {
    return function(e) {
      handler();
      if (!e) var e = window.event;
      e.cancelBubble = true;
      if (e.stopPropagation) e.stopPropagation();
      return false;
    };
  };

  // toolbar -> Delete
  block.deleteButton = document.createElement("a");
  block.deleteButton.href = "#";
  block.deleteButton.title = "Click to delete this block of text";
  block.deleteButton.className = "upflow-action";
  block.deleteButton.innerHTML = "Delete";
  toolbar.appendChild(block.deleteButton);
  block.deleteButton.onclick = createEventHandler(
    function() {
      cancelBlur();
      if (!block.isOnlyBlock()) {
        console.log("You're not alone.");
        block.removeBlock();
      }
    });

  // toolbar -> Separator
  toolbar.appendChild(document.createTextNode(" : "));

  // toolbar -> Move
  block.moveButton = document.createElement("a");
  block.moveButton.href = "#";
  block.moveButton.title = "Click to move this block up/down. (Not yet implemented)";
  block.moveButton.className = "upflow-action";
  block.moveButton.innerHTML = "Move";
  toolbar.appendChild(block.moveButton);
  block.moveButton.onclick = createEventHandler(
    function() {
      cancelBlur();
      if (!block.isOnlyBlock()) {
        console.log("todo: toolbar -> Move");
      }
    });

  // toolbar -> Separator
  toolbar.appendChild(document.createTextNode(" : "));

  // toolbar -> Close
  block.closeButton = document.createElement("a");
  block.closeButton.href = "#";
  block.closeButton.title = "Click to stop editing this block";
  block.closeButton.className = "upflow-action";
  block.closeButton.innerHTML = "Close";
  toolbar.align = "right";
  toolbar.appendChild(block.closeButton);
  block.closeButton.onclick = createEventHandler(
    function() {
      cancelBlur();
      block.onblur();
    });

  block.preview = document.createElement("div");
  block.preview.className = "upflow-preview";
  block.preview.title = "Click to edit";
  block.preview.onclick = createEventHandler(
    function() {
      block.focus();
    });

  block.wrap.appendChild(block.preview);

  var breaker = document.createElement("div");
  breaker.className = "upflow-br";
  block.container.appendChild(breaker);

  // A hack. The browser needs to get control over the element, before the value is tampered
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
  this.input.onkeyup();
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
  return this.input.value;
};

upflow.Block.prototype.toHtml = function() {
  return upflow.text2html(this.input.value);
};

upflow.Block.prototype.previousSiblingBlock = function() {
  return this.owner.getPreviousBlock(this);
};

upflow.Block.prototype.nextSiblingBlock = function() {
  return this.owner.getNextBlock(this);
};

upflow.Block.prototype.removeBlock = function() {
  this.owner.removeBlock(this);
};

upflow.Block.prototype.isOnlyBlock = function() {
  var parentNode = this.container.parentNode;
  var children = parentNode.childNodes;
  var count = 0;
  for (var i in children) {
    if (typeof(children[i]) != "undefined" && typeof(children[i].className) != "undefined" && children[i].className.match(/^upflow-container/)) {
      count++;
      if (count > 1) {
        return false;
      }
    }
  }
  return count == 1;
};
