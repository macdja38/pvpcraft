/**
 * Purger class - Handles the actual message purging logic
 */

import Eris, { GetMessagesOptions } from "eris";
import * as Sentry from "@sentry/node";

export interface FetchMessagesOptions extends GetMessagesOptions {
  user?: Eris.User;
}

interface PurgerOptions {
  channel: Eris.TextChannel | Eris.ThreadChannel;
  updateStatus: (text: string) => void;
  fetchMessages: (
    channel: Eris.TextChannel | Eris.ThreadChannel,
    count: number,
    options: FetchMessagesOptions,
    callback: (messages: Eris.Message[] | false, error: string | false) => void
  ) => void;
  translate: (strings: TemplateStringsArray, ...values: any[]) => string;
  pinnedMessageIds?: Set<string>;
}

export class Purger {
  private channel: Eris.TextChannel | Eris.ThreadChannel;
  private updateStatus: (text: string) => void;
  private fetchMessages: PurgerOptions['fetchMessages'];
  private translate: PurgerOptions['translate'];
  private pinnedMessageIds: Set<string>;
  
  private purgeQueue: Eris.Message[] = [];
  private oldMessagePurgeQueue: Eris.Message[] = [];
  private totalFetched = 0;
  private totalPurged = 0;
  private doneFetching = false;
  private doneNew = false;
  private doneOld = false;
  private errorMessage: string | boolean = false;
  private oldMessagesFound = false;
  private purgeOldMessages = false;
  
  private purgerInterval?: NodeJS.Timeout;
  private purgerOldInterval?: NodeJS.Timeout;

  constructor(options: PurgerOptions) {
    this.channel = options.channel;
    this.updateStatus = options.updateStatus;
    this.fetchMessages = options.fetchMessages;
    this.translate = options.translate;
    this.pinnedMessageIds = options.pinnedMessageIds || new Set();
  }

  /**
   * Starts the purging process
   * @param length - Number of messages to purge
   * @param options - Options for fetching messages (before, after, user, etc.)
   */
  start(length: number, options: FetchMessagesOptions = {}, purgeOldMessages: boolean = false): void {
    this.purgeOldMessages = purgeOldMessages;
    // Start fetching messages
    this.fetchMessages(this.channel, length, options, (messages, error) => {
      if (error) {
        this.errorMessage = error;
        this.doneNew = true;
        this.doneOld = true;
        this.purgeQueue = [];
        this.oldMessagePurgeQueue = [];
        this.updateStatus(`\`\`\`xl\n${error}\`\`\``);
      } else {
        if (messages) {
          this.totalFetched += messages.length;
          this.purgeQueue = this.purgeQueue.concat(messages);
        } else {
          this.doneFetching = true;
        }
      }
    });

    // Start the purger interval
    this.purgerInterval = setInterval(() => {
      if (this.purgeQueue.length > 0 && !this.errorMessage) {
        const messagesToPurge = this.purgeQueue.splice(0, 100);
        const twoWeeksAgo = Date.now() - 60 * 60 * 24 * 7 * 2 * 1000;

        function isYoung(msg: Eris.Message<Eris.TextableChannel>): boolean {
          return msg.timestamp > twoWeeksAgo;
        }
        
        // Filter out old messages and pinned messages
        const youngMessagesToPurge = messagesToPurge.filter(msg => {
          const isPinned = this.pinnedMessageIds.has(msg.id);
          return isYoung(msg) && !isPinned;
        });

        if (purgeOldMessages) {
          this.oldMessagePurgeQueue.push(...messagesToPurge.filter(msg => {
            const isPinned = this.pinnedMessageIds.has(msg.id);
            return !isYoung(msg) && !isPinned;
          }))
        }
        
        if (youngMessagesToPurge.length < messagesToPurge.length) {
          this.oldMessagesFound = true;
        }
        
        this.channel.deleteMessages(youngMessagesToPurge.map(m => m.id)).then(() => {
          this.totalPurged += youngMessagesToPurge.length;
        }).catch((error) => {
          let responseCode;
          if (error.response) {
            responseCode = error.response.code;
          }
          if (responseCode === 50013) {
            this.errorMessage = error.response;
            this.doneNew = true;
            this.purgeQueue = [];
            this.updateStatus(this.translate`\`\`\`xl\ndiscord permission Manage Messages required to purge messages.\`\`\``);
          } else if (responseCode === 429) {
            // Rate limited, put messages back in queue
            this.purgeQueue = this.purgeQueue.concat(messagesToPurge);
          } else {
            Sentry.captureException(error);
            console.error(error);
            console.error(error.response);
          }
        });
      } else if (this.doneNew) {
        this.stopNew();
      }
    }, 1100);

    if (purgeOldMessages) {
      // Start the purger interval
      this.purgerOldInterval = setInterval(() => {
        if (!this.errorMessage) {
          let messageToPurge: Eris.Message<Eris.TextableChannel> | null = null;
          while (messageToPurge == null) {
            const candidateMessage = this.oldMessagePurgeQueue.shift();
            if (!candidateMessage) {
              // if we haven't finished the new queue, we might still have stuff added to the old queue
              if (this.doneNew) {
                this.doneOld = true;
                this.stopOld();
              }
              return;
            }
            if (this.pinnedMessageIds.has(candidateMessage.id)) {
              continue;
            }
            messageToPurge = candidateMessage
          }

          this.channel.deleteMessage(messageToPurge.id).then(() => {
            this.totalPurged += 1;
          }).catch((error) => {
            let responseCode;
            if (error.response) {
              responseCode = error.response.code;
            }
            if (responseCode === 50013) {
              this.errorMessage = error.response;
              this.doneOld = true;
              this.oldMessagePurgeQueue = [];
              this.updateStatus(this.translate`\`\`\`xl\ndiscord permission Manage Messages required to purge messages.\`\`\``);
            } else if (responseCode === 429) {
              // Rate limited, put messages back in queue
              this.oldMessagePurgeQueue.push(messageToPurge)
            } else {
              Sentry.captureException(error);
              console.error(error);
              console.error(error.response);
            }
          });
        } else {
          this.stopOld();
        }
      }, 1100);
    }
  }

  /**
   * Stops the purger interval
   */
  stopNew(): void {
    if (this.purgerInterval) {
      clearInterval(this.purgerInterval);
      this.purgerInterval = undefined;
    }
  }

  stopOld(): void {
    if (this.purgerOldInterval) {
      clearInterval(this.purgerOldInterval);
      this.purgerOldInterval = undefined;
    }
  }


  /**
   * Returns current statistics
   */
  getStats() {
    return {
      purgeOldMessages: this.purgeOldMessages,
      totalFetched: this.totalFetched,
      totalPurged: this.totalPurged,
      done: this.doneNew && this.doneOld,
      errorMessage: this.errorMessage,
      oldMessagesFound: this.oldMessagesFound,
      queueLength: this.purgeQueue.length,
    };
  }

  /**
   * Checks if purging is complete
   */
  isDone(): boolean {
    return this.doneNew && this.doneOld;
  }

  /**
   * Checks if there was an error
   */
  hasError(): boolean {
    return !!this.errorMessage;
  }
}

export default Purger;

