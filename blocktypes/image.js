upflow.registerBlock(
  "image",
  {
    description: "An image",
    symbol: "#",
    create: function(value) {
      return upflow.createBlockBase("image", upflow.createInputText, value);
    },
    match: function(text) {
      var match = text.match(/^\.\.\s*image\s*::\s*(.+)\s*$/);
      if (!match) {
        return false;
      }
      return match[1];
    },
    text2markdown: function(text) {
      return "..image :: " + text;
    },
    text2html: function(text) {
      return "<img src='" + upflow.escapeHtml(text) + "' />";
      return "<b>..image :: </b>" + upflow.escapeHtml(text);
    }
  }
);
