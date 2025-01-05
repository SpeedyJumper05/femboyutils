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


import { sendMessage } from "@utils/discord";

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

interface RedditPost {
    author: string;
    title: string;
    url: string | string[];
    permalink: string;
    is_video: boolean;
    dimensions?: { width: number; height: number; };
}

function removeUnicode(text: string): string {
    return text.replace(/[^\x00-\x7F]/g, "");
}

async function getImageDimensions(url: string): Promise<{ width: number; height: number; }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = error => {
            resolve({ width: 0, height: 0 });
        };
        img.src = url;
    });
}

async function fetchReddit(sub: string, limit: number, sort: string, ephemeral: boolean, ctx: any) {

    let adjLimit = 0;

    const res = await fetch(`https://www.reddit.com/r/${sub}/${sort}.json?limit=${limit}&t=all`);
    const resp = await res.json();
    let list: RedditPost[] = [];
    const redass = /(?<=files\/)(.*?)(?=-poster)/;
    const imgFormat = /(?<=image\/)(.*)/;

    console.log(resp);

    if (resp.data.children.length > limit) {
        adjLimit = resp.data.children.length - limit;
    }

    try {
        for (let i = adjLimit; i < resp.data.children.length; i++) {
            try {
                const post = resp.data.children[i].data;

                const postDetails: RedditPost = {
                    author: post.author,
                    title: post.title,
                    url: "",
                    permalink: `https://reddit.com${post.permalink}`,
                    is_video: false
                };

                if (post.domain.includes("redgifs")) {
                    if (post.post_hint === "image") {
                        postDetails.url = post.url;
                        list.push(postDetails);
                    } else {
                        const match = post.media.oembed.thumbnail_url.match(redass);
                        postDetails.url = `https://files.redgifs.com/${match[0]}.mp4`;
                        postDetails.is_video = true;
                        list.push(postDetails);
                    }
                } else if (post.post_hint === "hosted:video") {
                    postDetails.url = `https://vxreddit.com${post.permalink}`;
                    postDetails.is_video = true;
                    list.push(postDetails);
                } else if (post.is_gallery) {
                    const gallery = post.gallery_data.items;
                    const urls: string[] = [];
                    for (let j = 0; j < gallery.length; j++) {
                        const mediaID = gallery[j].media_id;
                        if (post.media_metadata[mediaID].e === "Image") {
                            const format = post.media_metadata[mediaID].m.match(imgFormat);
                            urls.push(`https://i.redd.it/${mediaID}.${format[0]}`);
                            console.log(`i: ${i}, j: ${j}, mediaID: ${mediaID}.${format[0]}`);
                        } else if (post.media_metadata[mediaID].e === "AnimatedImage") {
                            urls.push(`https://i.redd.it/${mediaID}.gif`);
                            console.log(`i: ${i}, j: ${j}, mediaID: ${mediaID}.gif`);
                        } else {
                            console.error(`Unknown media type: ${post.media_metadata[mediaID]}`);
                            console.log(`i: ${i}, j: ${j}, mediaID: ${mediaID}`);
                        }
                    }
                    postDetails.url = urls;
                    list.push(postDetails);
                } else {
                    postDetails.url = post.url;
                    list.push(postDetails);
                }
            } catch (error) {
                console.error(`${error} \nat i: ${i}`);
            }
        }

        console.log(list);
        if (ephemeral) {
            list = list.filter(post => !post.is_video);
            console.log(list);
        }

        const r = rand(0, list.length - 1);
        const selectedPost = list[r];
        console.log("selected list object: " + r);

        let selectedUrl: string;
        if (Array.isArray(selectedPost.url)) {
            const rI = rand(0, selectedPost.url.length - 1);
            selectedUrl = selectedPost.url[rI];
        } else {
            selectedUrl = selectedPost.url;
        }
        // TODO: GalleryNum [2/5]
        if (!ephemeral) {
            console.log(selectedPost);
            sendMessage(ctx.channel.id, { content: `## ${selectedPost.title} [[link]](<${selectedPost.permalink}>)\n-# Author: [${selectedPost.author}](<https://www.reddit.com/user/${selectedPost.author}/>)\n${selectedUrl}` });
        } else {
            const embed: any = {
                type: "rich",
                author: selectedPost.author,
                title: selectedPost.title,
                url: selectedPost.permalink,
            };

            const dimensions = await getImageDimensions(selectedUrl);
            embed.image = { url: selectedUrl, width: dimensions.width, height: dimensions.height };

            console.log(embed);
            console.log(selectedPost);

            sendBotMessage(ctx.channel.id, {
                embeds: [embed],
                author: {
                    username: "Femboy dealer",
                    discriminator: "0"
                }
            });
        }
    } catch (error) {
        console.error(error);
    }
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
            inputType: ApplicationCommandInputType.BUILT_IN,
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
                            name: "new",
                            value: "new",
                            label: "new",
                        },
                        {
                            name: "hot",
                            value: "hot",
                            label: "hot",
                        },
                    ]
                },
                {
                    name: "limit",
                    description: "How many pics to choose from (defaults to 100)",
                    type: ApplicationCommandOptionType.NUMBER,
                },
                {
                    name: "ephemeral",
                    description: "Make the output ephemeral",
                    type: ApplicationCommandOptionType.BOOLEAN,
                }
            ],
            execute: async (opts, ctx) => {
                const subreddit = findOption(opts, "sub", "");
                const limit = findOption(opts, "limit", 100);
                const sort = findOption(opts, "sort", "hot");
                const ephemeral = findOption(opts, "ephemeral", false);
                fetchReddit(subreddit, limit, sort, ephemeral, ctx);
            },
        },
    ],

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
