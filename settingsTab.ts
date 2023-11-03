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
    let { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Date format')
      .setDesc('Format for the block ID date (using moment.js format)')
      .addText(text => text
        .setPlaceholder('YYYY-MM-DDTHH-mm-ss')
        .setValue(this.plugin.settings.dateFormat)
        .onChange(async (value) => {
          this.plugin.settings.dateFormat = value;
          await this.plugin.saveSettings();
        }));
  }
}
