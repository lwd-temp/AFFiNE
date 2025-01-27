import {
  focusTextModel,
  getInlineEditorByModel,
  markdownInput,
  textKeymap,
} from '@blocksuite/affine-components/rich-text';
import { ParagraphBlockSchema } from '@blocksuite/affine-model';
import {
  calculateCollapsedSiblings,
  matchFlavours,
} from '@blocksuite/affine-shared/utils';
import { KeymapExtension, TextSelection } from '@blocksuite/block-std';
import { IS_MAC } from '@blocksuite/global/env';

import { addParagraphCommand } from './commands/add-paragraph.js';
import {
  canDedentParagraphCommand,
  dedentParagraphCommand,
} from './commands/dedent-paragraph.js';
import {
  canIndentParagraphCommand,
  indentParagraphCommand,
} from './commands/indent-paragraph.js';
import { splitParagraphCommand } from './commands/split-paragraph.js';
import { forwardDelete } from './utils/forward-delete.js';
import { mergeWithPrev } from './utils/merge-with-prev.js';

export const ParagraphKeymapExtension = KeymapExtension(
  std => {
    return {
      Backspace: ctx => {
        const text = std.selection.find(TextSelection);
        if (!text) return;
        const isCollapsed = text.isCollapsed();
        const isStart = isCollapsed && text.from.index === 0;
        if (!isStart) return;

        const { store } = std;
        const model = store.getBlock(text.from.blockId)?.model;
        if (!model || !matchFlavours(model, ['affine:paragraph'])) return;

        const event = ctx.get('keyboardState').raw;
        event.preventDefault();

        // When deleting at line start of a paragraph block,
        // firstly switch it to normal text, then delete this empty block.
        if (model.type !== 'text') {
          // Try to switch to normal text
          store.captureSync();
          store.updateBlock(model, { type: 'text' });
          return true;
        }

        const merged = mergeWithPrev(std.host, model);
        if (merged) {
          return true;
        }

        std.command
          .chain()
          .pipe(canDedentParagraphCommand)
          .pipe(dedentParagraphCommand)
          .run();
        return true;
      },
      'Mod-Enter': ctx => {
        const { store } = std;
        const text = std.selection.find(TextSelection);
        if (!text) return;
        const model = store.getBlock(text.from.blockId)?.model;
        if (!model || !matchFlavours(model, ['affine:paragraph'])) return;
        const inlineEditor = getInlineEditorByModel(
          std.host,
          text.from.blockId
        );
        const inlineRange = inlineEditor?.getInlineRange();
        if (!inlineRange || !inlineEditor) return;
        const raw = ctx.get('keyboardState').raw;
        raw.preventDefault();
        if (model.type === 'quote') {
          store.captureSync();
          inlineEditor.insertText(inlineRange, '\n');
          inlineEditor.setInlineRange({
            index: inlineRange.index + 1,
            length: 0,
          });
          return true;
        }

        std.command.chain().pipe(addParagraphCommand).run();
        return true;
      },
      Enter: ctx => {
        const { store } = std;
        const text = std.selection.find(TextSelection);
        if (!text) return;
        const model = store.getBlock(text.from.blockId)?.model;
        if (!model || !matchFlavours(model, ['affine:paragraph'])) return;
        const inlineEditor = getInlineEditorByModel(
          std.host,
          text.from.blockId
        );
        const range = inlineEditor?.getInlineRange();
        if (!range || !inlineEditor) return;

        const raw = ctx.get('keyboardState').raw;
        const isEnd = model.text.length === range.index;

        if (model.type === 'quote') {
          const textStr = model.text.toString();

          /**
           * If quote block ends with two blank lines, split the block
           * ---
           * before:
           * > \n
           * > \n|
           *
           * after:
           * > \n
           * |
           * ---
           */
          const endWithTwoBlankLines =
            textStr === '\n' || textStr.endsWith('\n');
          if (isEnd && endWithTwoBlankLines) {
            raw.preventDefault();
            store.captureSync();
            model.text.delete(range.index - 1, 1);
            std.command.chain().pipe(addParagraphCommand).run();
            return true;
          }
          return true;
        }

        raw.preventDefault();

        if (markdownInput(std, model.id)) {
          return true;
        }

        if (model.type.startsWith('h') && model.collapsed) {
          const parent = store.getParent(model);
          if (!parent) return true;
          const index = parent.children.indexOf(model);
          if (index === -1) return true;
          const collapsedSiblings = calculateCollapsedSiblings(model);

          const rightText = model.text.split(range.index);
          const newId = store.addBlock(
            model.flavour as BlockSuite.Flavour,
            { type: model.type, text: rightText },
            parent,
            index + collapsedSiblings.length + 1
          );

          focusTextModel(std, newId);

          return true;
        }

        if (isEnd) {
          std.command.chain().pipe(addParagraphCommand).run();
          return true;
        }

        std.command.chain().pipe(splitParagraphCommand).run();
        return true;
      },
      Delete: ctx => {
        const deleted = forwardDelete(std);
        if (!deleted) {
          return;
        }
        const event = ctx.get('keyboardState').raw;
        event.preventDefault();
        return true;
      },
      'Control-d': ctx => {
        if (!IS_MAC) return;
        const deleted = forwardDelete(std);
        if (!deleted) {
          return;
        }
        const event = ctx.get('keyboardState').raw;
        event.preventDefault();
        return true;
      },
      Space: ctx => {
        if (!markdownInput(std)) {
          return;
        }
        ctx.get('keyboardState').raw.preventDefault();
        return true;
      },
      'Shift-Space': ctx => {
        if (!markdownInput(std)) {
          return;
        }
        ctx.get('keyboardState').raw.preventDefault();
        return true;
      },
      Tab: ctx => {
        const [success] = std.command
          .chain()
          .pipe(canIndentParagraphCommand)
          .pipe(indentParagraphCommand)
          .run();
        if (!success) {
          return;
        }
        ctx.get('keyboardState').raw.preventDefault();
        return true;
      },
      'Shift-Tab': ctx => {
        const [success] = std.command
          .chain()
          .pipe(canDedentParagraphCommand)
          .pipe(dedentParagraphCommand)
          .run();
        if (!success) {
          return;
        }
        ctx.get('keyboardState').raw.preventDefault();
        return true;
      },
    };
  },
  {
    flavour: ParagraphBlockSchema.model.flavour,
  }
);

export const ParagraphTextKeymapExtension = KeymapExtension(textKeymap, {
  flavour: ParagraphBlockSchema.model.flavour,
});
