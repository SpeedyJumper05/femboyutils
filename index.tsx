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

    let adjLimit = 0;

    const res = await fetch(`https://www.reddit.com/r/${sub}/${sort}.json?limit=${limit}&t=all`);
    const resp = await res.json();
    const list: string[] = [];
    const redass = /(?<=files\/)(.*?)(?=-poster)/;
    const imgFormat = /(?<=image\/)(.*)/;

    console.log(resp);

    if (resp.data.children.length > limit) {
        adjLimit = resp.data.children.length - limit;
    }

    try {
        for (let i = adjLimit; i < resp.data.children.length; i++) {

            const post = resp.data.children[i].data;

            if (post.domain.includes("redgifs")) {
                const match = post.media.oembed.thumbnail_url.match(redass);
                list.push(`https://api.redgifs.com/v2/embed/discord?name=${match[0]}.mp4`);
            } else if (post.post_hint === "hosted:video") {
                list.push(`https://vxreddit.com${post.permalink}`);
            } else if (post.is_gallery) {
                const gallery = post.gallery_data.items;
                for (let j = 0; j < gallery.length; j++) {
                    const mediaID = gallery[j].media_id;
                    if (post.media_metadata[mediaID].e === "Image") {
                        const format = post.media_metadata[mediaID].m.match(imgFormat);
                        list.push(`https://i.redd.it/${mediaID}.${format[0]}`);
                    } else if (post.media_metadata[mediaID].e === "AnimatedImage") {
                        list.push(`https://i.redd.it/${mediaID}.gif`);
                    }
                }
            } else {
                list.push(post.url);
            }
        }
        const r = rand(0, list.length - 1);
        return list[r];
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
                const limit = findOption(opts, "limit", 100);
                const sort = findOption(opts, "sort", "new");
                return {
                    content: await fetchReddit(subreddit, limit, sort),
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
