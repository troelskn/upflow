upflow.addFilter(
  function(input) {
    var match = input.match(/^(\.\.\s*ledger\s*\n)\s*\S+/);
    if (!match) {
      return input;
    }
    var text = input.substring(match[1].length);
    try {
      var nodes = upflow.bml.parse(text).toNodes();
      if (nodes.length == 0) {
        return;
      }
      var caption = null;
      if (nodes[0].children.length == 0) {
        caption = nodes[0].name;
        nodes.shift();
      }
      var rows = [];
      for (var i in nodes) {
        var node = nodes[i];
        var row = {'title': node.name, 'values': []};
        for (var j in node.children) {
          row.values.push(node.children[j].name);
        }
        rows.push(row);
      }
      var html = "<table>";
      if (caption) {
        html += "\n  <caption>" + upflow.escapeHtml(caption) + "</caption>";
      }
      html += "\n  <tbody>";
      for (var ii=0; ii < rows.length; ii++) {
        var row = rows[ii];
        if (ii == rows.length - 1) {
          html += "\n    <tr class=\"last\">";
        } else if (ii == 0) {
          html += "\n    <tr class=\"first\">";
        } else {
          html += "\n    <tr>";
        }
        html += "\n      <th scope=\"row\">" + upflow.escapeHtml(row.title) + "</th>";
        for (var jj in row.values) {
          html += "\n      <td>" + upflow.escapeHtml(row.values[jj]) + "</td>";
        }
        html += "\n    </tr>";
      }
      html += "\n  </tbody>";
      html += "\n</table>";
      return html;
    } catch (e) {
      return "Can't render content: " + upflow.escapeHtml(e.message);
    }
  }
);

upflow.bml = {};

upflow.bml.trim = function(s) {
  return s.replace(/^\s*/, "").replace(/\s*$/, "");
};

upflow.bml.parse = function(text) {
  var lines = text.split("\n");
  var root = new upflow.bml.Node();
  var node = root;
  var path = [];
  for (var i in lines) {
    var line = lines[i];
    if (upflow.bml.trim(line)) {
      var mm = line.match(/^\s*/);
      var level = mm[0].length;
      var cont = true;
      var last_level;
      while (cont) {
        last_level = path.length == 0 ? 0 : path[path.length - 1];
        if (last_level == level) {
          // same level, just add
          node.add(line);
          cont = false;
        } else if (last_level < level) {
          // increase
          path.push(level);
          node = node.increase();
          node.add(line);
          cont = false;
        } else {
          // decrease
          path.pop();
          node = node.decrease();
        }
      }
    }
  }
  return root;
};

upflow.bml.Node = function(parent) {
  this.parent = typeof(parent) == "undefined" ? null : parent;
  this.children = [];
};

upflow.bml.Node.prototype.add = function(line) {
  this.children.push(upflow.bml.trim(line));
};

upflow.bml.Node.prototype.increase = function() {
  var child = new upflow.bml.Node(this);
  this.children.push(child);
  return child;
};

upflow.bml.Node.prototype.decrease = function() {
  return this.parent;
};

upflow.bml.Node.prototype.toStruct = function() {
  var arr = [];
  for (var i in this.children) {
    var child = this.children[i];
    arr.push(typeof(child) == "string" ? child : child.toStruct());
  }
  return arr;
};

upflow.bml.Node.prototype.toNodes = function() {
  var arr = [];
  var last = null;
  for (var i in this.children) {
    var child = this.children[i];
    if (typeof(child) == "string") {
      last = {
        name: child,
        children: []
      };
      arr.push(last);
    } else {
      last.children = child.toNodes();
    }
  }
  return arr;
};
