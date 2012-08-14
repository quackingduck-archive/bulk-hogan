bulk-hogan
==========

Bulk-Hogan will search your directory structure for two kinds
of folders, `templates` and `modules`. Then you can access compiled
versions of your templates like

````coffeescript
# renders /templates/home.html.mustache
templates.render 'home', { body: "body html" }, (err, html) ->
  throw err if err?
  console.log html

# renders /modules/footer/module.html.mustache
templates.render 'footer', {} (err, html) ->

# renders /modules/footer/links.html.mustache
templates.render 'footer_links', {} (err, html) ->
````

This is an early beta release. Use at your own risk etc.
                                  ---

