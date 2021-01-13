/**
 * Created by macdja38 on 2016-06-13.
 */

"use strict";

import utils from "../lib/utils";
import { ModuleConstructor, v2Module, v2ModuleConstructor } from "../types/moduleDefinition";
import { ModuleOptions } from "../types/lib";
import ConfigDB from "../lib/ConfigDB";
import Eris, { Guild, Member, Message } from "eris";
import Permissions from "../lib/Permissions";
import Command, { GuildCommand } from "../lib/Command/Command";
import { isGuildChannel } from "../types/utils";
import { CommandOptionParameter, Optionify, APPLICATION_COMMAND_TYPES } from "../lib/Command/CommandTypes";
import {
  PvPInteractiveCommand,
  PvPInteractiveCommandWithOpts,
  SlashCommand,
} from "../lib/Command/PvPCraftCommandHelper";

const role: v2ModuleConstructor = class role implements v2Module {
  private client: Eris.Client;
  private pvpClient: any;
  private config: ConfigDB;
  private perms: Permissions;
  private i10010n: any;
  private onJoin: (guild: Guild, member: Member) => void;

  /**
   * Instantiates the module
   * @constructor
   * @param {Object} e
   * @param {Eris} e.client Eris client
   * @param {Config} e.config File based config
   * @param {Config} e.auth File based config for keys and tokens and authorisation data
   * @param {ConfigDB} e.configDB database based config system, specifically for per guild settings
   * @param {R} e.r Rethinkdb r
   * @param {Permissions} e.perms Permissions Object
   * @param {Feeds} e.feeds Feeds Object
   * @param {MessageSender} e.messageSender Instantiated message sender
   * @param {SlowSender} e.slowSender Instantiated slow sender
   * @param {PvPClient} e.pvpClient PvPCraft client library instance
   * @param {Function} e.i10010n internationalization function
   */
  constructor(e: ModuleOptions) {
    this.client = e.client;
    this.pvpClient = e.pvpClient;
    this.config = e.configDB;
    this.perms = e.perms;
    this.i10010n = e.i10010n;

    this.onJoin = (guild, member) => {
      let roles = this.config.get("roles", false, { server: guild.id });
      if (roles && roles.hasOwnProperty("joinrole")) {
        utils.handleErisRejection(guild.addMemberRole(member.id, roles.joinrole, "Automated joinrole, use `/role remove joinrole` to disable"));
      }
    };

    this.possiblyDelete = this.possiblyDelete.bind(this);
  }

  onDisconnect() {
    this.client.removeListener("guildMemberAdd", this.onJoin);
  }

  onReady() {
    this.client.on("guildMemberAdd", this.onJoin);
  }

  /**
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent() {
    return {
      name: "Role commands",
      description: "Create joinable roles, or assign a role to users when they join.",
      key: "role",
      permNode: "role",
      commands: this.getCommands(),
    };
  }

  /**
   * Returns an array of commands that can be called by the command handler
   */
  getCommands(): SlashCommand[] {
    return [{
      name: "role",
      description: "Allows users to join / leave roles.",
      channels: "guild",
      subCommands: [
        (() => {
          const options: CommandOptionParameter[] = [];

          return {
            name: "list",
            description: "Lists the roles that can be joined. `/role join` to join.",
            permission: "role.list",
            channels: "guild" as const,
            options: options,
            execute: (command: PvPInteractiveCommandWithOpts<typeof options>) => {
              let roles = this.config.get("roles", {}, { server: command.guild.id });
              let coloredRolesList = "";
              for (let role in roles) {
                if (roles.hasOwnProperty(role) && role !== "joinrole") {
                  if (this.perms.check(command, `role.join.${role}`)) {
                    coloredRolesList += `+${role}\n`;
                  } else {
                    coloredRolesList += `-${role}\n`;
                  }
                }
              }
              if (coloredRolesList !== "") {
                return command.respond(command.translate`Roles you can join are highlighted in green. To join a role use \`/role join <role>\`\n\`\`\`diff\n${coloredRolesList}\`\`\``);
              } else {
                return command.respond(command.translate`No roles are setup to be join-able.`);
              }
            },
          }
        })(),
        (() => {
          const options = [{
            name: "name" as "name",
            description: "The role to join. `/role list` for a list.",
            type: APPLICATION_COMMAND_TYPES.STRING,
            required: true as true,
          }];

          return {
            name: "join",
            description: "Allows you to join a role.",
            permission: "role.join.use",
            channels: "guild" as "guild",
            options: options,
            execute: (command: PvPInteractiveCommandWithOpts<typeof options>) => {
              let roleToJoin = command.opts.name.toLowerCase();
              if (roleToJoin[0] === "+" || roleToJoin[0] === "-") {
                roleToJoin = roleToJoin.substring(1);
              }
              let roles = this.config.get("roles", {}, { server: command.guild.id });
              if (!roles[roleToJoin]) {
                return command.respond(command.translate`Invalid role name, for a list of roles use \`/role list\``)
              }
              if (!this.perms.check(command, `role.join.${roleToJoin}`)) {
                return command.respond(command.translate`You do not have perms to join this role for a list of roles use \`/role list\``)
              }
              let role = command.guild.roles.get(roles[roleToJoin]);
              if (role) {
                return command.guild.addMemberRole(command.member.id, role.id).then(() => {
                  return command.respond(command.translate`:thumbsup::skin-tone-2:`)
                }).catch((error: Error) => {
                  if (error) {
                    return command.respond(command.translate`Error ${error.toString()} promoting ${utils.removeBlocks(command.member.username)} try making sure the bot's highest role is above the role you want it to add and that the bot has Manage Permissions or Admin.`)
                  }
                });
              } else {
                return command.respond(command.translate`Role could not be found, have an administrator use \`/role add\` to update it.`);
              }
            },
          }
        })(),

        (() => {
          const options = [{
            name: "name" as "name",
            description: "The role to leave. /role list for a list.",
            type: APPLICATION_COMMAND_TYPES.STRING,
            required: true as true,
          }];

          return {
            name: "leave",
            description: "Allows you to leave a role.",
            permission: "role.leave.use",
            channels: "guild" as "guild",
            options: options,
            execute: (command: PvPInteractiveCommandWithOpts<typeof options>) => {
              let roleToLeave = command.opts.name.toLowerCase();
              if (roleToLeave[0] === "+" || roleToLeave[0] === "-") {
                roleToLeave = roleToLeave.substring(1);
              }
              let roles = this.config.get("roles", {}, { server: command.guild.id });
              if (!roles[roleToLeave]) {
                return command.respond(command.translate`Invalid role, for a list of roles use \`/role list\``)
              }
              if (!this.perms.check(command, `role.leave.${roleToLeave}`)) {
                return command.respond(command.translate`You do not have perms to leave this role for a list of roles use \`/role list\``)
              }
              let role = command.guild.roles.get(roles[roleToLeave]);
              if (role) {
                return command.guild.removeMemberRole(command.member.id, role.id).then(() => {
                  return command.respond(command.translate`:thumbsup::skin-tone-2:`)
                }).catch((error: Error) => {
                  return command.respond(command.translate`${error.toString()} demoting ${utils.removeBlocks(command.member.username)} try redefining your role and making sure the bot has enough permissions.`)
                })
              } else {
                return command.respond(command.translate`Role could not be found, have an administrator use \`/role add\` to update it.`);
              }
            },
          }
        })(),
        (() => {
          const options = [{
            name: "name",
            description: "The name users type to join this role",
            type: APPLICATION_COMMAND_TYPES.STRING,
            required: true,
          }, {
            name: "role",
            description: "The role to join",
            type: APPLICATION_COMMAND_TYPES.ROLE,
            required: true,
          }] as const;

          return {
            name: "add",
            description: "Admin Command. Adds a role to the list of joinable roles.",
            permission: "admin.role.add",
            channels: "guild" as const,
            options: options,
            execute: (command: PvPInteractiveCommandWithOpts<typeof options>) => {
              const roleName = command.opts.name.toLowerCase();
              let oldRoles = this.config.get("roles", {}, { server: command.guild.id });
              oldRoles[roleName] = command.opts.role.id;
              this.config.set("roles", oldRoles, { server: command.guild.id });
              return command.respond(command.translate`Role added to list of join-able roles`);
            },
          }
        })(),
        (() => {
          const options = [{
            name: "name" as "name",
            description: "The name users type to join this role.",
            type: APPLICATION_COMMAND_TYPES.STRING,
            required: true as true,
          }];

          return {
            name: "remove",
            description: "Admin Command. Removes a role to the list of joinable roles.",
            permission: "admin.role.remove",
            channels: "guild" as const,
            options: options,
            execute: (command: PvPInteractiveCommandWithOpts<typeof options>) => {
              let roleToJoin = command.opts.name.toLowerCase();
              let oldRoles = this.config.get("roles", {}, { server: command.guild.id });
              if (oldRoles.hasOwnProperty(roleToJoin)) {
                delete oldRoles[roleToJoin];
                this.config.set("roles", oldRoles, { server: command.guild.id, conflict: "replace" });
                return command.respond(command.translate`:thumbsup::skin-tone-2:`);
              } else {
                return command.respond(command.translate`Role could not be found, use \`/role list\` to see the current join-able roles.`);
              }
            },
          }
        })(),
      ],
    }];
  }

  possiblyDelete(command: PvPInteractiveCommand) {
    return (msg: Message | null) => {
      if (msg == null) return;
      if (!isGuildChannel(msg.channel)) return;
      let serverId = msg.channel.guild.id;
      let deleteAfter = this.pvpClient.get(`${serverId}.ranks.deleteAfter.value`, { fallBack: false });
      if (deleteAfter) {
        let deleteDelay = this.pvpClient.get(`${serverId}.ranks.deleteDelay.value`, { fallBack: 5 });
        setTimeout(() => {
          msg.delete();
          // command.delete();
        }, deleteDelay * 1000);
      }
    }
  }
}

module.exports = role;
