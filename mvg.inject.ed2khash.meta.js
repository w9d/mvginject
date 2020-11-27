// ==UserScript==
// @name Unofficial MVGroup HTML5 eD2k hasher injector
// @description Inject ed2khash interface over Java Applet.
// @namespace mvg.inject.ed2khash
// @version 20201126.0
// @match *://docuwiki.net/postbot/
// @match *://docuwiki.net/postbotbeta/
// @match *://forums.mvgroup.org/releasedb/
// @grant GM_getResourceText
// @homepageURL https://github.com/w9d/mvginject
// @updateURL https://raw.githubusercontent.com/w9d/mvginject/beta/mvg.inject.ed2khash.meta.js
// @downloadURL https://raw.githubusercontent.com/w9d/mvginject/beta/mvg.inject.ed2khash.user.js
// @resource worker https://raw.githubusercontent.com/w9d/ed2khash/c006035d2ad4c5742a09f115ad0c483114970251/build/md4-worker.min.js#sha256=19995c6e7e9a231e96326bf09db243784835d497f7bc25c313b50197dcbe6af6
// @require https://raw.githubusercontent.com/w9d/ed2khash/c006035d2ad4c5742a09f115ad0c483114970251/build/ed2khash.min.js#sha256=f6b7bc82d8088e58de8e3eaf262d23ff3b9d88c67bbd98629cd37ac15696be84
// @require https://raw.githubusercontent.com/w9d/FileSaver.js/5ed507ef8aa53d8ecfea96d96bc7214cd2476fd2/FileSaver.min.js#sha256=14f249b7c9c0fb12f8454ebf82cae203ca7cc4078b19ab68c938e576f40a19d1
// ==/UserScript==
