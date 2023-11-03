import {
  Editor,
  EditorPosition,
  HeadingCache,
  ListItemCache,
  MarkdownView,
  Plugin,
  SectionCache,
  TFile,
  moment,
  PluginSettingTab,
  Setting,
  App,
} from "obsidian";

interface MyPluginSettings {
  dateFormat: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  dateFormat: 'YYYY-MM-DDTHH-mm-ss',
};

const illegalHeadingCharsRegex = /[!"#$%&()*+,.:;<=>?@^`{|}~\/\[\]\\]/g;
function sanitizeHeading(heading: string) {
  return heading
    .replace(illegalHeadingCharsRegex, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldInsertAfter(block: ListItemCache | SectionCache) {
  if ((block as any).type) {
    return [
      "blockquote",
      "code",
      "table",
      "comment",
      "footnoteDefinition",
    ].includes((block as SectionCache).type);
  }
}

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;

  async onload() {
    await this.loadSettings();

    this.addSettingTab(new MyPluginSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        const block = this.getBlock(editor, view.file);

        if (!block) return;

        const isHeading = !!(block as any).heading;

        const onClick = (isEmbed: boolean) => {
          if (isHeading) {
            this.handleHeading(view.file, block as HeadingCache, isEmbed);
          } else {
            this.handleBlock(
              view.file,
              editor,
              block as SectionCache | ListItemCache,
              isEmbed
            );
          }
        };

        menu.addItem((item) => {
          item
            .setTitle(isHeading ? "Copy link to heading" : "Copy link to block")
            .setIcon("links-coming-in")
            .onClick(() => onClick(false));
        });

        menu.addItem((item) => {
          item
            .setTitle(isHeading ? "Copy heading embed" : "Copy block embed")
            .setIcon("links-coming-in")
            .onClick(() => onClick(true));
        });
      })
    );

    this.addCommand({
      id: "copy-link-to-block",
      name: "Copy link to current block or heading",
      editorCheckCallback: (isChecking, editor, view) => {
        return this.handleCommand(isChecking, editor, view, false);
      },
    });

    this.addCommand({
      id: "copy-embed-to-block",
      name: "Copy embed to current block or heading",
      editorCheckCallback: (isChecking, editor, view) => {
        return this.handleCommand(isChecking, editor, view, true);
      },
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  generateId(): string {
    return moment().format(this.settings.dateFormat);
  }

  handleCommand(
    isChecking: boolean,
    editor: Editor,
    view: MarkdownView,
    isEmbed: boolean
  ) {
    if (isChecking) {
      return !!this.getBlock(editor, view.file);
    }

    const block = this.getBlock(editor, view.file);

    if (!block) return;

    const isHeading = !!(block as any).heading;

    if (isHeading) {
      this.handleHeading(view.file, block as HeadingCache, isEmbed);
    } else {
      this.handleBlock(
        view.file,
        editor,
        block as SectionCache | ListItemCache,
        isEmbed
      );
    }
  }

  getBlock(editor: Editor, file: TFile) {
    const cursor = editor.getCursor("to");
    const fileCache = this.app.metadataCache.getFileCache(file);

    let block: ListItemCache | HeadingCache | SectionCache = (
      fileCache?.sections || []
    ).find((section) => {
      return (
        section.position.start.line <= cursor.line &&
        section.position.end.line >= cursor.line
      );
    });

    if (block?.type === "list") {
      block = (fileCache?.listItems || []).find((item) => {
        return (
          item.position.start.line <= cursor.line &&
          item.position.end.line >= cursor.line
        );
      });
    } else if (block?.type === "heading") {
      block = fileCache.headings.find((heading) => {
        return heading.position.start.line === block.position.start.line;
      });
    }

    return block;
  }

  handleHeading(file: TFile, block: HeadingCache, isEmbed: boolean) {
    navigator.clipboard.writeText(
      `${isEmbed ? "!" : ""}${this.app.fileManager.generateMarkdownLink(
        file,
        "",
        "#" + sanitizeHeading(block.heading)
      )}`
    );
  }

  handleBlock(
    file: TFile,
    editor: Editor,
    block: ListItemCache | SectionCache,
    isEmbed: boolean
  ) {
    const blockId = block.id;

    // Copy existing block id
    if (blockId) {
      return navigator.clipboard.writeText(
        `${isEmbed ? "!" : ""}${this.app.fileManager.generateMarkdownLink(
          file,
          "",
          "#^" + blockId
        )}`
      );
    }

    // Add a block id
    const sectionEnd = block.position.end;
    const end: EditorPosition = {
      ch: sectionEnd.col,
      line: sectionEnd.line,
    };

    const id = this.generateId();
    const spacer = shouldInsertAfter(block) ? "\n\n" : " ";

    editor.replaceRange(`${spacer}^${id}`, end);
    navigator.clipboard.writeText(
      `${isEmbed ? "!" : ""}${this.app.fileManager.generateMarkdownLink(
        file,
        "",
        "#^" + id
      )}`
    );
  }
}

class MyPluginSettingTab extends PluginSettingTab {
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
