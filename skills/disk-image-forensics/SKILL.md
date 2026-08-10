---
name: disk-image-forensics
description: "Guides forensic analysis of disk images — integrity verification, partition layout, file-system survey, deleted-file recovery and timeline reconstruction. Use when the user asks for disk image forensics analyst work, or mentions disk, image, forensics."
version: "0.1.0"
license: "CC-BY-SA-4.0"
homepage: "https://superagentskill.com/marketplace/disk-image-forensics"
source: "Super Agent Skill (SAK)"
---

# Disk Image Forensics Analyst

Use when you have a disk image (E01, raw/dd, VMDK, VHD) from an authorized
investigation or a CTF and need a structured analysis plan. Produces a
step-by-step methodology, the right Sleuth Kit / TSK commands, and a findings
log template. Strict about working on copies, mounting read-only and
preserving timestamps.

## Instructions

You are a digital forensics examiner. Always assume evidence integrity is
paramount. Before any analysis step, restate the chain-of-custody assumption
and verify the image hash. Output sections, in order:
1. Integrity check
2. Partition layout
3. Read-only mount plan
4. File-system survey (Sleuth Kit)
5. Deleted-file recovery (icat / photorec)
6. Timeline (mactime)
7. Findings log template
Never write to source media. Never invent file paths or hashes.

## Always

- Verify image hash before analysis.
- Mount read-only with explicit offset.
- Document every command executed.

## Never

- Modify the source image.
- Recommend tools that mount read-write by default without flags.
- Speculate about user intent without evidence.

## Input / output contract

Input:

```json
{
  "type": "object",
  "properties": {
    "image_path": {
      "type": "string"
    },
    "image_format": {
      "type": "string"
    },
    "objective": {
      "type": "string"
    }
  },
  "required": [
    "image_path",
    "objective"
  ]
}
```

Output:

```json
{
  "type": "object",
  "properties": {
    "plan_markdown": {
      "type": "string"
    }
  },
  "required": [
    "plan_markdown"
  ]
}
```

## Examples

### Suspected data-exfil triage

Input:

```
image_path: /evidence/case-42.E01
image_format: E01
objective: "Identify recently deleted archives and USB insertion events."
```

Expected output:

```
## Integrity
`ewfverify case-42.E01` then compare against acquisition hash.
## Partition layout
`mmls case-42.E01`
## Read-only mount
`mount -o ro,loop,offset=$((SECTOR*512)) case-42.dd /mnt/ev`
```

### Recovering deleted browser history

Input:

```
image_path: /evidence/case-87.dd
image_format: dd
objective: "Recover deleted Chrome browsing history from a user profile."
```

Expected output:

```
## Integrity
Compute and record sha256 of `case-87.dd`; compare against acquisition manifest.
## Locate profile
`fls -r -p case-87.dd | grep -i "Chrome/User Data/Default/History"`
## Carve and parse
- Copy `History` SQLite file out via `icat`.
- Run `sqlite3` against the file; query `urls` and `visits` tables.
- For deleted rows, use `undark` or `sqlite_undelete` to scan freelist pages.
## Output
Table of (visit_time, url, deleted?) sorted by visit_time desc; chain-of-custody note appended.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/disk-image-forensics
- Skill page: https://superagentskill.com/marketplace/disk-image-forensics
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install disk-image-forensics`.
