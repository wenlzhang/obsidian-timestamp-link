import {
  PluginSettingTab,
  Setting,
  App,
} from "obsidian";

import TimestampLink from "./main";

export class TimestampLinkSettingTab extends PluginSettingTab {
  plugin: TimestampLink;

  constructor(app: App, plugin: TimestampLink) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    this.containerEl.empty();

    this.containerEl.createEl("h3", {
        text: "Please try reopening the vault or restarting Obsidian if the following setting changes do not take effect.",
    });

    new Setting(this.containerEl)
      .setName('Block ID format')
      .setDesc('MomentJS format, e.g., YYYYMMDDHHmmss)')
      .addText(text => text
        .setPlaceholder('YYYY-MM-DDTHH-mm-ss')
        .setValue(this.plugin.settings.blockIDDateFormat)
        .onChange(async (value) => {
          this.plugin.settings.blockIDDateFormat = value;
          await this.plugin.saveSettings();
        }));
    
    new Setting(this.containerEl)
    .setName('Append text format')
    .setDesc('Text to be appended after the copied note link. MomentJS format, e.g., [📝 ]YYYY-MM-DDTHH:mm)')
    .addText(text => text
      .setPlaceholder('YYYY-MM-DDTHH-mm-ss')
      .setValue(this.plugin.settings.appendTextDateFormat)
      .onChange(async (value) => {
        this.plugin.settings.appendTextDateFormat = value;
        await this.plugin.saveSettings();
      }));
  
    new Setting(this.containerEl)
      .setName('UID field name')
      .setDesc('Frontmatter field name to use for unique identifier (for advanced URI links)')
      .addText(text => text
        .setPlaceholder('uuid')
        .setValue(this.plugin.settings.uidField)
        .onChange(async (value) => {
          this.plugin.settings.uidField = value;
          await this.plugin.saveSettings();
        }));
  
  }
}
