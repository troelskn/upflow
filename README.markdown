Upflow
======

*Flowing Markdown upstream.*

A [wysiwym](http://en.wikipedia.org/wiki/WYSIWYM "definition at Wikipedia") editor for [Markdown](http://daringfireball.net/projects/markdown/ "Markdown homepage").

Demo at: [http://troelskn.github.com/upflow/](http://troelskn.github.com/upflow/)

License and author
------------------
Upflow was written by [Troels Knak-Nielsen](http://github.com/troelskn/), and released under the [MIT license](http://www.opensource.org/licenses/mit-license.php). 

Dependencies
------------

Upflow uses the [Showdown library](http://attacklab.net/showdown/ "Attacklab's Showdown demo"). 

2009-03-27 *NB: Distributing an deobfuscated, minifyable version of the above code.*

The [version of showdown.js distributed with Upflow](http://github.com/olleolleolle/wmd/blob/c43850ba996bd1689b674873e04b815faa8921cb/showdown.js) can be minified.

A pull request has been sent to [derobins' wmd at GitHub](http://github.com/derobins/wmd/tree/master).

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
