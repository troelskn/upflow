Upflow
======

*Flowing markdown upstream.*

A wysiwyg editor for [Markdown](http://daringfireball.net/projects/markdown/).

Demo at: [http://troelskn.googlepages.com/upflow.html](http://troelskn.googlepages.com/upflow.html)

Upflow uses the [Showdown library](http://attacklab.net/showdown/). *NB: Distributing the Attacklab obfuscated version.*

Blocktypes are custom templates
-------------------------------

Upflow can render templates -- blocktypes -- and currently ships with two of these, found in
the blocktypes/ folder.

### image.js ###

Renders an IMG tag, takes arguments like:

    ..image :: path/to/the/image.png

### ledger.js ###

The ledger blocktype is a table renderer. You enter your data like so:

    ..ledger
    Lorem ipsum dolor sit amet
    foo
      32
      16
      8
    bar
      14
      7
      3½
