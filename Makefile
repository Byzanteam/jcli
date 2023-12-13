all: build/jcli

build/jcli:
	@mkdir -p build
	@deno compile -A -o build/jcli main.ts

build: build/jcli

PREFIX = /usr/local/bin

install: build/jcli
	@cp ./build/jcli $(PREFIX)

clean:
	@rm -rf build

.PHONY: all build install clean
