import {
  PluginSettingTab,
  Setting,
  App,
} from "obsidian";

import {
  MyPluginSettings,
} from "./settings";
import MyPlugin from "./main";

export class MyPluginSettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
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
        .setValue(this.plugin.settings.dateFormat)
        .onChange(async (value) => {
          this.plugin.settings.dateFormat = value;
          await this.plugin.saveSettings();
        }));
  }
}
