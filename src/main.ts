import {
  Editor,
  EditorPosition,
  HeadingCache,
  ListItemCache,
  MarkdownView,
  Notice,
  Plugin,
  SectionCache,
  TFile,
  moment,
} from "obsidian";

import { DEFAULT_SETTINGS, TimestampLinkSettings } from "./settings";
import { TimestampLinkSettingTab } from "./settingsTab";

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

export default class TimestampLink extends Plugin {
  settings: TimestampLinkSettings;

  async onload() {
    console.log("loading Timestamp Link");
    await this.loadSettings();

    this.addSettingTab(new TimestampLinkSettingTab(this.app, this));

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

    this.addCommand({
      id: "copy-advanced-uri-block-heading",
      name: "Copy advanced URI to block/heading",
      editorCheckCallback: (isChecking, editor, view) => {
        if (isChecking) {
          return !!this.getBlock(editor, view.file);
        }
        this.handleCommandAdvancedUri(isChecking, editor, view);
        return true;
      },
    });

    this.addCommand({
      id: "copy-advanced-uri-block-heading-append-text",
      name: "Copy advanced URI to block/heading & append text",
      editorCheckCallback: (isChecking, editor, view) => {
        if (isChecking) {
          return !!this.getBlock(editor, view.file);
        }
        this.handleCommandAdvancedUriAppend(isChecking, editor, view);
        return true;
      },
    });

    this.addCommand({
      id: "copy-advanced-uri-note",
      name: "Copy advanced URI to note",
      editorCheckCallback: (isChecking, editor, view) => {
        if (isChecking) {
          return true;
        }
        this.handleCommandNoteAdvancedUri(isChecking, editor, view);
        return true;
      },
    });

    this.addCommand({
      id: "copy-advanced-uri-note-append-text",
      name: "Copy advanced URI to note & append text",
      editorCheckCallback: (isChecking, editor, view) => {
        if (isChecking) {
          return true;
        }
        this.handleCommandNoteAdvancedUriAppend(isChecking, editor, view);
        return true;
      },
    });

  }

  generateId(): string {
    return moment().format(this.settings.blockIDDateFormat);
  }

  generateUUID(): string {
    // Using the exact same UUID generation method as Advanced URI plugin
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  async ensureUidInFrontmatter(file: TFile, editor: Editor): Promise<string | null> {
    // @ts-ignore
    const advancedUriPlugin = this.app.plugins?.getPlugin("obsidian-advanced-uri");
    if (!advancedUriPlugin) return null;

    // Store current cursor position
    const currentCursor = editor.getCursor();

    const fileCache = this.app.metadataCache.getFileCache(file);
    const frontmatter = fileCache?.frontmatter;

    // Check for UUID field and ensure it has a value
    const existingUid = frontmatter?.[this.settings.uidField];
    if (existingUid && existingUid.trim() !== "") {
      return existingUid;
    }

    // Generate new UID
    const newUid = this.generateUUID();

    try {
      // Add or update frontmatter using the processFrontMatter method
      // @ts-ignore
      await this.app.fileManager.processFrontMatter(file, (frontmatter: any) => {
        frontmatter = frontmatter || {};
        frontmatter[this.settings.uidField] = newUid;
      });

      // Restore cursor position
      editor.setCursor(currentCursor);

      return newUid;
    } catch (error) {
      console.error("Error updating frontmatter:", error);
      return null;
    }
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

  async generateAdvancedUriToBlock(blockId: string, file: TFile, editor: Editor): Promise<string> {
    // @ts-ignore
    const advancedUriPlugin = this.app.plugins?.getPlugin("obsidian-advanced-uri");
    if (!advancedUriPlugin) return "";

    // @ts-ignore
    const useUid = advancedUriPlugin.settings?.useUID || false;

    const vaultName = this.app.vault.getName();

    if (useUid) {
      // Ensure UID exists in frontmatter
      const uid = await this.ensureUidInFrontmatter(file, editor);
      if (!uid) {
        return "";
      }

      // Build the URI with proper encoding
      const params = new URLSearchParams();
      params.set("vault", vaultName);
      params.set("uid", uid);
      params.set("block", blockId);

      // Convert + to %20 in the final URL
      const queryString = params.toString().replace(/\+/g, "%20");
      return `obsidian://adv-uri?${queryString}`;
    } else {
      // If not using UID, use file path
      const params = new URLSearchParams();
      params.set("vault", vaultName);
      params.set("filepath", file.path);
      params.set("block", blockId);

      // Convert + to %20 in the final URL
      const queryString = params.toString().replace(/\+/g, "%20");
      return `obsidian://adv-uri?${queryString}`;
    }
  }

  async generateAdvancedUriToHeading(heading: string, file: TFile, editor: Editor): Promise<string> {
    // @ts-ignore
    const advancedUriPlugin = this.app.plugins?.getPlugin("obsidian-advanced-uri");
    if (!advancedUriPlugin) return "";

    // @ts-ignore
    const useUid = advancedUriPlugin.settings?.useUID || false;

    const vaultName = this.app.vault.getName();

    if (useUid) {
      // Ensure UID exists in frontmatter
      const uid = await this.ensureUidInFrontmatter(file, editor);
      if (!uid) {
        return "";
      }

      // Build the URI with proper encoding
      const params = new URLSearchParams();
      params.set("vault", vaultName);
      params.set("uid", uid);
      params.set("heading", heading);

      // Convert + to %20 in the final URL
      const queryString = params.toString().replace(/\+/g, "%20");
      return `obsidian://adv-uri?${queryString}`;
    } else {
      // If not using UID, use file path
      const params = new URLSearchParams();
      params.set("vault", vaultName);
      params.set("filepath", file.path);
      params.set("heading", heading);

      // Convert + to %20 in the final URL
      const queryString = params.toString().replace(/\+/g, "%20");
      return `obsidian://adv-uri?${queryString}`;
    }
  }

  formatAdvancedUriAsMarkdown(uri: string, displayText: string): string {
    if (this.settings.advancedUriFormat === 'markdown') {
      return `[${displayText}](${uri})`;
    }
    return uri;
  }

  async generateAdvancedUriToFile(file: TFile, editor: Editor): Promise<string> {
    // @ts-ignore
    const advancedUriPlugin = this.app.plugins?.getPlugin("obsidian-advanced-uri");
    if (!advancedUriPlugin) return "";

    // @ts-ignore
    const useUid = advancedUriPlugin.settings?.useUID || false;

    const vaultName = this.app.vault.getName();

    if (useUid) {
      // Get or create UID in frontmatter
      const uid = await this.ensureUidInFrontmatter(file, editor);
      if (!uid) {
        return "";
      }

      // Build the URI with proper encoding
      const params = new URLSearchParams();
      params.set("vault", vaultName);
      params.set("uid", uid);

      // Convert + to %20 in the final URL
      const queryString = params.toString().replace(/\+/g, "%20");
      return `obsidian://adv-uri?${queryString}`;
    } else {
      // If not using UID, use file path
      const params = new URLSearchParams();
      params.set("vault", vaultName);
      params.set("filepath", file.path);

      // Convert + to %20 in the final URL
      const queryString = params.toString().replace(/\+/g, "%20");
      return `obsidian://adv-uri?${queryString}`;
    }
  }

  async handleCommandAdvancedUri(
    isChecking: boolean,
    editor: Editor,
    view: MarkdownView
  ) {
    if (isChecking) {
      return !!this.getBlock(editor, view.file);
    }

    // @ts-ignore
    const advancedUriPlugin = this.app.plugins?.getPlugin("obsidian-advanced-uri");
    if (!advancedUriPlugin) {
      new Notice("Advanced URI plugin is not installed or enabled");
      return;
    }

    const block = this.getBlock(editor, view.file);
    if (!block || !view.file) return;

    const isHeading = !!(block as any).heading;

    if (isHeading) {
      const heading = (block as HeadingCache).heading;
      const uri = await this.generateAdvancedUriToHeading(heading, view.file, editor);
      if (uri) {
        const displayText = `${view.file.basename}#${heading}`;
        const formattedUri = this.formatAdvancedUriAsMarkdown(uri, displayText);
        navigator.clipboard.writeText(formattedUri);
      } else {
        new Notice("Failed to generate advanced URI");
      }
    } else {
      await this.handleBlockAdvancedUri(view.file, editor, block as SectionCache | ListItemCache);
    }
  }

  async handleCommandAdvancedUriAppend(
    isChecking: boolean,
    editor: Editor,
    view: MarkdownView
  ) {
    if (isChecking) {
      return !!this.getBlock(editor, view.file);
    }

    // @ts-ignore
    const advancedUriPlugin = this.app.plugins?.getPlugin("obsidian-advanced-uri");
    if (!advancedUriPlugin) {
      new Notice("Advanced URI plugin is not installed or enabled");
      return;
    }

    const block = this.getBlock(editor, view.file);
    if (!block || !view.file) return;

    const isHeading = !!(block as any).heading;

    if (isHeading) {
      const heading = (block as HeadingCache).heading;
      const uri = await this.generateAdvancedUriToHeading(heading, view.file, editor);
      if (uri) {
        const displayText = `${view.file.basename}#${heading}`;
        const formattedUri = this.formatAdvancedUriAsMarkdown(uri, displayText);
        const appendText = moment().format(this.settings.appendTextDateFormat);
        navigator.clipboard.writeText(`${formattedUri} ${appendText}`);
      } else {
        new Notice("Failed to generate advanced URI");
      }
    } else {
      await this.handleBlockAdvancedUriAppend(view.file, editor, block as SectionCache | ListItemCache);
    }
  }

  async handleCommandNoteAdvancedUri(
    isChecking: boolean,
    editor: Editor,
    view: MarkdownView
  ) {
    if (isChecking) {
      return true; // Always enable the command
    }

    // @ts-ignore
    const advancedUriPlugin = this.app.plugins?.getPlugin("obsidian-advanced-uri");
    if (!advancedUriPlugin) {
      new Notice("Advanced URI plugin is not installed or enabled");
      return;
    }

    const file = view.file;
    if (file) {
      const uri = await this.generateAdvancedUriToFile(file, editor);
      if (uri) {
        const displayText = file.basename;
        const formattedUri = this.formatAdvancedUriAsMarkdown(uri, displayText);
        navigator.clipboard.writeText(formattedUri);
      } else {
        new Notice("Failed to generate advanced URI");
      }
    }
  }

  async handleCommandNoteAdvancedUriAppend(
    isChecking: boolean,
    editor: Editor,
    view: MarkdownView
  ) {
    if (isChecking) {
      return true; // Always enable the command
    }

    // @ts-ignore
    const advancedUriPlugin = this.app.plugins?.getPlugin("obsidian-advanced-uri");
    if (!advancedUriPlugin) {
      new Notice("Advanced URI plugin is not installed or enabled");
      return;
    }

    const file = view.file;
    if (file) {
      const uri = await this.generateAdvancedUriToFile(file, editor);
      if (uri) {
        const displayText = file.basename;
        const formattedUri = this.formatAdvancedUriAsMarkdown(uri, displayText);
        const appendText = moment().format(this.settings.appendTextDateFormat);
        navigator.clipboard.writeText(`${formattedUri} ${appendText}`);
      } else {
        new Notice("Failed to generate advanced URI");
      }
    }
  }

  async handleBlockAdvancedUri(
    file: TFile,
    editor: Editor,
    block: ListItemCache | SectionCache
  ) {
    const blockId = block.id;

    // Copy existing block id
    if (blockId) {
      const uri = await this.generateAdvancedUriToBlock(blockId, file, editor);
      if (uri) {
        const displayText = `${file.basename}#^${blockId}`;
        const formattedUri = this.formatAdvancedUriAsMarkdown(uri, displayText);
        navigator.clipboard.writeText(formattedUri);
      } else {
        new Notice("Failed to generate advanced URI");
      }
      return;
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
    const uri = await this.generateAdvancedUriToBlock(id, file, editor);
    if (uri) {
      const displayText = `${file.basename}#^${id}`;
      const formattedUri = this.formatAdvancedUriAsMarkdown(uri, displayText);
      navigator.clipboard.writeText(formattedUri);
    } else {
      new Notice("Failed to generate advanced URI");
    }
  }

  async handleBlockAdvancedUriAppend(
    file: TFile,
    editor: Editor,
    block: ListItemCache | SectionCache
  ) {
    const blockId = block.id;

    // Copy existing block id
    if (blockId) {
      const uri = await this.generateAdvancedUriToBlock(blockId, file, editor);
      if (uri) {
        const displayText = `${file.basename}#^${blockId}`;
        const formattedUri = this.formatAdvancedUriAsMarkdown(uri, displayText);
        const appendText = moment().format(this.settings.appendTextDateFormat);
        navigator.clipboard.writeText(`${formattedUri} ${appendText}`);
      } else {
        new Notice("Failed to generate advanced URI");
      }
      return;
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
    const uri = await this.generateAdvancedUriToBlock(id, file, editor);
    if (uri) {
      const displayText = `${file.basename}#^${id}`;
      const formattedUri = this.formatAdvancedUriAsMarkdown(uri, displayText);
      const appendText = moment().format(this.settings.appendTextDateFormat);
      navigator.clipboard.writeText(`${formattedUri} ${appendText}`);
    } else {
      new Notice("Failed to generate advanced URI");
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
