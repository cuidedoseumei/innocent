import { requireElement } from "./dom";

const MAX_LOG_MESSAGES = 50;

// DOM chat overlay, Tibia-flavored controls:
// - Enter (with the game focused) opens the input
// - Enter in the input sends and returns focus to the game
// - Esc closes the input without sending
export class ChatUi {
  private readonly root = requireElement<HTMLDivElement>("chat");
  private readonly log = requireElement<HTMLDivElement>("chat-log");
  private readonly input = requireElement<HTMLInputElement>("chat-input");

  constructor(opts: {
    onSend: (text: string) => void;
    onTypingChange: (typing: boolean) => void;
  }) {
    this.root.hidden = false;

    this.input.addEventListener("focus", () => opts.onTypingChange(true));
    this.input.addEventListener("blur", () => opts.onTypingChange(false));

    this.input.addEventListener("keydown", (event) => {
      // Keep game keys (WASD etc.) from reaching Phaser while typing.
      event.stopPropagation();
      if (event.key === "Enter") {
        const text = this.input.value.trim();
        this.input.value = "";
        this.input.blur();
        if (text) opts.onSend(text);
      } else if (event.key === "Escape") {
        this.input.blur();
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && document.activeElement !== this.input) {
        this.input.focus();
      }
    });
  }

  isTyping(): boolean {
    return document.activeElement === this.input;
  }

  addMessage(name: string, text: string): void {
    this.append(`${name}: ${text}`, false);
  }

  addSystemMessage(text: string): void {
    this.append(text, true);
  }

  private append(text: string, system: boolean): void {
    const line = document.createElement("div");
    line.textContent = text;
    if (system) line.className = "system";
    this.log.appendChild(line);
    while (this.log.childElementCount > MAX_LOG_MESSAGES) {
      this.log.firstElementChild?.remove();
    }
    this.log.scrollTop = this.log.scrollHeight;
  }
}
