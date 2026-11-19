#!/usr/bin/env python3
"""
extract-strings.py — the localisation extraction step for Conqueror OS.

The app's interface strings used to be inline and nowhere else, so translating it
meant hunting through 4,600 lines and hoping nothing was missed. This tool makes
the English the *source* and the catalogues derived, so the two cannot drift.

Three places declare a translatable string, and all three are read here:

  1. markup      <h3 data-i18n="shell.recent">Recent</h3>
                 <nav data-i18n-attr="aria-label:aria.primary">
  2. nav table   {id:"library", label:"Library", i18n:"nav.library", icon:"book"}
  3. call sites  t("shell.recent.empty","Nothing yet")

The English value always comes from the source above, never from the catalogue —
that is what makes drift impossible rather than merely unlikely.

  python3 tools/extract-strings.py --write    # regenerate en.json + the inline block
  python3 tools/extract-strings.py --check    # exit 1 if anything is out of sync
  python3 tools/extract-strings.py            # print what would be written

Exit codes: 0 clean, 1 drift or a malformed source, 2 a missing file.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "index.html"
LOCALES = ROOT / "src" / "locales"
LANGS = ["en", "hi", "gu"]
FALLBACK = "en"

# ---------------------------------------------------------------- source readers

TEXT_RE = re.compile(
    r'<([a-zA-Z][\w-]*)\b([^>]*\bdata-i18n="([^"]+)"[^>]*)>([^<]+)</\1>', re.S
)
ATTR_HOST_RE = re.compile(r'<([a-zA-Z][\w-]*)\b([^>]*\bdata-i18n-attr="([^"]+)"[^>]*)>', re.S)
NAV_RE = re.compile(r'\{id:"([a-z][a-z0-9-]*)",\s*label:"([^"]*)",\s*i18n:"([^"]+)"')
CALL_RE = re.compile(r'\bt\("([a-z0-9][a-z0-9.\-]*)"\s*,\s*"([^"]*)"\)')
BLOCK_RE = re.compile(
    r'<script id="i18n-data" type="application/json">(.*?)</script>', re.S
)

ENTITIES = {"&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " "}


def unescape(text):
    for entity, char in ENTITIES.items():
        text = text.replace(entity, char)
    return text


def add(table, key, value, where):
    """Record one string, refusing a key declared twice with different English."""
    if key in table and table[key] != value:
        raise SystemExit(
            'extract-strings: key "%s" is declared twice with different text:\n'
            '  %r  (%s)\n  %r' % (key, table[key], "earlier", value)
        )
    if not value.strip():
        raise SystemExit('extract-strings: key "%s" has an empty string (%s)' % (key, where))
    table[key] = value


def read_source(html):
    """English, keyed, from the three declaring sites. Never from a catalogue."""
    english, where = {}, {}

    # Every declaring site is counted twice: once by a loose marker and once by the
    # parser that actually reads it. A parser that silently stops matching half the
    # markup would otherwise shrink the catalogue and look like success.
    for marker, pattern in (
        ('data-i18n="', TEXT_RE),
        ('data-i18n-attr="', ATTR_HOST_RE),
        ('i18n:"', NAV_RE),
        (r'\bt\("', CALL_RE),
    ):
        declared = len(re.findall(marker, html))
        found = len(pattern.findall(html))
        if declared != found:
            raise SystemExit(
                "extract-strings: %d %r declarations but %d parsed — the pattern "
                "needs updating before this tool can be trusted" % (declared, marker, found)
            )

    for _tag, _attrs, key, text in TEXT_RE.findall(html):
        add(english, key, unescape(text.strip()), "markup text")
        where[key] = "markup"

    for _tag, attrs, spec in ATTR_HOST_RE.findall(html):
        for pair in spec.split(";"):
            if not pair.strip():
                continue
            attr, _, key = pair.partition(":")
            attr, key = attr.strip(), key.strip()
            if not attr or not key:
                raise SystemExit("extract-strings: malformed data-i18n-attr %r" % spec)
            # The English is read off THIS element, never off a catalogue and never
            # off the first element that happens to carry the same attribute name:
            # three elements carry aria-label and only one of them says "Search".
            found = re.search(r'\b%s="([^"]*)"' % re.escape(attr), attrs)
            if not found:
                raise SystemExit(
                    'extract-strings: the element declaring "%s" has no %s attribute'
                    % (key, attr)
                )
            add(english, key, unescape(found.group(1)), "markup attribute")
            where[key] = "markup attribute " + attr

    for _id, label, key in NAV_RE.findall(html):
        add(english, key, unescape(label), "nav table")
        where[key] = "nav table"

    for key, text in CALL_RE.findall(html):
        add(english, key, unescape(text), "call site")
        where[key] = "call site"

    return english, where


# --------------------------------------------------------------------- rendering

def dump(table):
    return json.dumps(table, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def inline(merged):
    return json.dumps(merged, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def read_json(path):
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit("extract-strings: %s is not valid JSON (%s)" % (path, exc))


# ------------------------------------------------------------------------- check

def check(html, english, where):
    problems = []

    on_disk = read_json(LOCALES / "en.json")
    if on_disk != english:
        missing = sorted(set(english) - set(on_disk or {}))
        extra = sorted(set(on_disk or {}) - set(english))
        changed = sorted(
            k for k in set(english) & set(on_disk or {}) if english[k] != on_disk[k]
        )
        problems.append(
            "src/locales/en.json is not what the source declares "
            "(%d missing %s, %d orphaned %s, %d with different English %s)"
            % (len(missing), missing[:4], len(extra), extra[:4], len(changed), changed[:4])
        )

    tables = {FALLBACK: english}
    for lang in LANGS:
        if lang == FALLBACK:
            continue
        table = read_json(LOCALES / ("%s.json" % lang))
        if table is None:
            problems.append("src/locales/%s.json is missing" % lang)
            continue
        missing = sorted(set(english) - set(table))
        extra = sorted(set(table) - set(english))
        if missing:
            problems.append("%s.json is missing %d key(s): %s" % (lang, len(missing), missing[:4]))
        if extra:
            problems.append("%s.json has %d orphaned key(s): %s" % (lang, len(extra), extra[:4]))
        copied = sorted(k for k in set(table) & set(english) if table[k] == english[k])
        if copied:
            problems.append(
                "%s.json is untranslated for %d key(s): %s" % (lang, len(copied), copied[:4])
            )
        tables[lang] = table

    block = BLOCK_RE.search(html)
    if not block:
        problems.append("src/index.html has no <script id=\"i18n-data\"> block")
    elif block.group(1) != inline(tables):
        # Compared as TEXT, not as parsed JSON: a parsed comparison accepts a
        # hand-edited block that repeats a key, because the last one wins and the
        # two dictionaries then look identical.
        try:
            json.loads(block.group(1))
        except json.JSONDecodeError as exc:
            problems.append("the inline i18n-data block is not valid JSON (%s)" % exc)
        else:
            problems.append(
                "the inline i18n-data block is stale or hand-edited — run "
                "'python3 tools/extract-strings.py --write'"
            )

    if problems:
        print("extract-strings: %d problem(s)\n" % len(problems))
        for problem in problems:
            print("  - " + problem)
        return 1

    print(
        "extract-strings: %d keys x %d languages in sync (%s)"
        % (len(english), len(LANGS), ", ".join(LANGS))
    )
    return 0


# ------------------------------------------------------------------------- write

def write(html, english):
    tables = {FALLBACK: english}
    for lang in LANGS:
        if lang == FALLBACK:
            continue
        table = read_json(LOCALES / ("%s.json" % lang))
        if table is None:
            raise SystemExit(
                "extract-strings: src/locales/%s.json does not exist — a new language "
                "is added by hand once, then kept in sync by this tool" % lang
            )
        tables[lang] = {k: table.get(k, english[k]) for k in english}

    LOCALES.mkdir(parents=True, exist_ok=True)
    (LOCALES / "en.json").write_text(dump(english), encoding="utf-8")

    block = BLOCK_RE.search(html)
    if not block:
        raise SystemExit('extract-strings: src/index.html has no i18n-data block to fill')
    new_html = (
        html[: block.start(1)] + inline(tables) + html[block.end(1):]
    )
    if new_html != html:
        SRC.write_text(new_html, encoding="utf-8")

    print(
        "extract-strings: wrote src/locales/en.json and the inline block — "
        "%d keys x %d languages" % (len(english), len(LANGS))
    )
    return 0


def main(argv):
    if not SRC.exists():
        print("extract-strings: %s not found" % SRC, file=sys.stderr)
        return 2
    html = SRC.read_text(encoding="utf-8")
    english, where = read_source(html)

    mode = argv[1] if len(argv) > 1 else "--print"
    if mode == "--check":
        return check(html, english, where)
    if mode == "--write":
        return write(html, english)
    if mode == "--print":
        for key in sorted(english):
            print("%-28s %s" % (key, english[key]))
        print("\n%d keys (%s)" % (len(english), ", ".join(sorted(set(where.values())))))
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
