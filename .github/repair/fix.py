#!/usr/bin/env python3
"""One-shot repair: the shared block was appended INSIDE a JavaScript string.

exportWord() builds the Word export with `h += "</body></html>";`. The batch that
appends the export/restore/undo/keyboard block looks for the last
`</body></html>` in src/index.html - and in this app the last one is that line,
inside a double-quoted string. The block went between `h += "` and the closing
line, so the string ran across ~90 lines and the whole script block stopped
parsing (SyntaxError: Invalid or unexpected token). The app never booted.

This removes exactly that block and restores the line it split. Nothing else.
"""
import sys

PATH = "src/index.html"
OPEN_MARK = '  h += "\n<style>:focus-visible'
CLOSE_MARK = '</body></html>";'
RESTORE = '  h += "</body></html>";'

src = open(PATH, encoding="utf-8").read()
i = src.find(OPEN_MARK)
if i < 0:
    print("no injected block found in", PATH, "- nothing to do")
    sys.exit(0)

j = src.find(CLOSE_MARK, i)
if j < 0:
    print("block found but no closing marker after it - refusing to guess")
    sys.exit(2)

removed = j + len(CLOSE_MARK) - i
fixed = src[:i] + RESTORE + src[j + len(CLOSE_MARK):]
open(PATH, "w", encoding="utf-8").write(fixed)
print("removed %d bytes of the misplaced block: %d -> %d bytes" % (removed, len(src), len(fixed)))
