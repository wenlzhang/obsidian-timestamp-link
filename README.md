# Timestamp Link

[![GitHub release (Latest by date)](https://img.shields.io/github/v/release/wenlzhang/obsidian-timestamp-link)](https://github.com/wenlzhang/obsidian-block-timestamp-link/releases) ![GitHub all releases](https://img.shields.io/github/downloads/wenlzhang/obsidian-timestamp-link/total?color=success)

An [Obsidian](https://obsidian.md/) plugin to copy timestamped links to blocks, headings and notes.

## Features



## Notes

Timestamp Link uses [moment.js](https://momentjs.com/docs/#/displaying/format/) to format the date and time to be appended.

- For example, if `20230101120030` is the desired text to be appended, then `YYYYMMDDHHmmss` needs to be configured in settings.
- In addition, **square brackets** are needed to surround the content that is not part of the format string.
- On the other hand, symboles such as `:` **cannot be used** in Obsidian as block IDs. Therefore, one should experiment the proper format for the timestamp.

## Credits

- [Obsidian: Copy Block Link](https://github.com/mgmeyers/obsidian-copy-block-link)
    - This plugin serves as a starting template.

## Support me

<a href='https://ko-fi.com/C0C66C1TB' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
