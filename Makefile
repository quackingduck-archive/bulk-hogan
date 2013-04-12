COFFEE = $(shell find "src" -name "*.coffee")
JS = $(COFFEE:src%.coffee=lib%.js)

all: $(JS)

lib/%.js : src/%.coffee
	./node_modules/.bin/coffee \
		--compile \
		--lint \
		--output lib $<

test :
	./node_modules/.bin/coffee src/bulk_hogan.coffee

# ---

tag:
	git tag v`node -e "console.log(require('./package.json').version)"`
