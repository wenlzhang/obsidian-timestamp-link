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
} from "obsidian";

import { DEFAULT_SETTINGS, MyPluginSettings } from "./settings";
import { MyPluginSettingTab } from "./settingsTab";

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
    console.log("loading Timestamp Link");
    await this.loadSettings();

    this.addSettingTab(new MyPluginSettingTab(this.app, this));

    // this.registerEvent(
    //   this.app.workspace.on("editor-menu", (menu, editor, view) => {
    //     const block = this.getBlock(editor, view.file);

    //     if (!block) return;

    //     const isHeading = !!(block as any).heading;

    //     const onClick = (isEmbed: boolean) => {
    //       if (isHeading) {
    //         this.handleHeading(view.file, block as HeadingCache, isEmbed);
    //       } else {
    //         this.handleBlock(
    //           view.file,
    //           editor,
    //           block as SectionCache | ListItemCache,
    //           isEmbed
    //         );
    //       }
    //     };

    //     menu.addItem((item) => {
    //       item
    //         .setTitle(isHeading ? "Copy link to heading" : "Copy link to block")
    //         .setIcon("links-coming-in")
    //         .onClick(() => onClick(false));
    //     });

    //     menu.addItem((item) => {
    //       item
    //         .setTitle(isHeading ? "Copy heading embed" : "Copy block embed")
    //         .setIcon("links-coming-in")
    //         .onClick(() => onClick(true));
    //     });
    //   })
    // );

    // Add commands

    this.addCommand({
      id: "copy-block-heading-link",
      name: "Copy block/heading link",
      editorCheckCallback: (isChecking, editor, view) => {
        return this.handleCommand(isChecking, editor, view, false);
      },
    });

    this.addCommand({
      id: "copy-block-heading-embed",
      name: "Copy block/heading embed",
      editorCheckCallback: (isChecking, editor, view) => {
        return this.handleCommand(isChecking, editor, view, true);
      },
    });

    this.addCommand({
      id: "copy-block-heading-link-append-text",
      name: "Copy block/heading link & append text",
      editorCheckCallback: (isChecking, editor, view) => {
        return this.handleCommandAppend(isChecking, editor, view, false);
      },
    });

    this.addCommand({
      id: "copy-block-heading-embed-append-text",
      name: "Copy block/heading embed & append text",
      editorCheckCallback: (isChecking, editor, view) => {
        return this.handleCommandAppend(isChecking, editor, view, true);
      },
    });

    this.addCommand({
      id: "copy-note-link",
      name: "Copy note link",
      editorCheckCallback: (isChecking, editor, view) => {
        return this.handleCommandNote(isChecking, editor, view);
      },
    });

    this.addCommand({
      id: "copy-note-link-append-text",
      name: "Copy note link & append text",
      editorCheckCallback: (isChecking, editor, view) => {
        return this.handleCommandNoteAppend(isChecking, editor, view);
      },
    });

  }

  generateId(): string {
    return moment().format(this.settings.blockIDDateFormat);
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

  handleCommandAppend(
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
      this.handleHeadingAppend(view.file, block as HeadingCache, isEmbed);
    } else {
      this.handleBlockAppend(
        view.file,
        editor,
        block as SectionCache | ListItemCache,
        isEmbed
      );
    }
  }

  handleCommandNote(
    isChecking: boolean,
    editor: Editor,
    view: MarkdownView
  ) {
    if (isChecking) {
      return true; // Always enable the command
    }

    const file = view.file;
    if (file) {
      const link = this.app.fileManager.generateMarkdownLink(file, file.basename);
      navigator.clipboard.writeText(link);
    }
  }

  handleCommandNoteAppend(
    isChecking: boolean,
    editor: Editor,
    view: MarkdownView
  ) {
    if (isChecking) {
      return true; // Always enable the command
    }
  
    const file = view.file;
    if (file) {
      const link = this.app.fileManager.generateMarkdownLink(file, file.basename);
      const appendText = moment().format(this.settings.appendTextDateFormat);
      navigator.clipboard.writeText(`${link} ${appendText}`);
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

  handleHeadingAppend(file: TFile, block: HeadingCache, isEmbed: boolean) {
    const link = this.app.fileManager.generateMarkdownLink(
      file,
      "",
      "#" + sanitizeHeading(block.heading)
    );
    const appendText = `${moment().format(this.settings.appendTextDateFormat)}`;

    navigator.clipboard.writeText(
      `${isEmbed ? "!" : ""}${link} ${appendText}`
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

  handleBlockAppend(
    file: TFile,
    editor: Editor,
    block: ListItemCache | SectionCache,
    isEmbed: boolean
  ) {
    const blockId = block.id;

    // Copy existing block id
    if (blockId) {
      const link = this.app.fileManager.generateMarkdownLink(
        file,
        "",
        "#^" + blockId
      )
      const appendText = `${moment().format(this.settings.appendTextDateFormat)}`;
      return navigator.clipboard.writeText(
        `${isEmbed ? "!" : ""}${link} ${appendText}`
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
    const linkAdd = this.app.fileManager.generateMarkdownLink(
      file,
      "",
      "#^" + id
    )
    const appendTextAdd = `${moment().format(this.settings.appendTextDateFormat)}`;
    navigator.clipboard.writeText(
      `${isEmbed ? "!" : ""}${linkAdd} ${appendTextAdd}`
    );
  }

  onunload(): void {
      console.log("unloading Timestamp Link");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

}
