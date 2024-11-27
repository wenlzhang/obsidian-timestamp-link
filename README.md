# Timestamp Link

[![GitHub release (Latest by date)](https://img.shields.io/github/v/release/wenlzhang/obsidian-timestamp-link)](https://github.com/wenlzhang/obsidian-timestamp-link/releases) ![GitHub all releases](https://img.shields.io/github/downloads/wenlzhang/obsidian-timestamp-link/total?color=success)

An [Obsidian](https://obsidian.md/) plugin to copy timestamped links to blocks, headings and notes.

## Features

- Copy timestamped links to blocks, and append timestamp
    - E.g., `[[Note#^20230101120030]]`
    - E.g., `[[Note#^20230101120030]] 📝 2023-11-04T12:00`
- Copy links to headings, and append timestamp
    - E.g., `[[Note#Heading]]`
    - E.g., `[[Note#Heading]] 📝 2023-11-04T12:00`
- Copy links to notes, and append timestamp
    - E.g., `[[Note]]`
    - E.g., `[[Note]] 📝 2023-11-04T12:00`

## The story behind this plugin

[Obsidian Timestamp Link](https://exp.ptkm.net/obsidian-timestamp-link) was crafted with two [PTKM Core Principles](https://exp.ptkm.net/ptkm-core-principles) that shape its functionality:

- **Context Preservation**: Ensuring no valuable information is lost
- **Linking Everything**: Allowing seamless navigation

Adding timestamps to links provides valuable context. For example, in the slip-box method, users can create entry notes to gather links related to similar topics.

By including timestamp information, you can easily see when each block link was created and when note links were inserted into the entry notes, enhancing your understanding of the timeline and evolution of your ideas.

## Usage

Timestamp Link uses [moment.js](https://momentjs.com/docs/#/displaying/format/) to format the date and time to be appended.

- For example, if `20230101120030` is the desired text to be appended, then `YYYYMMDDHHmmss` needs to be configured in settings.
- In addition, **square brackets** are needed to surround the content that is not part of the format string.
- On the other hand, symboles such as `:` **cannot be used** in Obsidian as block IDs. Therefore, one should experiment the proper format for the timestamp.

## Credits

- [Obsidian: Copy Block Link](https://github.com/mgmeyers/obsidian-copy-block-link)
    - This plugin serves as a starting template.

## Support me

If you find this plugin helpful, consider [sponsoring my work](https://github.com/sponsors/wenlzhang) or

<a href='https://ko-fi.com/C0C66C1TB' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee' /></a>
