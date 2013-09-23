upflow.addFilter(
  function(input) {
    var match = input.match(/^\.\.\s*image\s*::\s*(.+)\s*$/);
    if (!match) {
      return input;
    }
    return "<img src='" + upflow.escapeHtml(match[1]) + "' />";
  }
);
