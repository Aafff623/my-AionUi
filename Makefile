
cat-config:
	@base64 -D -i ~/.threetwoa-config-dev/threetwoa-config.txt | python3 -c 'import sys, urllib.parse; print(urllib.parse.unquote(sys.stdin.read()))' | pbcopy
