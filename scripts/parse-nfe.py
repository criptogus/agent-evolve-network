#!/usr/bin/env python3
"""Bounded NF-e source reader. No entity/DTD/network resolution or fiscal authorization."""
import hashlib
import json
import platform
import re
import sys
import xml.etree.ElementTree as ET
from decimal import Decimal
from xml.parsers import expat

PROFILE = {"python": "3.12.15", "architecture": "arm64", "expat": "expat_2.7.4"}
MAX_BYTES = 200000

def runtime():
    return {"python": platform.python_version(), "architecture": platform.machine(), "expat": expat.EXPAT_VERSION}

def local(name):
    return name.rsplit("}", 1)[-1]

def deny(*_):
    raise ValueError("DTD/entity declarations and external resolution are prohibited")

def one(parent, name):
    values = [c for c in parent if local(c.tag) == name]
    if len(values) != 1:
        raise ValueError("Required NF-e field absent or ambiguous")
    return values[0]

def parse_root(text, start):
    builder = ET.TreeBuilder()
    parser = expat.ParserCreate(namespace_separator="}")
    depth = nodes = 0
    complete = False
    root_end = None
    def start_element(name, attrs):
        nonlocal depth, nodes
        depth += 1
        nodes += 1
        if depth > 64 or nodes > 10000:
            raise ValueError("XML structural limit exceeded")
        builder.start("{" + name if "}" in name else name, attrs)
    def end_element(name):
        nonlocal depth, complete, root_end
        builder.end("{" + name if "}" in name else name)
        depth -= 1
        complete = depth == 0
        if complete:
            root_end = parser.CurrentByteIndex
    parser.StartElementHandler = start_element
    parser.EndElementHandler = end_element
    parser.CharacterDataHandler = lambda data: None if complete else builder.data(data)
    parser.StartDoctypeDeclHandler = deny
    parser.EntityDeclHandler = deny
    parser.ExternalEntityRefHandler = deny
    parser.SetParamEntityParsing(expat.XML_PARAM_ENTITY_PARSING_NEVER)
    raw = text[start:].encode("utf8")
    try:
        parser.Parse(raw, True)
    except expat.ExpatError as exc:
        # A completed embedded XML document may be followed by narrative or another export.
        if not complete or exc.code != expat.errors.codes[expat.errors.XML_ERROR_JUNK_AFTER_DOC_ELEMENT]:
            raise
    if not complete or root_end is None:
        raise ValueError("Truncated XML source")
    end = raw.find(b">", root_end) + 1 if raw[root_end:root_end + 2] == b"</" else root_end
    if not 0 < end <= len(raw):
        raise ValueError("Unbound XML document boundary")
    return builder.close(), start + len(raw[:end].decode("utf8"))

def require_plain_gap(gap):
    # Only narrative, XML declarations and complete comments may surround an embedded export.
    plain = re.sub(r"<\?xml\b[^?]*\?>|<!--[\s\S]*?-->", "", gap)
    if re.search(r"<[^\s>]", plain):
        raise ValueError("Unsupported or unparsed XML document outside invoice roots")

def evaluate(text):
    if not isinstance(text, str) or not text.strip() or len(text.encode("utf8")) > MAX_BYTES:
        raise ValueError("Nonempty bounded XML source required")
    if "\x00" in text or re.search(r"<!\s*(?:DOCTYPE|ENTITY)", text, re.I):
        deny()
    invoices = []
    cursor = 0
    root_pattern = re.compile(r"<(?:[A-Za-z_][\w.-]*:)?(?:nfeProc|NFe)\b")
    while True:
        match = root_pattern.search(text, cursor)
        if match is None:
            require_plain_gap(text[cursor:])
            break
        require_plain_gap(text[cursor:match.start()])
        root, cursor = parse_root(text, match.start())
        if local(root.tag) not in ("nfeProc", "NFe"):
            raise ValueError("Unsupported XML document root")
        infos = [e for e in root.iter() if local(e.tag) == "infNFe"]
        if len(infos) != 1:
            raise ValueError("One explicit invoice identity per XML document required")
        info = infos[0]
        identifier = info.get("Id", "")
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", identifier):
            raise ValueError("Explicit bounded invoice Id required")
        raw_amount = (one(one(one(info, "total"), "ICMSTot"), "vNF").text or "").strip()
        if not re.fullmatch(r"\d{1,16}(?:\.\d{1,2})?", raw_amount):
            raise ValueError("Exact nonnegative BRL minor-unit amount required")
        minor = int(Decimal(raw_amount) * 100)
        quote = text[match.start():cursor]
        invoices.append({"id": identifier, "amount_minor": str(minor), "xml_quote": quote, "xml_sha256": hashlib.sha256(quote.encode("utf8")).hexdigest(), "fiscal_authorization_verified": False})
        if len(invoices) > 32:
            raise ValueError("XML document limit exceeded")
    if not invoices:
        raise ValueError("No supported NF-e XML documents supplied")
    return {"runtime": runtime(), "source_sha256": hashlib.sha256(text.encode("utf8")).hexdigest(), "invoices": invoices, "fiscal_authorization_verified": False}

def main():
    try:
        if runtime() != PROFILE:
            raise ValueError("Pinned XML runtime mismatch")
        raw = sys.stdin.read(MAX_BYTES * 2 + 1)
        if len(raw.encode("utf8")) > MAX_BYTES * 2:
            raise ValueError("Input limit exceeded")
        result = evaluate(json.loads(raw)["text"])
        sys.stdout.write(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n")
        return 0
    except (ValueError, KeyError, TypeError, expat.ExpatError, ET.ParseError):
        sys.stderr.write(json.dumps({"status": "invalid_xml_source", "error": "XML source or pinned parser contract rejected; no interpretation or external action started"}) + "\n")
        return 2
if __name__ == "__main__":
    sys.exit(main())
