"use strict";
const ical = require("ical-generator");
const { Octokit } = require("@octokit/rest");
const MarkdownIt = require("markdown-it");
const parseDuration = require("parse-duration");
const YAML = require("yaml");
const { keysToLowercase } = require("./helpers");
console.log('1');
const cal = ical({
    domain: 'bitcoindesigners.org',
    prodId: {
        company: 'Bitcoin Design Community',
        product: 'ical-generator'
    },
    name: 'Bitcoin Design Community Calls & Events',
    timezone: 'US/Pacific'
});
const octokit = new Octokit({
    //auth: process.env.GITHUB_AUTH,
    useragent: "github-events-calendar v0.1.0"
});
const md = new MarkdownIt();
console.log('2');
const Timezone = "GMT";
const repositories = [
    { org: "BitcoinDesign", repo: "Meta", label: "call" },
    { org: "BitcoinDesign", repo: "Guide", label: "call" },
    { org: "johnsBeharry", repo: "github-events-calendar", label: "call" },
];
async function getIssues(owner, repo, label) {
    let request = "GET /repos/:owner/:repo/issues";
    let issues = await octokit.request(request, { owner, repo, labels: label });
    return issues;
}
console.log('3');
function getEventObjFromIssue(issue) {
    let markdown = md.parse(issue.body, {});
    let meta = YAML.parse(markdown[0].content);
    meta = keysToLowercase(meta);
    // check duration
    meta.durationMs = meta.duration
        ? parseDuration(meta.duration)
        : parseDuration(meta.time);
    // Default duration to one hour
    const duration = meta.durationMs ? meta.durationMs : 3600000;
    let event = {
        title: issue.title,
        url: issue.url,
        date: meta.date,
        startTime: meta.time,
        duration: duration,
    };
    // Create an iCal entry if "utctime" is defined.
    if (meta.utctime) {
        const utcTime = meta.utctime;
        const startDate = new Date(utcTime);
        let endDate;
        if (duration) {
            endDate = new Date(startDate.getTime() + duration);
        }
        const eventObject = {
            start: startDate,
            end: endDate,
            summary: issue.title,
            url: issue.url
        };
        cal.createEvent(eventObject);
    }
    return event;
}
console.log('4');
getIssues("BitcoinDesign", "Meta", "call")
    .then((issues) => {
    let events = issues.data.map((issue) => getEventObjFromIssue(issue));
    cal.save("events.ical", () => { });
})
    .catch((err) => {
    console.error("error", err);
});