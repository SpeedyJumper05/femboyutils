/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    ApplicationCommandInputType,
    ApplicationCommandOptionType,
    CommandContext,
    findOption,
    RequiredMessageOption,
    sendBotMessage,
} from "@api/Commands";
import {
    addPreSendListener,
    MessageObject,
    removePreSendListener,
} from "@api/MessageEvents";
import { addButton } from "@api/MessagePopover";
import definePlugin from "@utils/types";
import { ChannelStore } from "@webpack/common";

import UwUifier from "./uwu";
import { UwUifyicon } from "./uwuifyicon";
const uwuifier = new UwUifier();


import Femboyfy from "./femboyfy";
const femboyfier = new Femboyfy();

let uwutoggle = false;
let femboytoggle = false;

async function handle_messages(message: MessageObject) {
    if (uwutoggle) {
        message.content = await uwuifier.uwuifySentence(message.content);
    }
    if (femboytoggle) {
        message.content = femboyfier.femboyfy(message.content);
    }
}

function toggleuwuify(ctx: CommandContext) {
    if (!uwutoggle) {
        uwutoggle = true;
        const content = "UwUifier is now enabled";
        sendBotMessage(ctx.channel.id, { content });
    } else {
        uwutoggle = false;
        const content = "UwUifier is now disabled";
        sendBotMessage(ctx.channel.id, { content });
    }
}

function togglefemboyfy(ctx: CommandContext) {
    if (!femboytoggle) {
        femboytoggle = true;
        const content = "Femboyfier is now enabled";
        sendBotMessage(ctx.channel.id, { content });
    } else {
        femboytoggle = false;
        const content = "Femboyfier is now disabled";
        sendBotMessage(ctx.channel.id, { content });
    }
}

function rand(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function fetchReddit(sub: string, limit: number, sort: string) {
    const res = await fetch(
        `https://www.reddit.com/r/${sub}/${sort}.json?limit=${limit}&t=all`
    );
    const resp = await res.json();
    try {
        const { children } = resp.data;
        let r = rand(0, children.length - 1);
        while (children[r].data.domain !== "i.redd.it") {
            console.log(children[r].data.url);
            r = rand(0, children.length - 1);
        }
        return children[r].data.url;
    } catch (err) {
        console.error(resp);
        console.error(err);
    }
    return "";
}

export default definePlugin({
    name: "Femboy utils",
    description: "Utilities for every femboy",
    authors: [
        {
            name: "Luca99",
            id: 1207731371884150804n,
        },
        {
            name: "Supytalp",
            id: 473921746144198677n
        },
        {
            name: "zero",
            id: 364088100458332170n
        }
    ],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "femboyfy",
            description: "Adds emoticons like :3 and UwU to end of message",
            options: [RequiredMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " :3 UwU",
            }),
        },
        {
            name: "arch",
            description: "Sends \"I use arch btw\"",
            execute: opts => ({
                content: "I use arch btw",
            }),
        },
        {
            name: "uwuify",
            description: "Uwuify message",
            options: [RequiredMessageOption],
            execute: opts => ({
                content: uwuifier.uwuifySentence(
                    findOption(opts, "message", "")
                ),
            }),
        },
        {
            name: "toggle uwuify",
            description: "Uwuifies all text you send",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (opts, ctx) => {
                toggleuwuify(ctx);
            },
        },
        {
            name: "toggle femboyfy",
            description: "Femboyfies all text you send",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (opts, ctx) => {
                togglefemboyfy(ctx);
            },
        },
        {
            name: "femboy pic",
            description: "Sends a femboy pic from Reddit",
            options: [
                {
                    name: "sub",
                    description: "Which subreddit to choose a pic from",
                    type: ApplicationCommandOptionType.STRING,
                    choices: [
                        {
                            name: "FemboyThighsClub",
                            value: "FemboyThighsClub",
                            label: "FemboyThighsClub",
                        },
                        {
                            name: "FemBoys",
                            value: "FemBoys",
                            label: "FemBoys",
                        },
                        {
                            name: "FemboyFeetPics",
                            value: "FemboyFeetPics",
                            label: "FemboyFeetPics",
                        },
                    ],
                    required: true,
                },
                {
                    name: "limit",
                    description: "How many pics to choose from (defaults to 100)",
                    type: ApplicationCommandOptionType.NUMBER,
                },
                {
                    name: "sort",
                    description: "Which Reddit sorting method to use (defaults to hot)",
                    type: ApplicationCommandOptionType.STRING,
                    choices: [
                        {
                            name: "top",
                            value: "top",
                            label: "top",
                        },
                        {
                            name: "hot",
                            value: "hot",
                            label: "hot",
                        },
                        {
                            name: "new",
                            value: "new",
                            label: "new",
                        },
                    ]
                },
            ],
            execute: async (opts, ctx) => {
                const subreddit = findOption(opts, "sub", "");
                const limit = findOption(opts, "limit", "100");
                const sort = findOption(opts, "sort", "hot");
                return {
                    content: await fetchReddit(subreddit, +limit, sort),
                };
            },
        },
    ],
    patches: [],

    start() {
        addButton("luca-uwuify", message => {
            if (!message.content) return null;

            return {
                label: "UwUify",
                icon: UwUifyicon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: async () => {
                    const content = await uwuifier.uwuifySentence(
                        message.content
                    );
                    sendBotMessage(message.channel_id, { content });
                },
            };
        });
        this.preSend = addPreSendListener(async (_, message) => {
            await handle_messages(message);
        });
    },
    stop() {
        this.preSend = removePreSendListener(async (_, message) => {
            await handle_messages(message);
        });
    },
});
