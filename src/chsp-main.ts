import { Plugin } from "obsidian";

import setupCM5 from "./cm5";
import setupCM6 from "./cm6";
import { cut, load as loadJieba, loadDict } from "./jieba";
import { ChsPatchSettingTab, DEFAULT_SETTINGS } from "./settings";

const RANGE_LIMIT = 6;

const wait = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time));

export default class CMChsPatch extends Plugin {
  async onload() {
    this.addSettingTab(new ChsPatchSettingTab(this));
    // don't block obsidian loading
    await wait(0);
    await this.loadSettings();
    try {
      this.loadDict();
      console.info("Jieba loaded");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Jieba was loaded, could not load again"
      ) {
        console.info("Jieba was loaded before");
      } else throw error;
    }
    setupCM5(this);
    setupCM6(this);
    console.info("editor word splitting patched");
  }

  loadDict() {
    if (this.settings.dict) {
      loadDict(Buffer.from(this.settings.dict, "utf-8"));
    } else {
      loadJieba();
    }
  }

  settings = DEFAULT_SETTINGS;
  async loadSettings() {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  getChsSegFromRange(
    cursor: number,
    range: { from: number; to: number; text: string },
  ) {
    let { from, to, text } = range;
    if (!/[\u4e00-\u9fa5]/.test(text)) {
      return null;
    } else {
      // trim long text
      if (cursor - from > RANGE_LIMIT) {
        const newFrom = cursor - RANGE_LIMIT;
        text = text.slice(newFrom - from);
        from = newFrom;
      }
      if (to - cursor > RANGE_LIMIT) {
        const newTo = cursor + RANGE_LIMIT;
        text = text.slice(0, newTo - to);
        to = newTo;
      }
      const segResult = cut(text, this.settings.hmm);
      let chunkStart = 0,
        chunkEnd = 0;
      const relativePos = cursor - from;

      for (const seg of segResult) {
        chunkEnd = chunkStart + seg.length;
        if (relativePos >= chunkStart && relativePos < chunkEnd) {
          break;
        }
        chunkStart += seg.length;
      }
      to = chunkEnd + from;
      from += chunkStart;
      return { from, to };
    }
  }
}
