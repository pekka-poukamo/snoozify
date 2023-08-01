# Snoozify

A tool for snoozing tabs. Developed for personal use, out of frustration for existing tab snooze extensions.

Hold shift to see the snooze options for following date.

## Warnings

There are no automatic tests and there might be bugs. Don't rely on this for any critical information. As of March 2023, I'm using the published state daily so it *should* be fairly stable.

## Installing

Clone the package and follow instructions from [Chrome developer documentation](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked) to load the extension.

## This is FYI-style open source

This is FYI-style open source. I'm sharing it for interested parties, but without any stewardship commitment. Assume that my default response to issues and pull requests will be to ignore or close them without comment. If you do something interesting with this, though, please let me know.

## Todo

There's no commitment to working on or publishing these todo items.

- !CRITICAL! With current implementation, there's a practical limit to amount of tabs that can be snoozed: 
	
	> Snoozing pages failed {message: 'QUOTA_BYTES_PER_ITEM quota exceeded'}

	This would require refactoring the storage to support incremental updates or smaller byte size for the storage message


- Tests
- Add settings & time controls (e.g. wake up at 8:00)
- Styling & visual design
- "Later"-button
	- Only weekdays option
- Figure out long term solution for storage (limit the size of store messages)

## Design ideas
- https://randoma11y.com/
